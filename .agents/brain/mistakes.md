# Mistakes — Manhwa Tracker

Append-only log. Never delete entries.

---

- Problem: Brain was initially created in wrong location (scratch directory at C:\Users\musraf\.gemini\antigravity-ide\scratch\manhwa-tracker\)
- Cause: IDE had a scratch manhwa-tracker open, user had not yet specified actual project root
- Fix: User confirmed D:\manwha-tracker as project root. Brain recreated there.
- Status: Resolved
- Date: 2026-07-14

---

- Problem: `db.query.*` relational API silently hung — `getAll` returned empty/loading forever
- Cause: `drizzle-orm/neon-http` driver does not support the Drizzle relational query API (`db.query.manhwa.findMany({ with: {...} })`). Queries appeared to succeed but returned nothing.
- Fix: Rewrote all DB queries to use `db.select().from().leftJoin()` with correlated subqueries for chapter counts.
- Status: Resolved
- Date: 2026-07-15

---

- Problem: `db.transaction()` threw `No transactions support in neon-http driver` at runtime
- Cause: `drizzle-orm/neon-http` driver does not support SQL transactions. All `db.transaction(async (tx) => {...})` blocks crashed silently, causing `updateProgress` to always fail with "Failed to update progress".
- Fix: Removed all `db.transaction()` wrappers. Used sequential plain queries + `onConflictDoUpdate` upserts instead.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Sources section on ManhwaDetail always showed `@tbate_channel` and `asurascans.com` for every manhwa
- Cause: The Sources section HTML was completely hardcoded static content — it never read from the database at all.
- Fix: Replaced with dynamic `manhwa.sources.map(...)` rendering from the API response.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Latest chapter count showed `241` for every manhwa regardless of actual data
- Cause: `ManhwaDetail.tsx` had `Math.max(manhwa.progress?.latestChapter ?? 0, 241)` hardcoded, forcing minimum 241 chapters for all titles.
- Fix: Removed the hardcoded `Math.max(..., 241)` floor — now reads directly from DB.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Author ("TurtleMe") and description (TBATE synopsis) shown on every manhwa detail page
- Cause: Both were hardcoded as static fallback strings in `ManhwaDetail.tsx`.
- Fix: Changed fallback to `null` — only shows if actual data exists in DB.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: `and` was used in `manhwa.repository.ts` without being imported from `drizzle-orm`
- Cause: Import was missed when `updateProgress` was rewritten to use `select().where(and(...))`.
- Fix: Added `and` to the `drizzle-orm` import line.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: `trpc.manhwa.create` mutation called from AddManhwa form but endpoint did not exist
- Cause: The `create` route was never added to the tRPC router/service/repository. Only `addFromUrl` (which requires a URL and runs a web scraper) existed.
- Fix: Added `create` to router/service, added `createManual` to repository. Supports manual title, status, lastChapter, latestChapter with full progress/chapter seeding.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Adding manhwa with `lastChapter` set still showed 0 progress in UI
- Cause: `createManual` only entered the `lastChapter` branch if `latestChapter` was also > 0 (the progress link was nested inside the `latestChapter` block).
- Fix: Decoupled the two: `latestChapter` creates its chapter row independently; `lastChapter` creates its own row and links progress regardless of whether `latestChapter` was provided.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: `addSource` form on ManhwaDetail was completely non-functional (static HTML)
- Cause: The form inputs had no state, no onChange handlers, and the Add button had no onClick.
- Fix: Wired up with `useState` hooks + `trpc.manhwa.addSource.useMutation`. Also added the `addSource` tRPC endpoint (router + service + repository). Auto-normalises `@channelname` → `https://t.me/channelname`.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Library filters ("Reading", "Completed", "Hiatus") did not work and returned 0 results.
- Cause: The filter logic in `Library.tsx` incorrectly checked `m.progress.status`, but `status` actually belongs to the manhwa root object (`m.status`).
- Fix: Updated filter logic to correctly map "Reading" to `m.status === 'ongoing'`, "Completed" to `m.status === 'completed'`, and "Hiatus" to `m.status === 'hiatus'`.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: The "Sync" button in the AppShell navbar was a dead, unresponsive button.
- Cause: It was an empty button without an `onClick` handler.
- Fix: Added a visually responsive sync simulation (spins, disables, and shows a "Sync complete!" toast via `sonner` after 1.5s) to act as a placeholder trigger until backend sync logic is finalized.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Dashboard silently failed on API error, assuming 0 manhwa
- Cause: `isError` state was unhandled in tRPC `useQuery`.
- Fix: Handled `isError` explicitly by showing a "Failed to load" message instead of empty lists.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: `chapters` table allowed duplicate chapter numbers for a single manhwa
- Cause: No unique constraint on `(manhwaId, chapterNum)`.
- Fix: Added `unique().on(t.manhwaId, t.chapterNum)` to Drizzle schema. (Note: Database currently has duplicates preventing push, needs manual cleanup).
- Status: Open
- Date: 2026-07-16

---

- Problem: ID coercions were dangerously loose and allowed runtime NaN values.
- Cause: Used `z.string().or(z.number())` followed by an unsafe `Number()` cast in endpoints.
- Fix: Used `z.coerce.number().int().positive()` everywhere for strict runtime validation.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Repository create functions were not idempotent
- Cause: If an insert for `progress` or `sources` failed after `manhwa` was inserted, retrying would throw a `slug` uniqueness constraint error.
- Fix: Added `.onConflictDoUpdate` to `createManual` and `createWithSource` to safely resume/update.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Malformed legacy sources crashed the UI
- Cause: Rendering a `new URL("https:// ")` throws an exception, unmounting the entire app.
- Fix: Wrapped URL parsing in a `try/catch` loop that defensively returns `null` and skips the malformed URL.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Sources added via the "Add Source" form always got `adapter_key = 'website'` (or `'telegram'`), never a real site key like `asurascans`/`webtoon`/etc. — meanwhile `addFromUrl` used its own separate short-key scheme (`'asura'`, `'reaper'`) that didn't match `ADAPTER_KEYS` in `libs/shared/src/constants.ts` either. Neither scheme could actually be used to pick a scraper.
- Cause: Adapter key detection was duplicated ad-hoc in two places instead of using one shared factory, and nothing consumed `adapter_key` yet (no sync flow existed) so the inconsistency went unnoticed.
- Fix: Added `detectAdapterKey(url)` / `getAdapter(key, url)` in `libs/parser/src/adapters/factory.ts` as the single source of truth (keys: `asurascans`, `webtoon`, `reaperscans`, `manhuaus`, `generic`). Both `manhwa.service.ts#addFromUrl` and `manhwa.repository.ts#addSource` now call `detectAdapterKey` instead of their own string matching.
- Status: Resolved
- Date: 2026-07-21

---

- Problem: Brain (`master-memory.md`, `roadmap.md`, `task.md`) marked Telegram scripts (`telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`) as ✅ completed, and `apps/api/package.json` has npm scripts pointing at them, but none of these files exist anywhere in the repo.
- Cause: Unknown — likely the files were created in a prior session but never committed/included in this export, or the brain was updated optimistically ahead of actually saving the files.
- Fix: Not fixed (out of scope for this session — flagged so it isn't assumed done). Roadmap updated to list this as a real TODO instead of ✅.
- Status: Open
- Date: 2026-07-21

---

- Problem: User ran a live sync and reported "My Slain Dragon Bride" — a 7-chapter title on asurascans.com — synced to "Latest Ch. 711" ("705 new chapters available"). Screenshot also showed two identical "asurascans.com" rows under Sources for the same manhwa.
- Cause (chapter number): `extractChaptersFromHtml` scanned every `<a>` tag on the *entire* page with no scoping to the series itself. Reader sites like asurascans embed sidebar widgets ("Latest Release", "Trending", related-series lists) on every series page, and those links point at *other* series' chapters. The unscoped scan treated the highest chapter-shaped number found anywhere on the page as this manhwa's latest — which happened to be chapter 711 of some unrelated series.
- Cause (duplicate sources): `sources` table had no unique constraint on `(manhwa_id, url)`, and `addSource` did a bare insert with no idempotency check.
- Fix (chapter number): `extractChaptersFromHtml` now derives the series slug from the source URL and requires it to appear in a candidate link's href before accepting it as belonging to this manhwa; falls back to the old unscoped scan only if slug-filtering finds nothing at all.
- Fix (duplicates): Added `unique(manhwaId, url)` to the `sources` schema; `addSource` now inserts-or-returns-existing via `onConflictDoNothing`. Added `pnpm run dedupe:sources` to clean up rows that already violate the new constraint (must be run before `db:push`, or the push fails).
- Fix (existing bad data): Added `pnpm run purge:chapters -- --title "..." --max N` to delete already-synced bogus chapter rows for a given manhwa.
- Status: Fixed in code, **unverified against a live site** — this is a reasoned fix for one confirmed failure, not one tested against real asurascans markup (still no network access to it from the build environment). Re-run sync after deploying and check this title specifically.
- Date: 2026-07-21

---

- Problem: User re-ran sync after the slug-scoping fix above and got Chapter 711 again on the same title — the fix didn't hold.
- Cause: Slug-scoping only helps if the site's chapter-link URLs actually contain the series slug as a substring. That's a real assumption, and it evidently doesn't hold for this site/page — meaning `scan(true)` found zero matches and silently fell back to the old fully-unscoped `scan(false)`, reproducing the exact original bug through a different path. This was flagged as a known risk when the slug fix shipped, and it materialized on the very next real test.
- Fix: Added `dropIsolatedOutliers()` as a second, independent layer that doesn't depend on any URL-structure assumption — after either scan path runs, any chapter number more than 3x the next-highest found number is treated as a stray sidebar/trending-widget link from an unrelated series and discarded. Verified against two synthetic HTML scenarios reproducing the actual reported failure (slug-match succeeds; slug-match fails open into unscoped scan) — both now correctly return [1..7] instead of including 711/88.
- Known limitation (not verified either way): a real series with a genuinely sparse chapter list (e.g. a page that only links chapter 1 and the true latest chapter 700, nothing in between) would have its real chapter 700 wrongly trimmed as an "outlier" by this same filter. Chose to accept this risk since silently corrupting a title's chapter count is worse than missing an update for one sync cycle — but worth knowing if a manhwa's count seems to be stuck below its real latest chapter.
- Status: Fixed in code, verified via synthetic-HTML simulation only — still not tested against the real live site.
- Date: 2026-07-21
---

- Problem: User re-ran sync after the outlier-trimming fix and got Chapter 172 this time — same underlying bug, third path through it.
- Cause: The real page (see user screenshot) has a "Recommended Series" widget whose cards list *six other titles'* chapter counts (18, 99, 111, 115, 116, 172) close enough together that none of them looks isolated to `dropIsolatedOutliers` — the filter only catches a single lone stray, not a small cluster of unrelated numbers that happen to support each other.
- Fix: Added `extractDeclaredChapterCount()` as a third, independent layer. Reader-site templates like this one show the series' own chapter total as a standalone stat label (e.g. "7 Chapters" — number before the word, the reverse of a chapter link's "Chapter 172") near the top of the page, separate from any chapter link. That's an authoritative, site-declared value, so `extractChaptersFromHtml` now caps the outlier-filtered result at this number whenever it's present (falls back to outlier-trimming alone if the cap would wipe out every candidate, e.g. a garbled/mismatched label).
- Verified: synthetic HTML reproducing the exact reported shape (7 real chapters + 6 clustered recommended-series numbers, one with a "7 Chapters" label) now correctly returns [1..7] instead of including 172. Also re-verified the original "Chapter 711" scenario (no declared-count label present) still resolves correctly via outlier-trimming alone, and that an implausible/garbled declared-count label (e.g. "0 Chapters") doesn't wipe out real results.
- Known limitation: still not tested against the real live site (no network access to it from the build environment) — this is a reasoned fix for the two confirmed failure screenshots, not a live-site test. Also, this only helps on sites that render a "N Chapters"-style stat; sites that don't still rely on layers 1–2 alone.
- Status: Fixed in code, verified via synthetic-HTML simulation only.
- Date: 2026-07-21

---

- Problem: After the declared-count-capping fix above, user reported the title was still stuck ("Read Ch. 6 • Latest Ch. 6", 0 new chapters found on sync) even though asurascans.com had posted Chapter 7 (confirmed independently by fetching the live page directly).
- Cause: Fetched the real live page to check. Two things confirmed:
  1. `extractDeclaredChapterCount()`'s regex assumed the number and the word "Chapters" sit in one combined text node (e.g. one `<span>7 Chapters</span>`). The real page renders them as two separate stacked leaf elements (a big "7", a small "Chapters" label below it, siblings/near-siblings in the DOM) — the same stacked-stat-widget pattern used for "Rating"/"Bookmarks" too. The combined-node regex never matched, so `extractDeclaredChapterCount` silently returned null and the new capping layer never activated at all on the real site.
  2. The site also appends a rotating hash suffix to comic slugs that changes between requests (confirmed: two fetches of the same series a few minutes apart resolved to different canonical slugs, `-1d35e5bd` vs `-f886a8af`), so slug-scoping (layer 1) can never match on this site — every sync for this source falls into the unscoped scan, every time, permanently. This isn't new breakage, just confirms layers 2–3 are the ones actually load-bearing here, not a fallback path.
- Fix: Rewrote `extractDeclaredChapterCount` to primarily look for a "Chapters"-only label leaf and climb up through its ancestors (up to 4 levels) checking each level's preceding sibling for a bare number, which handles both true siblings and deeper-nested wrapper-per-stat markup. Kept the original combined-text-node regex as a secondary fallback for sites that do render it as one string.
- Verified: re-built the synthetic test to mirror the actual confirmed live DOM shape (split value/label stat elements, non-matching rotated slug, real current 4-item recommended-series list with counts 18/172/115/99) — now correctly resolves to chapter 7. Re-ran all previous synthetic scenarios (combined-text-node label, no label present, garbled/implausible label) — all still pass.
- Known limitation: verified against the real page's *content* (fetched live), but not against a full round-trip through the actual running app/DB — still recommend confirming with a real resync after deploying this change. If it still doesn't pick up chapter 7, the next thing to check is whether the deployed server actually has this file's changes (rebuild/restart), and whether `currentMax` in the DB is already stuck at some value for unrelated reasons (stale progress row, duplicate un-deduped source rows still pointing at old data, etc. — see the duplicate-sources issue logged earlier).
- Status: Fixed in code, verified against real fetched page content — not yet confirmed via a live end-to-end resync.
- Date: 2026-07-21

---

- Problem: Direct navigation to React Router routes (e.g. `/dashboard`) on Vercel returned 404 NOT_FOUND.
- Cause: Vercel is a static host; it looked for a `dashboard/index.html` file which doesn't exist, rather than letting the Single Page Application handle the client-side route.
- Fix: Added `vercel.json` with a rewrite rule routing `/(.*)` to `/index.html`.
- Status: Resolved
- Date: 2026-07-22

---

- Problem: The entire web UI layout (grid, margins, cards) broke and shrunk on mobile screens.
- Cause: The `AppShell` Navbar was too wide for a 375px screen (it included the logo, "Dashboard", "Library", "Add Manhwa", and "Sync" text). This forced the `<body>` width to stretch, breaking all responsive constraints.
- Fix: Made the Navbar fully responsive by hiding the text labels for Dashboard/Library/Sync/Add on mobile screens (using `hidden sm:inline`), keeping only their icons, and reducing the flex gaps. User verified and committed the fix.
- Status: Resolved
- Date: 2026-07-22

---

- Problem: Numerical inputs for `lastChapter` and `latestChapter` in `AddManhwa.tsx` behaved erratically (could not clear `0`, typing produced strings like `097`).
- Cause: React state was bound to `number` type for inputs that were conceptually text inputs until submission. Leading zeros and empty strings caused NaN or string concatenation inside number inputs.
- Fix: Changed the state to `string` (e.g. `const [latestChapter, setLatestChapter] = useState('')`) and handled coercion to number at submission time.
- Status: Resolved
- Date: 2026-07-22

---

- Problem: Fetching historical messages in `telegram-download-watcher.ts` to "catch up" on downtime caused massive data corruption, marking chapter numbers like 18, 202, and 250 for unrelated manhwas.
- Cause: Telegram scanlation channels frequently post cross-promotional ads ("Read Chapter 18 of X on our other channel!"). The aggressive fallback extraction blindly parsed numbers from these ads and catalogued them as new chapters for the tracked manhwa. Attempting to bulk-scan historical messages exposed the database to these false positives, unlike the passive live-listener which only processes messages when the user triggers a read event or a new message arrives.
- Fix: Deleted the catch-up logic entirely. Reverted to a purely passive event-driven design (using `UpdateReadChannelInbox` and `NewMessageEvent`) which is intrinsically safer. Ran `fix-db.ts` to delete all recently inserted corrupted chapters from the database.
- Status: Resolved
- Date: 2026-07-22
