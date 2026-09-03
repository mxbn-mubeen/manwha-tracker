import { importEsmPackage } from "./esm-interop";


const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

/**
 * Markers that reliably indicate a Cloudflare managed-challenge / "verify
 * you're human" interstitial rather than the real page. Checked against the
 * raw response body — a real Madara/WordPress page will never contain all of
 * these together, but a CF challenge page always does.
 */
const CLOUDFLARE_MARKERS = [/cf-chl-/i, /challenges\.cloudflare\.com/i, /Just a moment\.\.\./i];

export function looksLikeCloudflareChallenge(html: string): boolean {
  return CLOUDFLARE_MARKERS.filter((re) => re.test(html)).length >= 2;
}

/**
 * Thrown when a Cloudflare challenge page couldn't be bypassed — either
 * because FlareSolverr isn't configured, or because it is configured but
 * failed to solve the challenge. Kept distinct from a generic fetch failure
 * so callers (sync.service.ts) can surface a specific, actionable message
 * instead of a vague "found no chapters" toast.
 */
export class CloudflareBlockedError extends Error {
  readonly reason: "not-configured" | "unsolved";

  constructor(url: string, reason: "not-configured" | "unsolved") {
    const detail =
      reason === "not-configured"
        ? "FlareSolverr is not configured (set FLARESOLVERR_URL)"
        : "FlareSolverr could not solve the challenge";
    super(`Cloudflare blocked ${url}: ${detail}`);
    this.name = "CloudflareBlockedError";
    this.reason = reason;
  }
}

type FlareSolverrResult = { html: string; reason?: undefined } | { html: null; reason: "not-configured" | "unsolved" };

/**
 * Ask a running FlareSolverr instance (https://github.com/FlareSolverr/FlareSolverr)
 * to solve the Cloudflare challenge for `url` and return the real HTML.
 * FlareSolverr drives a real browser, waits out the challenge, and hands back
 * the resulting page — this is far cheaper than running our own browser pool
 * for every fetch, since it's only invoked when a challenge is detected.
 *
 * Configure via FLARESOLVERR_URL, e.g. http://localhost:8191/v1.
 */
export async function solveViaFlareSolverr(url: string): Promise<FlareSolverrResult> {
  let endpoint = process.env.FLARESOLVERR_URL;
  if (!endpoint) {
    console.warn(`[http] FlareSolverr fallback skipped for ${url} — FLARESOLVERR_URL is not set`);
    return { html: null, reason: "not-configured" };
  }

  // FlareSolverr's API is at /v1, so auto-append it if the user just provided the host (e.g. http://localhost:8191)
  // Otherwise, a POST to / returns a 405 Method Not Allowed.
  if (!endpoint.endsWith('/v1')) {
    endpoint = endpoint.replace(/\/$/, '') + '/v1';
  }

  const doRequest = async (): Promise<Response> =>
    fetch(endpoint!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 60_000,
      }),
      signal: AbortSignal.timeout(65_000),
    });

  try {
    let res = await doRequest();

    // Retry once on transient server-side errors (429, 5xx) after a brief wait.
    if (!res.ok && (res.status === 429 || res.status >= 500)) {
      console.warn(`[http] FlareSolverr ${res.status} for ${url} — retrying in 5s`);
      await new Promise(r => setTimeout(r, 5_000));
      res = await doRequest();
    }
    if (!res.ok) {
      // 429 = rate limited, 5xx = FlareSolverr temporarily overloaded.
      // These are transient — mark the reason distinctly so callers can retry.
      console.warn(`[http] FlareSolverr responded ${res.status} for ${url}`);
      const isTransient = res.status === 429 || res.status >= 500;
      return { html: null, reason: isTransient ? 'transient' as any : "unsolved" };
    }

    const data = await res.json() as any;
    if (data?.status !== "ok" || !data?.solution?.response) {
      console.warn(`[http] FlareSolverr couldn't solve challenge for ${url}: ${data?.message ?? "unknown error"}`);
      return { html: null, reason: "unsolved" };
    }

    return { html: data.solution.response as string };
  } catch (err) {
    console.warn(`[http] FlareSolverr request failed for ${url}:`, err instanceof Error ? err.message : err);
    return { html: null, reason: "unsolved" };
  }
}

/**
 * Fetch a page's HTML using got-scraping for basic TLS spoofing.
 * If the response turns out to be a Cloudflare challenge page rather than
 * the real content, transparently retries through FlareSolverr (if
 * configured). If that doesn't produce real HTML either, throws
 * CloudflareBlockedError with a specific reason rather than silently
 * returning the challenge body — a challenge page has no chapters, so
 * returning it just produces a misleading generic "found no chapters"
 * downstream instead of a diagnosable error.
 * Throws with a readable message on non-2xx responses.
 */
export async function fetchHtml(url: string): Promise<string> {
  // got-scraping is pure ESM with no CJS/"require" export condition, so it
  // can't be required() or even require.resolve()'d — see esm-interop.ts for
  // why and how this works around it.
  const { gotScraping } = await importEsmPackage<typeof import("got-scraping")>("got-scraping");

  let body: string;
  try {
    const response = await gotScraping({
      url,
      headers: DEFAULT_HEADERS,
      timeout: { request: 30_000 },
      retry: { limit: 2 },
      throwHttpErrors: false, // Don't throw on 503/403 so we can check for Cloudflare challenge pages
    });

    body = response.body;
    
    // If it's a bad status and NOT a Cloudflare challenge, throw normally
    if (response.statusCode >= 400 && !looksLikeCloudflareChallenge(body)) {
      throw new Error(`Failed to fetch ${url}: ${response.statusCode} ${response.statusMessage || ''}`);
    }
  } catch (err: any) {
    const message = err?.message || 'Unknown network error';
    throw new Error(`Failed to fetch ${url}: ${message}`);
  }

  if (looksLikeCloudflareChallenge(body)) {
    console.warn(`[http] Cloudflare challenge detected for ${url}, attempting FlareSolverr fallback`);
    const result = await solveViaFlareSolverr(url);
    if (result.html) return result.html;
    
    console.warn(`[http] FlareSolverr failed for ${url}, attempting Playwright fallback`);
    try {
      const { fetchRenderedHtml } = await import('./browser');
      const html = await fetchRenderedHtml(url, { skipFlareSolverr: true });
      return html;
    } catch (browserErr) {
      console.warn(`[http] Playwright fallback also failed for ${url}:`, browserErr);
      throw new CloudflareBlockedError(url, result.reason!);
    }
  }

  return body;
}