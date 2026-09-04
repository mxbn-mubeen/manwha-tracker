# Mistakes â€“ Manhwa Tracker

Append-only log. Never delete entries.

---

- Problem: Source cards on the manhwa detail page showed wrong `latestChapterNum` for "secondary" sources. If thunderscans finds Ch.69 first and inserts the chapter row with `sourceId = thunderscans.id`, then arenascan syncs later and finds Ch.69 already in the DB (so nothing is inserted), arenascan's `latestChapterNum` would show as `null` (or stuck at Ch.1 if that was the last chapter it was first to insert). This caused the "Behind by 68 chapters" false-positive in the Sources list.
- Cause: `manhwa.read.repository.ts` computed `latestChapterNum` per source as `MAX(chapters.chapterNum) WHERE chapters.sourceId = source.id`. Because `sourceId` is only written on the chapter row by the *first* source to insert that chapter, any subsequent source that also sees that chapter gets no credit.
- Fix: Changed `latestChapterNum` in the `sourceMetadata` query to a correlated subquery `SELECT MAX(chapter_num) FROM chapters WHERE manhwa_id = ?` (global max for the manhwa). All sources that successfully sync and can see the latest chapter are now shown as up-to-date. `lastDiscoveredAt` remains per-source-attributed (honest: null means this source has never been the first to find a new chapter).
- Status: Resolved
- Date: 2026-08-31

---

- Problem: Brain was initially created in wrong location (scratch directory at C:\Users\musraf\.gemini\antigravity-ide\scratch\manhwa-tracker\)
- Cause: IDE had a scratch manhwa-tracker open, user had not yet specified actual project root
- Fix: User confirmed D:\manwha-tracker as project root. Brain recreated there.
- Status: Resolved
- Date: 2026-07-14

---

- Problem: `db.query.*` relational API silently hung Ã¢â‚¬â€� `getAll` returned empty/loading forever
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
- Cause: The Sources section HTML was completely hardcoded static content Ã¢â‚¬â€� it never read from the database at all.
- Fix: Replaced with dynamic `manhwa.sources.map(...)` rendering from the API response.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Latest chapter count showed `241` for every manhwa regardless of actual data
- Cause: `ManhwaDetail.tsx` had `Math.max(manhwa.progress?.latestChapter ?? 0, 241)` hardcoded, forcing minimum 241 chapters for all titles.
- Fix: Removed the hardcoded `Math.max(..., 241)` floor Ã¢â‚¬â€� now reads directly from DB.
- Status: Resolved
- Date: 2026-07-16

---

- Problem: Author ("TurtleMe") and description (TBATE synopsis) shown on every manhwa detail page
- Cause: Both were hardcoded as static fallback strings in `ManhwaDetail.tsx`.
- Fix: Changed fallback to `null` Ã¢â‚¬â€� only shows if actual data exists in DB.
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
- Fix: Wired up with `useState` hooks + `trpc.manhwa.addSource.useMutation`. Also added the `addSource` tRPC endpoint (router + service + repository). Auto-normalises `@channelname` Ã¢â€ â€™ `https://t.me/channelname`.
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

- Problem: Sources added via the "Add Source" form always got `adapter_key = 'website'` (or `'telegram'`), never a real site key like `asurascans`/`webtoon`/etc. Ã¢â‚¬â€ meanwhile `addFromUrl` used its own separate short-key scheme (`'asura'`, `'reaper'`) that didn't match `ADAPTER_KEYS` in `libs/shared/src/constants.ts` either. Neither scheme could actually be used to pick a scraper.
- Cause: Adapter key detection was duplicated ad-hoc in two places instead of using one shared factory, and nothing consumed `adapter_key` yet (no sync flow existed) so the inconsistency went unnoticed.
- Fix: Added `detectAdapterKey(url)` / `getAdapter(key, url)` in `libs/parser/src/adapters/factory.ts` as the single source of truth (keys: `asurascans`, `webtoon`, `reaperscans`, `manhuaus`, `generic`). Both `manhwa.service.ts#addFromUrl` and `manhwa.repository.ts#addSource` now call `detectAdapterKey` instead of their own string matching.
- Status: Resolved
- Date: 2026-07-21

---

- Problem: Brain (`master-memory.md`, `roadmap.md`, `task.md`) marked Telegram scripts (`telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`) as Ã¢Å“â€¦ completed, and `apps/api/package.json` has npm scripts pointing at them, but none of these files exist anywhere in the repo.
- Cause: Unknown Ã¢â‚¬â€� likely the files were created in a prior session but never committed/included in this export, or the brain was updated optimistically ahead of actually saving the files.
- Fix: Not fixed (out of scope for this session Ã¢â‚¬â€� flagged so it isn't assumed done). Roadmap updated to list this as a real TODO instead of Ã¢Å“â€¦.
- Status: Open
- Date: 2026-07-21

---

- Problem: User ran a live sync and reported "My Slain Dragon Bride" Ã¢â‚¬â€� a 7-chapter title on asurascans.com Ã¢â‚¬â€� synced to "Latest Ch. 711" ("705 new chapters available"). Screenshot also showed two identical "asurascans.com" rows under Sources for the same manhwa.
- Cause (chapter number): `extractChaptersFromHtml` scanned every `<a>` tag on the *entire* page with no scoping to the series itself. Reader sites like asurascans embed sidebar widgets ("Latest Release", "Trending", related-series lists) on every series page, and those links point at *other* series' chapters. The unscoped scan treated the highest chapter-shaped number found anywhere on the page as this manhwa's latest Ã¢â‚¬â€� which happened to be chapter 711 of some unrelated series.
- Cause (duplicate sources): `sources` table had no unique constraint on `(manhwa_id, url)`, and `addSource` did a bare insert with no idempotency check.
- Fix (chapter number): `extractChaptersFromHtml` now derives the series slug from the source URL and requires it to appear in a candidate link's href before accepting it as belonging to this manhwa; falls back to the old unscoped scan only if slug-filtering finds nothing at all.
- Fix (duplicates): Added `unique(manhwaId, url)` to the `sources` schema; `addSource` now inserts-or-returns-existing via `onConflictDoNothing`. Added `pnpm run dedupe:sources` to clean up rows that already violate the new constraint (must be run before `db:push`, or the push fails).
- Fix (existing bad data): Added `pnpm run purge:chapters -- --title "..." --max N` to delete already-synced bogus chapter rows for a given manhwa.
- Status: Fixed in code, **unverified against a live site** Ã¢â‚¬â€� this is a reasoned fix for one confirmed failure, not one tested against real asurascans markup (still no network access to it from the build environment). Re-run sync after deploying and check this title specifically.
- Date: 2026-07-21

---

- Problem: User re-ran sync after the slug-scoping fix above and got Chapter 711 again on the same title Ã¢â‚¬â€� the fix didn't hold.
- Cause: Slug-scoping only helps if the site's chapter-link URLs actually contain the series slug as a substring. That's a real assumption, and it evidently doesn't hold for this site/page Ã¢â‚¬â€� meaning `scan(true)` found zero matches and silently fell back to the old fully-unscoped `scan(false)`, reproducing the exact original bug through a different path. This was flagged as a known risk when the slug fix shipped, and it materialized on the very next real test.
- Fix: Added `dropIsolatedOutliers()` as a second, independent layer that doesn't depend on any URL-structure assumption Ã¢â‚¬â€� after either scan path runs, any chapter number more than 3x the next-highest found number is treated as a stray sidebar/trending-widget link from an unrelated series and discarded. Verified against two synthetic HTML scenarios reproducing the actual reported failure (slug-match succeeds; slug-match fails open into unscoped scan) Ã¢â‚¬â€� both now correctly return [1..7] instead of including 711/88.
- Known limitation (not verified either way): a real series with a genuinely sparse chapter list (e.g. a page that only links chapter 1 and the true latest chapter 700, nothing in between) would have its real chapter 700 wrongly trimmed as an "outlier" by this same filter. Chose to accept this risk since silently corrupting a title's chapter count is worse than missing an update for one sync cycle Ã¢â‚¬â€� but worth knowing if a manhwa's count seems to be stuck below its real latest chapter.
- Status: Fixed in code, verified via synthetic-HTML simulation only Ã¢â‚¬â€� still not tested against the real live site.
- Date: 2026-07-21
---

- Problem: User re-ran sync after the outlier-trimming fix and got Chapter 172 this time Ã¢â‚¬â€� same underlying bug, third path through it.
- Cause: The real page (see user screenshot) has a "Recommended Series" widget whose cards list *six other titles'* chapter counts (18, 99, 111, 115, 116, 172) close enough together that none of them looks isolated to `dropIsolatedOutliers` Ã¢â‚¬â€� the filter only catches a single lone stray, not a small cluster of unrelated numbers that happen to support each other.
- Fix: Added `extractDeclaredChapterCount()` as a third, independent layer. Reader-site templates like this one show the series' own chapter total as a standalone stat label (e.g. "7 Chapters" Ã¢â‚¬â€� number before the word, the reverse of a chapter link's "Chapter 172") near the top of the page, separate from any chapter link. That's an authoritative, site-declared value, so `extractChaptersFromHtml` now caps the outlier-filtered result at this number whenever it's present (falls back to outlier-trimming alone if the cap would wipe out every candidate, e.g. a garbled/mismatched label).
- Verified: synthetic HTML reproducing the exact reported shape (7 real chapters + 6 clustered recommended-series numbers, one with a "7 Chapters" label) now correctly returns [1..7] instead of including 172. Also re-verified the original "Chapter 711" scenario (no declared-count label present) still resolves correctly via outlier-trimming alone, and that an implausible/garbled declared-count label (e.g. "0 Chapters") doesn't wipe out real results.
- Known limitation: still not tested against the real live site (no network access to it from the build environment) Ã¢â‚¬â€� this is a reasoned fix for the two confirmed failure screenshots, not a live-site test. Also, this only helps on sites that render a "N Chapters"-style stat; sites that don't still rely on layers 1Ã¢â‚¬â€œ2 alone.
- Status: Fixed in code, verified via synthetic-HTML simulation only.
- Date: 2026-07-21

---

- Problem: After the declared-count-capping fix above, user reported the title was still stuck ("Read Ch. 6 Ã¢â‚¬Â¢ Latest Ch. 6", 0 new chapters found on sync) even though asurascans.com had posted Chapter 7 (confirmed independently by fetching the live page directly).
- Cause: Fetched the real live page to check. Two things confirmed:
  1. `extractDeclaredChapterCount()`'s regex assumed the number and the word "Chapters" sit in one combined text node (e.g. one `<span>7 Chapters</span>`). The real page renders them as two separate stacked leaf elements (a big "7", a small "Chapters" label below it, siblings/near-siblings in the DOM) Ã¢â‚¬â€� the same stacked-stat-widget pattern used for "Rating"/"Bookmarks" too. The combined-node regex never matched, so `extractDeclaredChapterCount` silently returned null and the new capping layer never activated at all on the real site.
  2. The site also appends a rotating hash suffix to comic slugs that changes between requests (confirmed: two fetches of the same series a few minutes apart resolved to different canonical slugs, `-1d35e5bd` vs `-f886a8af`), so slug-scoping (layer 1) can never match on this site Ã¢â‚¬â€� every sync for this source falls into the unscoped scan, every time, permanently. This isn't new breakage, just confirms layers 2Ã¢â‚¬â€œ3 are the ones actually load-bearing here, not a fallback path.
- Fix: Rewrote `extractDeclaredChapterCount` to primarily look for a "Chapters"-only label leaf and climb up through its ancestors (up to 4 levels) checking each level's preceding sibling for a bare number, which handles both true siblings and deeper-nested wrapper-per-stat markup. Kept the original combined-text-node regex as a secondary fallback for sites that do render it as one string.
- Verified: re-built the synthetic test to mirror the actual confirmed live DOM shape (split value/label stat elements, non-matching rotated slug, real current 4-item recommended-series list with counts 18/172/115/99) Ã¢â‚¬â€� now correctly resolves to chapter 7. Re-ran all previous synthetic scenarios (combined-text-node label, no label present, garbled/implausible label) Ã¢â‚¬â€� all still pass.
- Known limitation: verified against the real page's *content* (fetched live), but not against a full round-trip through the actual running app/DB Ã¢â‚¬â€� still recommend confirming with a real resync after deploying this change. If it still doesn't pick up chapter 7, the next thing to check is whether the deployed server actually has this file's changes (rebuild/restart), and whether `currentMax` in the DB is already stuck at some value for unrelated reasons (stale progress row, duplicate un-deduped source rows still pointing at old data, etc. Ã¢â‚¬â€� see the duplicate-sources issue logged earlier).
- Status: Fixed in code, verified against real fetched page content Ã¢â‚¬â€� not yet confirmed via a live end-to-end resync.
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

---

- Problem: `buildChannelMap` crashed with `Cannot read properties of undefined (reading 'id')` for all telegram sources, spamming WATCHER_ALERT for every channel.
- Cause: The fast path (cached `telegramEntityId`) was constructing an `InputPeerChannel`/`InputPeerChat`/`InputPeerUser` and then calling `client.getEntity(inputPeer)` Ã¢â‚¬â€� **just to get back `entity.id`**, which we already had stored as `source.telegramEntityId`. For private channels (`t.me/c/...`), GramJS's `getEntity(InputPeer)` returns `undefined` on a fresh session whose local entity cache is empty (it can't bootstrap private channel entities from nothing). First fix added a null guard (`if (!entity) continue`) which stopped the crash but still skipped every private-channel source. The real fix was recognising the `getEntity()` call in the fast path was entirely unnecessary.
- Fix: Removed the `InputPeer` construction and `getEntity()` call from the fast path entirely. `entityId` is now set directly to `source.telegramEntityId` Ã¢â‚¬â€� no API call. This is correct because the channelMap key only needs to match `message.chatId.toString()` in the event handlers, and `telegramEntityId` is already that numeric ID.
- Status: Resolved
- Date: 2026-07-23

---

- Problem: `telegram-bot-service.ts` crashed on first update with `Bot API error in sendMessage: Bad Request: can't parse entities: Can't find end tag corresponding to start tag "b"`.
- Cause: `sendMessage` applied `parse_mode: 'HTML'` globally to ALL outgoing messages. Any plain-text reply or message with dynamic content (channel titles, URLs) would be HTML-parsed by Telegram, and if the content contained `<` the parser would treat it as an HTML tag Ã¢â‚¬â€� potentially consuming the `</b>` of a surrounding tag and leaving `<b>` unclosed.
- Fix: Replaced the single `sendMessage` function with two explicit functions: `sendText` (no parse_mode Ã¢â‚¬â€� safe for any content) and `sendHtml` (explicit HTML mode Ã¢â‚¬â€� only called when the entire string is a controlled template). All bot replies now use `sendText`. Also replaced `splitLong` (raw byte split that could cut HTML tags) with `splitSafe` (splits at newline boundaries only).
- Status: Resolved
- Date: 2026-07-23

---

- Problem: Bot service stored entity ID `1001510817922` but watcher received `chatId=1510817922` -> `matched=false`, channel never tracked.
- Cause: Bot API encodes channel/supergroup IDs as `-100{mtproto_id}`. Code used `Math.abs(chat.id)` which gives `1001510817922` â€” the 100 prefix remains. GramJS/MTProto uses the raw ID without any prefix (`1510817922`). They never matched.
- Fix: For channel/supergroup type chats, use `Math.abs(chat.id) - 1_000_000_000_000` to recover the real MTProto ID. Also ran fix-bot-entity-ids.ts to patch the one existing bad DB record (source 399, manhwa 179).
- Status: Resolved
- Date: 2026-07-23

---

- Problem: `pnpm run db:push` failed to apply schema updates to Neon DB.
- Cause: `drizzle-kit push` is unreliable with the `neon-http` serverless driver and branching. Generating explicit migrations is required.
- Fix: Added `db:migrate` (`drizzle-kit migrate`) to package.json and updated documentation to use `db:generate` followed by `db:migrate`.
- Status: Resolved
- Date: 2026-07-23


---

- Problem: Telegram watcher failed to update read progress because GramJS threw "Could not find the input entity for PeerUser".
- Cause: The `handleReadUpdate` method passed a bare numeric `chatId` string to `client.getMessages`. Without a prior message caching the entity locally, GramJS falls back to assuming it's a User, which fails for Channels. The `accessHash` and `entityType` were stored in the DB but unused here.
- Fix: Created `buildInputPeer` in `handlers.ts` to explicitly construct an `InputPeerChannel` using the stored `accessHash` and `entityType` instead of guessing. Also added `big-integer` as an explicit dependency since it was required for this fix.
- Status: Resolved
- Date: 2026-07-23

---

- Problem: AUTH_KEY_DUPLICATED session death called process.exit(1) which killed the entire API server (Express on port 3001), not just the watcher. Frontend showed "Failed to fetch" on every request after any session error.
- Cause: handleSessionDeath in session.ts had a hardcoded process.exit(1). The watcher is embedded in the same Node process as the API server (server.ts starts both), so killing the process killed everything.
- Fix: handleSessionDeath now accepts an optional onShutdown callback. startWatcher passes a graceful shutdown function that only clears its own intervals and disconnects the GramJS client. process.exit is only called when running as a standalone script (require.main === module).
- Status: Resolved
- Date: 2026-07-24

---

- Problem: Telegram bot conflict messages showed "replace" and "cancel" as plain text. Users had to type them manually; they were not clickable in Telegram.
- Cause: The bot reply text used bullet points with plain words "replace" / "cancel" instead of slash-command format.
- Fix: Changed to "/replace" and "/cancel" in all bot reply strings. Telegram automatically renders slash commands as tappable blue links. Updated handleConflictReply to accept both "replace" and "/replace" (and "cancel" / "/cancel") to avoid breaking existing plain-text replies.
- Status: Resolved
- Date: 2026-07-24

---

- Problem: Server process crashed with Segfault (exit status 139) on Render Free Tier after several hours of idle time.
- Cause: Node.js global `fetch` (undici) has known segmentation fault bugs when keeping connections alive for long periods, which the Telegram Bot API `getUpdates` 30-second long-polling triggered. Additionally, Node V8's default memory limit was unaware of Render's 512MB container limit, leading to ungraceful OOM segfaults.
- Fix: Rewrote Bot API long-polling to use Node's native `https.request` instead of `fetch`. Appended `--max-old-space-size=256` to the `npm start` script. Disabled GramJS internal logging (`client.setLogLevel('none')`) to reduce idle memory bloat.
- Status: Resolved
- Date: 2026-07-27

---

- Problem: `cron:sync` and manual sync returned 403 Forbidden for sites like `comix.to` and `manhuaus.com` when run on Render or GitHub Actions.
- Cause: Cloudflare aggressively blocks the default Node `fetch` due to its obvious TLS fingerprint.
- Fix: Swapped `fetch` with `got-scraping` (using dynamic `import()` to bypass TS transpilation issues) which spoofs TLS signatures and browser headers to bypass basic Cloudflare checks.
- Status: Resolved
- Date: 2026-07-27

---

- Problem: Production deploy crashed with `Cannot find module '/app/apps/api/node_modules/@manhwa-tracker/parser/dist/index.ts'` (or `src/index.ts`). Node could not load the parser package at runtime.
- Cause: `libs/parser/package.json` had `"exports"."."."default": "./src/index.ts"` â€” a TypeScript source file path. In dev, `tsx` resolves `.ts` transparently. In production the API is compiled to JS and runs under plain Node, which resolves workspace package exports literally â€” there is no compiled `dist/index.ts`, only `dist/index.js`. Compare with `@manhwa-tracker/shared` which correctly had `"default": "./dist/index.js"`.
- Fix: Changed `parser/package.json` exports `"default"` from `"./src/index.ts"` to `"./dist/index.js"`. Dockerfile already builds parser before runner stage, so `dist/index.js` is always present at runtime.
- Status: Resolved
- Date: 2026-08-16

---

- Problem: Sources added before per-site adapter detection was fully wired up have `adapterKey = 'website'` (or sometimes `'generic'`) stored in the DB instead of the correct site key (e.g. `asurascans`, `thunderscans`). This caused filter chips and adapter badges on the /sources page to show a meaningless `website` label, and the filter could not group them by site correctly.
- Cause: `SourcesRepository.createWithSource()` accepted `adapterKey` as a caller-supplied string. In some early code paths the caller passed `'website'` as a literal instead of calling `detectAdapterKey(url)`. The inconsistency went unnoticed because nothing consumed `adapterKey` until the Unified Sources page was built.
- Fix: Added `manhwa.redetectAdapterKeys` tRPC mutation that loops over every website source, calls `detectAdapterKey(url)` from `@manhwa-tracker/parser`, and patches the DB row. Exposed as a "Fix Adapters" button (wand icon) on the /sources page. Also: `getAllSources` and `updateSourceUrl` endpoints added at the same time so the Sources page can read and edit sources.
- Status: Resolved in code â€” **must click "Fix Adapters" button once per environment** (production + local) to patch existing bad rows. No schema migration needed.
- Date: 2026-08-29

---

- Problem: Mobile view of /sources page was unusable â€” horizontal table overflow on small screens, text boxes overflowing, no way to tap-edit URLs.
- Cause: `SourcesPage.tsx` used a single `<table>` layout with no mobile breakpoint handling. On phones the table shrank columns to unreadable widths and the URL column broke layout.
- Fix: Added responsive dual-layout: desktop (`md:block`) uses the table; mobile (`md:hidden`) renders `<SourceCard>` components â€” full-width cards with title, adapter badge, truncated URL, and a full-width "Edit URL" button. Both `SourceRow` and `SourceCard` extracted to `features/sources/components/` (230-line split rule).
- Status: Resolved
- Date: 2026-08-29

---

- Problem: architecture.md stored project_root as `D:\manwha-tracker` (an old path) instead of `F:\manwha-tracker`.
- Cause: Brain was originally created using the wrong drive letter. master-memory.md was correct (F:\) but architecture.md still had D:\.
- Fix: Corrected project_root in architecture.md during 2026-08-31 brain review.
- Status: Resolved
- Date: 2026-08-31

---

- Problem: 7 source files exceeded the 230-line project rule (watcher/index.ts at 449 lines, bot/handlers.ts at 328, sync.service.ts at 315, EditManhwaModal.tsx at 338, TelegramSection.tsx at 336, SourcesList.tsx at 301, settings.router.ts at 265).
- Cause: Files grew organically over multiple sessions without extraction enforced in practice.
- Fix: Codebase-wide refactor on 2026-08-31 extracted 7 new files. All files now pass the 230-line check (`tsc --noEmit` passes on all three apps).
- Status: Resolved
- Date: 2026-08-31

---

- Problem: mgeko.cc source stuck showing `Ch. 1 — Behind by 149 chapters` in the UI even after extract-declared-count.ts fix.
- Cause: A previous sync ran before the declared-count regex fix was deployed. At that time `150-eng-li` was not parsed correctly (regex was end-anchored, rejecting trailing text), so declaredCount returned null. The DOM-order heuristic then picked a `Read Chapter 1` CTA button as the reference, trimmed the real 150-chapter list to just [1], and updateSourceSyncStatus persisted lastSyncedChapter=1 into the DB. After the fix deployed, the regression guard (maxChapter=1 < existingMax=146*0.5) fires and skips updateSourceSyncStatus via continue, so the stored value stays stuck at 1 and never self-corrects.
- Fix: Code is already correct after the regex fix. A manual sync self-corrects: mgeko now extracts 150 chapters correctly, the regression guard does NOT fire (150 is not < 73), and updateSourceSyncStatus(sourceId, 150) is called.
- Status: Open — trigger a manual sync to resolve
- Date: 2026-09-01

---

- Problem: "Unable to transform response from server" toast on every sync trigger after making sync.run async.
- Cause: The worker returned `null` as the tRPC result data (`res.json([{ result: { data: null } }])`). The tRPC + superjson transformer on the frontend expected a valid `SyncResult` object and crashed trying to deserialize null.
- Fix: Worker now returns a valid SyncResult skeleton with `startedAsync: true` immediately. Frontend checks `result.startedAsync` and shows an info toast instead of the error toast. Also added a `409` guard so double-triggering returns a proper error instead of silently spawning two syncs.
- Status: Resolved
- Date: 2026-09-04

---

- Problem: GitHub CI `@manhwa-tracker/parser#typecheck` failing with TS2307 "Cannot find module '@manhwa-tracker/shared'" and TS7006 implicit any errors. Passes locally.
- Cause: `libs/parser/tsconfig.json` had `moduleResolution: Node` which can't resolve workspace packages that only expose `src/index.ts` as their types (not a compiled dist). GitHub Actions environment does not have the local dist files built. The base tsconfig uses `moduleResolution: bundler` which handles this correctly.
- Fix: Changed `libs/parser/tsconfig.json` to `module: ESNext, moduleResolution: Bundler` to match the base config. Also added explicit `: string` type annotations to implicit-any parameters in `mgread.ts` that were newly surfaced after the stricter resolution.
- Status: Resolved
- Date: 2026-09-04
