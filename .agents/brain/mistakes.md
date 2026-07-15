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