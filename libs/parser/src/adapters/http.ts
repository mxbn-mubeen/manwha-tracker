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

function looksLikeCloudflareChallenge(html: string): boolean {
  return CLOUDFLARE_MARKERS.filter((re) => re.test(html)).length >= 2;
}

/**
 * Ask a running FlareSolverr instance (https://github.com/FlareSolverr/FlareSolverr)
 * to solve the Cloudflare challenge for `url` and return the real HTML.
 * FlareSolverr drives a real browser, waits out the challenge, and hands back
 * the resulting page — this is far cheaper than running our own browser pool
 * for every fetch, since it's only invoked when a challenge is detected.
 *
 * Configure via FLARESOLVERR_URL, e.g. http://localhost:8191/v1.
 * Returns null if FlareSolverr isn't configured or the request fails, so
 * callers can fall back to the original (challenge) body.
 */
async function solveViaFlareSolverr(url: string): Promise<string | null> {
  const endpoint = process.env.FLARESOLVERR_URL;
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 60_000,
      }),
      signal: AbortSignal.timeout(65_000),
    });

    if (!res.ok) {
      console.warn(`[http] FlareSolverr responded ${res.status} for ${url}`);
      return null;
    }

    const data = await res.json() as any;
    if (data?.status !== "ok" || !data?.solution?.response) {
      console.warn(`[http] FlareSolverr couldn't solve challenge for ${url}: ${data?.message ?? "unknown error"}`);
      return null;
    }

    return data.solution.response as string;
  } catch (err) {
    console.warn(`[http] FlareSolverr request failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch a page's HTML using got-scraping for basic TLS spoofing.
 * If the response turns out to be a Cloudflare challenge page rather than
 * the real content, transparently retries through FlareSolverr (if
 * configured) before giving up and returning the challenge body as-is —
 * callers (chapter-extract) will then correctly find 0 chapters, which
 * sync.service.ts now surfaces instead of silently swallowing.
 * Throws with a readable message on non-2xx responses.
 */
export async function fetchHtml(url: string): Promise<string> {
  // Use a Function trick to prevent TypeScript from transpiling the dynamic import to a require() call.
  // This is necessary because got-scraping is an pure ESM package, and the project is compiled to CommonJS.
  const dynamicImport = new Function('modulePath', 'return import(modulePath)');
  const { gotScraping } = await dynamicImport('got-scraping');

  let body: string;
  try {
    const response = await gotScraping({
      url,
      headers: DEFAULT_HEADERS,
      timeout: { request: 15_000 },
      retry: { limit: 1 },
    });

    body = response.body;
  } catch (err: any) {
    const status = err?.response?.statusCode || 'Unknown Status';
    const message = err?.response?.statusMessage || err.message;
    throw new Error(`Failed to fetch ${url}: ${status} ${message}`);
  }

  if (looksLikeCloudflareChallenge(body)) {
    console.warn(`[http] Cloudflare challenge detected for ${url}, attempting FlareSolverr fallback`);
    const solved = await solveViaFlareSolverr(url);
    if (solved) return solved;
  }

  return body;
}