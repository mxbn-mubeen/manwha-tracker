/**
 * Headless-browser rendering for sites whose chapter list only exists after
 * client-side JS runs (comix.to, roliascan.com) — got-scraping's plain HTTP
 * fetch gets an empty shell for these, confirmed earlier: no amount of
 * header/TLS spoofing helps when the data genuinely isn't in the response.
 *
 * Uses `playwright-core` (not `playwright`) deliberately — `playwright-core`
 * has no postinstall browser download step. On Alpine (this project's
 * runtime image), Playwright's own downloaded Chromium doesn't reliably run
 * anyway (musl libc vs. the glibc build it ships), so we point this at
 * Alpine's own `chromium` package instead. See the Dockerfile changes that
 * install it. NOT verified end-to-end in this environment — no network path
 * here to actually launch a browser and confirm it renders correctly. Test
 * this for real before relying on it in production.
 */
import type { Browser } from "playwright-core";

const DEFAULT_TIMEOUT_MS = 30_000;

function resolveExecutablePath(): string | undefined {
  // Sandbox/CI note: no override needed if playwright-core's own resolution
  // finds a browser (e.g. if 'playwright install chromium' was run on a
  // non-Alpine dev machine). In the Docker image, this env var points at
  // Alpine's system chromium — see Dockerfile.
  return process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
}

let sharedBrowser: Browser | null = null;
let sharedBrowserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser?.isConnected()) return sharedBrowser;

  // If another call is already launching the browser, await that promise
  // so only one Chromium process is created and shared across callers.
  if (sharedBrowserPromise) return sharedBrowserPromise;

  // Create a promise that will launch the browser and store it so other
  // callers can await the same initialization instead of racing to launch.
  sharedBrowserPromise = (async () => {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      headless: true,
      executablePath: resolveExecutablePath(),
      args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox"],
    });

    sharedBrowser = browser;
    // Clear the promise marker now that launch completed successfully.
    sharedBrowserPromise = null;
    return browser;
  })();

  try {
    return await sharedBrowserPromise;
  } catch (err) {
    // Ensure we don't leave a rejected promise around for later callers.
    sharedBrowserPromise = null;
    throw err;
  }
}

import { looksLikeCloudflareChallenge, solveViaFlareSolverr, CloudflareBlockedError } from "./http";

/**
 * Render a page with a real browser and return the final HTML, after
 * client-side JS has had a chance to populate the DOM.
 *
 * Deliberately does NOT attempt to paginate through a site's full chapter
 * archive (e.g. comix.to shows 20 chapters/page across ~38 pages for a
 * long-running series) — this app only ever needs the most recent chapters
 * to detect "latest," which the first page of any reasonably-recent-sorted
 * list already contains. Clicking through dozens of pages per sync, per
 * source, would be slow and fragile for no benefit this app actually needs.
 */
export async function fetchRenderedHtml(
  url: string,
  opts: { waitForSelector?: string; timeoutMs?: number; skipFlareSolverr?: boolean } = {},
): Promise<string> {
  // First try to bypass Cloudflare and execute JS via FlareSolverr if configured.
  // FlareSolverr is faster, more robust against CF, and handles JS execution.
  if (!opts.skipFlareSolverr) {
    const fsResult = await solveViaFlareSolverr(url);
    if (fsResult.html) {
      return fsResult.html;
    }
    // If FlareSolverr returned a transient server error (502/503/429) after retry,
    // do NOT fall through to local Playwright — on Render there is no Chromium
    // installed, so Playwright will just hang for 60 s and waste the whole timeout slot.
    // Throw immediately so the sync loop records a fast failure instead.
    if ((fsResult as any).reason === 'transient') {
      throw new Error(`FlareSolverr temporarily unavailable (server overloaded) for ${url}`);
    }
  }
  
  // If FlareSolverr is not configured (or failed), fallback to local Playwright.
  const browser = await getBrowser();
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  try {
    await page.goto(url, {
      waitUntil: "networkidle", // wait until the SPA's own AJAX calls have settled
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }).catch((err) => {
      // Don't hard-fail immediately on timeout, we will check the DOM for Cloudflare markers
      console.warn(`[browser] Playwright navigation error for ${url}: ${err.message}`);
    });

    const html = await page.content();
    
    // Check if we hit a Cloudflare challenge that Playwright can't bypass
    if (looksLikeCloudflareChallenge(html)) {
      throw new CloudflareBlockedError(url, "unsolved");
    }

    if (opts.waitForSelector) {
      await page
        .waitForSelector(opts.waitForSelector, {
          timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })
        .catch(() => {
          // Don't hard-fail the whole fetch if the selector never shows up —
          // return whatever DOM state exists, same as a slow real page load.
        });
    }

    return await page.content();
  } finally {
    await page.close().catch(() => {});
  }
}

/** Call on graceful shutdown so the sync/cron process doesn't hang on an open browser handle. */
export async function closeBrowser(): Promise<void> {
  // If a launch is in progress, wait for it to finish (or fail) so we can
  // close the resulting browser handle reliably instead of leaving an
  // orphaned process running.
  if (sharedBrowserPromise) {
    try {
      await sharedBrowserPromise;
    } catch {
      // launch failed — nothing to close
      sharedBrowserPromise = null;
    }
  }

  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}
