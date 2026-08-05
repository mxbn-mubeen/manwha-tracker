import { useEffect } from "react";

/**
 * Sets document.title for the current route.
 *
 * Why this is needed: this is a client-side-routed SPA (react-router-dom).
 * index.html's <title> is only read once on initial load — navigating
 * between routes never touches the DOM title on its own, so every page
 * (dashboard, library, every manhwa detail page, settings) shows up in
 * Chrome history as just "Manhwa Tracker" with no way to tell them apart.
 *
 * Call this once per page component with that page's title. Pass undefined
 * (e.g. while data is still loading) to skip updating and leave whatever
 * title is currently set.
 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (!title) return;
    document.title = `${title} · Manhwa Tracker`;
  }, [title]);
}
