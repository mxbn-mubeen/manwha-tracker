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
 * Fetch a page's HTML using got-scraping for basic TLS spoofing.
 * Throws with a readable message on non-2xx responses.
 */
export async function fetchHtml(url: string): Promise<string> {
  // Use a Function trick to prevent TypeScript from transpiling the dynamic import to a require() call.
  // This is necessary because got-scraping is an pure ESM package, and the project is compiled to CommonJS.
  const dynamicImport = new Function('modulePath', 'return import(modulePath)');
  const { gotScraping } = await dynamicImport('got-scraping');

  try {
    const response = await gotScraping({
      url,
      headers: DEFAULT_HEADERS,
      timeout: { request: 15_000 },
      retry: { limit: 1 },
    });
    
    return response.body;
  } catch (err: any) {
    const status = err?.response?.statusCode || 'Unknown Status';
    const message = err?.response?.statusMessage || err.message;
    throw new Error(`Failed to fetch ${url}: ${status} ${message}`);
  }
}

