const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function getProxiedImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("uploads.mangadex.org") || url.includes("mangadex.org")) {
    return `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
