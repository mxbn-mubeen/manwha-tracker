const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function getProxiedImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // MangaDex is blocked by some regional ISPs. Routing it through DuckDuckGo's
  // public image proxy bypasses the ISP block reliably.
  if (url.includes("uploads.mangadex.org") || url.includes("mangadex.org")) {
    return `https://proxy.duckduckgo.com/iu/?u=${encodeURIComponent(url)}`;
  }



  return url;
}
