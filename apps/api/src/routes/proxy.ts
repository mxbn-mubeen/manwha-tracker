import { Router } from "express";

export const proxyRouter: Router = Router();

proxyRouter.get("/", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).send("No url provided");
    return;
  }
  try {
    // Use a dynamic ESM import for `got-scraping`. Importing the bare
    // specifier lets Node resolve the package via its ESM `exports` map
    // (which `require.resolve` can fail on for ESM-only packages).
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const { gotScraping } = await dynamicImport('got-scraping');

    // Send the image's own origin as the referer, not a hardcoded one.
    // Most manhwa CDNs (Asura, Mgeko, etc.) hotlink-protect by checking that
    // the referer matches their own domain; sending a fixed
    // "https://mangadex.org" referer for every image — regardless of which
    // site it actually came from — makes unrelated hosts reject/reset the
    // request, which is the likely cause of the repeated ECONNRESET errors.
    let referer = 'https://mangadex.org';
    try {
      referer = new URL(url).origin;
    } catch {
      /* fall back to the default referer if url isn't a valid absolute URL */
    }

    const stream = gotScraping.stream({
      url,
      headers: { referer },
      retry: { limit: 2 },
    });
    
    stream.on('response', (response: any) => {
      res.set('Content-Type', response.headers['content-type']);
      res.set('Cache-Control', 'public, max-age=31536000');
    });
    
    stream.on('error', (err: Error & { code?: string }) => {
      // ECONNRESET / ECONNABORTED = browser closed the tab or navigated away
      // before the image finished loading — completely normal, not worth logging.
      const isClientDisconnect = err.code === 'ECONNRESET' || err.code === 'ECONNABORTED';
      if (!isClientDisconnect) {
        console.error("[server] proxy-image error:", err.message);
      }
      if (!res.headersSent) res.status(502).send("Proxy error");
    });

    stream.pipe(res);
  } catch (err) {
    console.error("[server] proxy-image exception:", err);
    res.status(500).send("Internal proxy error");
  }
});
