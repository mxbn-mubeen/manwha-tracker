import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { asuraScansAdapter } from "./sites/asurascans";
import { webtoonAdapter } from "./sites/webtoon";
import { reaperScansAdapter } from "./sites/reaperscans";
import { manhuausAdapter } from "./sites/manhuaus";
import { genericAdapter } from "./sites/generic";

/** Ordered by specificity — generic (matches everything) is never in this list. */
const SITE_ADAPTERS: WebsiteAdapter[] = [
  asuraScansAdapter,
  webtoonAdapter,
  reaperScansAdapter,
  manhuausAdapter,
];

const ADAPTERS_BY_KEY: Record<string, WebsiteAdapter> = Object.fromEntries(
  [...SITE_ADAPTERS, genericAdapter].map((adapter) => [adapter.key, adapter]),
);

/** Detect the adapter key for a URL by matching against known site patterns. Defaults to 'generic'. */
export function detectAdapterKey(url: string): string {
  const match = SITE_ADAPTERS.find((adapter) => adapter.urlPatterns.some((pattern) => pattern.test(url)));
  return match?.key ?? "generic";
}

/**
 * Resolve a WebsiteAdapter instance. Prefers the stored adapter_key (so a
 * manually-corrected key is respected); if it's missing or unrecognized,
 * falls back to detecting from the URL, then to the generic adapter.
 */
export function getAdapter(adapterKey: string | null | undefined, url: string): WebsiteAdapter {
  if (adapterKey && ADAPTERS_BY_KEY[adapterKey]) {
    return ADAPTERS_BY_KEY[adapterKey];
  }
  const detectedKey = detectAdapterKey(url);
  return ADAPTERS_BY_KEY[detectedKey] ?? genericAdapter;
}

export { asuraScansAdapter, webtoonAdapter, reaperScansAdapter, manhuausAdapter, genericAdapter };
