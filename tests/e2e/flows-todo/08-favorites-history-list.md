# Favorites, History, Reading List — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Tick the `[x]` when a flow is covered by at least one test.

Source docs:
- [docs/ui-review/08-favorites-history-list.md](../../../docs/ui-review/08-favorites-history-list.md)
- [src/features/favorites/Favorites.svelte](../../../src/features/favorites/Favorites.svelte)
- [src/features/history/History.svelte](../../../src/features/history/History.svelte)
- [src/features/reading-list/ReadingList.svelte](../../../src/features/reading-list/ReadingList.svelte)

Existing specs touching these surfaces: none dedicated. [`series-detail.spec.ts`](../flows/series-detail.spec.ts) exercises the favorite toggle mutation; [`navigation.spec.ts`](../flows/navigation.spec.ts) walks the sidebar but never enters Favorites / History / Lists. No reading-list, history, or favorites-filter spec exists today.

## Fixture deps shared across this page

- The 6-series fixture catalog has no rows with `is_favorite = 1`, no rows in `recent_reads`, and `reading_status` is mostly NULL (only series 1002 has any engagement, per `bulk-edit.spec.ts`). Every flow below needs to seed its own state via Rust commands and roll it back in `afterEach`.
- Suggested seed helpers (Rust commands invoked through `invokeCmd`): `set_series_favorite`, `set_reading_status`, `record_recent_read` (or equivalent — confirm exact names in `src-tauri/src/lib.rs`). If no `record_recent_read` exists, propose adding a test-only command or insert via direct SQL via an existing util.

---

## Flow inventory — Favorites

### F01. Empty state when no favorites exist

- **Status:** [x] covered by favorites.spec.ts › "empty state when no favorites exist"
- **Goal:** confirm the page degrades gracefully when no series is favorited.
- **Preconditions:** pristine fixture (no `is_favorite = 1` rows).
- **Steps:**
  1. Navigate to Favorites via sidebar.
  2. Wait for `[data-test="nav-favorites"]` route to settle.
- **Expected:**
  - Hero `h1` reads `Favorites`, sub `Series you love`.
  - Counter chip shows `0`.
  - Filter bar (`.filters-bar`) is NOT rendered (gated on `series.length > 0`).
  - Centered empty state shows the heart icon, `favorites.empty` line, and `favorites.empty.hint` muted line.
- **Selectors / commands:** `[data-test="nav-favorites"]`, `.page .empty`, `.counter .count`.
- **Notes:** Propose adding `data-test="favorites-page"` and `data-test="favorites-empty"` for stability.

### F02. Counter shows total when no filter, ratio when filtered

- **Status:** [ ] TODO
- **Goal:** counter displays `N` when filters inactive and `M / N` once any filter narrows the grid.
- **Preconditions:** seed at least one manga and one novel favorite.
- **Steps:**
  1. `invokeCmd(app, 'set_series_favorite', { pid: 1001, value: true })`.
  2. `invokeCmd(app, 'set_series_favorite', { pid: <novel pid>, value: true })`.
  3. Open Favorites, assert counter `2`.
  4. Click the `manga` type chip.
- **Expected:**
  - After step 3, counter text == `2`.
  - After step 4, counter text == `1 / 2`.
- **Selectors / commands:** `.counter .count`, type chip buttons in `.type-row`.
- **Fixture deps:** none beyond mutation undo.
- **Notes:** clean up both favorites in `afterEach`.

### F03. Type chip filters favorites grid and persists to `aan.fav.type`

- **Status:** [x] covered by favorites.spec.ts › "type filter narrows favorites to manga" and favorites.spec.ts › "favorites type filter selection persists across reload"
- **Goal:** clicking a type chip narrows the grid; choice survives reload.
- **Preconditions:** favorites of at least two distinct types.
- **Steps:**
  1. Seed favorites: one manga (1001), one novel.
  2. Open Favorites, click `manga` chip.
  3. Assert grid contains only the manga card.
  4. Assert `localStorage.getItem('aan.fav.type') === 'manga'`.
  5. `app.reload()`, re-navigate to Favorites.
- **Expected:**
  - Grid still filtered to manga.
  - Chip with `manga` carries `.active`.
- **Selectors:** `.filters-bar .type-row button.filter.active`, `[data-test="cover-card"]` (verify exists in `CoverCard.svelte`).
- **Notes:** the page-reset fixture clears `aan.*` before each test so the persisted value must be probed in the same test.

### F04. Type chip hidden when count is zero, badge hidden when zero

- **Status:** [ ] TODO
- **Goal:** non-matching types don't appear; chip badge with count `0` is `visibility: hidden`.
- **Preconditions:** favorites of exactly one type (e.g. only manga).
- **Steps:**
  1. Seed a single manga favorite.
  2. Open Favorites.
- **Expected:**
  - `availableTypes` produces `all` + `manga` only; `comic`, `novel`, `original_novel` chips are not in the DOM.
  - The `all` chip badge shows `1`; no chip renders a visible `0`.
- **Selectors:** `.type-row .filter`, `.filter-count.zero` (CSS `visibility: hidden`).

### F05. Tag pill multi-select with OR combo (default)

- **Status:** [ ] TODO
- **Goal:** selecting multiple tag pills narrows by union by default.
- **Preconditions:** seed favorites with overlapping tag sets (e.g. series A tags `[action, fantasy]`, series B tags `[fantasy, romance]`).
- **Steps:**
  1. Seed favorites + tags (use `set_series_tags` or equivalent).
  2. Open Favorites.
  3. Click pill `action`, then pill `romance`.
- **Expected:**
  - Both pills carry `.selected`.
  - Grid includes both A and B (OR semantics).
  - `localStorage('aan.fav.tags')` contains JSON `["action","romance"]` (order tolerant).
  - `localStorage('aan.fav.tag_combo')` is `or` (default).
- **Selectors:** `.genre-pill.selected`.

### F06. OR ↔ AND combo control appears only with ≥ 2 tags selected

- **Status:** [ ] TODO
- **Goal:** segmented OR/AND control is gated on tag count and switches grid semantics.
- **Preconditions:** same fixture as F05.
- **Steps:**
  1. With one tag selected, assert `.combo-seg` is NOT in the DOM.
  2. Select a second tag; assert `.combo-seg` is in the DOM with `or` active.
  3. Click `AND`.
- **Expected:**
  - Grid now requires both tags (intersection).
  - `aan.fav.tag_combo === 'and'`.
- **Selectors:** `.combo-seg`, `.combo-btn.active`.
- **Notes:** tooltip on `.combo-seg` is `genre.combo.desc`; optional assertion via `aria` once added.

### F07. Clear-tags chip appears when ≥ 1 tag selected and resets selection

- **Status:** [ ] TODO
- **Goal:** dashed `clear` button only shows with selection and zeroes it.
- **Steps:**
  1. Seed a tagged favorite, select one pill.
  2. Assert `.clear-tags` visible.
  3. Click it.
- **Expected:**
  - `.clear-tags` disappears.
  - All pills deselected.
  - `aan.fav.tags === '[]'`.
- **Selectors:** `.clear-tags`.

### F08. Auto-prune: unfavoriting elsewhere drops stale filter

- **Status:** [x] partially covered by favorites.spec.ts › "unfavoriting via Series Detail removes from Favorites grid" (asserts grid drops the row via seriesMutationTick; stale-filter auto-reset to 'all' not yet exercised)
- **Goal:** when the last series carrying the selected type/tag is unfavorited (via Series Detail), `seriesMutationTick` triggers a refresh and the stale filter is dropped to `'all'` / empty.
- **Preconditions:** one manga favorite with tag `action`.
- **Steps:**
  1. Open Favorites, click `manga` chip, select `action` pill.
  2. Navigate to the series detail, click the heart to unfavorite.
  3. Navigate back to Favorites.
- **Expected:**
  - `typeFilter` falls back to `all`.
  - `selectedTags` is `[]`.
  - Empty-state renders the "no favorites" branch.
- **Selectors:** heart toggle on `SeriesDetail`, `.filter.active`.
- **Notes:** depends on `bumpSeriesMutation()` firing inside the favorite mutation — confirm the path is wired.

### F09. Filtered-empty inline hint

- **Status:** [ ] TODO
- **Goal:** when filters are active but no series matches, the inline `.filter-hint` shows above the body and the centered empty appears below.
- **Preconditions:** a single manga favorite tagged only `action`.
- **Steps:**
  1. Open Favorites.
  2. Select the `comic` chip (after seeding to ensure it exists) OR select a tag the manga doesn't carry — easiest: select two tags and toggle AND mode.
- **Expected:**
  - `.filter-hint` reads `favorites.filter_empty`.
  - Body renders `.empty` with heart icon and same key.
- **Selectors:** `.filter-hint`, `.empty`.

### F10. Skeleton count seeded from `aan.favorites.lastCount`

- **Status:** [ ] TODO
- **Goal:** `aan.favorites.lastCount` (capped 24) drives skeleton card count on next mount.
- **Steps:**
  1. Seed 3 favorites, open Favorites, wait for loaded grid (writes `lastCount=3`).
  2. `app.reload()`, navigate to Favorites without awaiting load.
- **Expected:**
  - 3 `.skeleton` cards render before the grid resolves.
- **Selectors:** `.skeleton`.
- **Notes:** racey — may need `page.evaluate` to read `localStorage` then a `waitFor` on the skeletons before grid hydrates. Worth a try; if too flaky, downgrade to verifying `localStorage` write only.

### F11. Card click into Favorites navigates to Series Detail

- **Status:** [ ] TODO
- **Goal:** clicking a favorite card opens its series.
- **Steps:**
  1. Seed favorite 1001.
  2. Open Favorites, click the card.
- **Expected:** routes to series detail for 1001 (hero text matches series name).
- **Selectors:** delegated to `CoverCard` — likely the card itself or `[data-test="series-card-1001"]` (verify in component).

---

## Flow inventory — History

### H01. Empty state when `recent_reads` is empty

- **Status:** [ ] TODO
- **Goal:** History page shows empty message when `listRecentReads(100)` returns `[]`.
- **Preconditions:** pristine fixture (no recent reads).
- **Steps:**
  1. Open History via sidebar.
- **Expected:**
  - Hero shows `history.title` + `history.sub`.
  - No `.tabs` row (gated on `items.length > 0`).
  - `.empty` shows `history.empty` + `history.empty.hint`.
- **Selectors:** `[data-test="nav-history"]`, `.page .empty`.
- **Notes:** propose `data-test="history-page"`.

### H02. Tabs render only for kinds with count > 0

- **Status:** [ ] TODO
- **Goal:** History tabs include `All` plus only the kinds present.
- **Preconditions:** seed two recent reads — one manga, one novel.
- **Steps:**
  1. Insert two `recent_reads` rows via Rust command (or SQL helper).
  2. Open History.
- **Expected:**
  - Tabs row contains `All`, `manga`, `novel` only. `comic` and `original_novel` tabs are absent.
  - `All` count badge `2`, others `1`.
- **Selectors:** `.tabs button`, `.tabs .ct`.
- **Fixture deps:** seed mechanism for `recent_reads` (may need a test-only Tauri command).

### H03. Tab click filters and persists to `aan.history.filter`

- **Status:** [ ] TODO
- **Goal:** click `manga` tab narrows list; choice survives reload.
- **Steps:**
  1. Seed manga + novel recent reads.
  2. Open History, click `manga` tab.
  3. Assert only manga row visible.
  4. Assert `localStorage('aan.history.filter') === 'manga'`.
  5. `app.reload()`, re-open History.
- **Expected:** manga tab still `.active`, list filtered.
- **Selectors:** `.tabs button.active`.

### H04. History row resumes into Reader when chapter exists

- **Status:** [ ] TODO
- **Goal:** clicking a row calls `listChapters`, `setReaderChapters`, and `openReader` for the matching chapter.
- **Preconditions:** seed a recent read for series 1001 chapter that still exists.
- **Steps:**
  1. Seed recent read for `pid=1001` and a real `chapter_id`.
  2. Open History, click the row.
- **Expected:** route lands on Reader for that chapter (assert via the existing `ReaderPage` page object).
- **Selectors:** `.row` button.
- **Notes:** lean on existing `ReaderPage` helpers from `pages/ReaderPage.ts`.

### H05. History row falls back to Series Detail when chapter is missing

- **Status:** [ ] TODO
- **Goal:** if `listChapters` fails or the chapter id no longer matches, `resume` falls back to `openSeries(pid)`.
- **Preconditions:** seed a recent read with a `chapter_id` that doesn't exist for the series.
- **Steps:**
  1. Seed recent read with bogus chapter id but real pid.
  2. Click the row.
- **Expected:** route lands on Series Detail page (not Reader).
- **Notes:** verify the fallback works without throwing; may require deleting a chapter after recording the read.

### H06. Row content: chip, title, progress bar, page counter, relative time

- **Status:** [ ] TODO
- **Goal:** the row renders type chip with localized label, series name, `Ch <no>` + optional title, 4px progress bar filled to `last_page_read/page_count`, and a relative timestamp.
- **Steps:**
  1. Seed a recent read with `last_page_read=10`, `page_count=20`, `read_at` 5 minutes ago.
- **Expected:**
  - `.chip` background matches `TYPE_CHIP[kind].bg`.
  - `.pct` text reads `10 / 20`.
  - `.fill` width style ≈ `50%`.
  - `.when` text matches `history.min_ago` template with `5`.
- **Selectors:** `.row .chip`, `.row .fill`, `.row .pct`, `.row .when`.

### H07. Cover fallback when `read_cover` resolves null

- **Status:** [ ] TODO
- **Goal:** missing cover shows gradient placeholder with first character of the series name.
- **Steps:**
  1. Seed recent read for a series whose cover was deleted from `data/covers/`.
- **Expected:** `.cover-fallback` element rendered with the series name's first letter.
- **Notes:** may not be worth the fixture surgery — keep as low priority.

### H08. Filtered-empty state when a tab matches nothing after filter

- **Status:** [ ] TODO
- **Goal:** the second `.empty` branch (no items match the active filter) renders when filter has hits initially but mutation strips them.
- **Notes:** since tabs are only shown when their count > 0, this branch is mostly defensive. Skip unless source doc explicitly wants it covered.

### H09. Skeleton count seeded from `aan.history.lastCount` (cap 20)

- **Status:** [ ] TODO
- **Goal:** History skeleton mirrors Favorites behavior with a 20 cap.
- **Steps:**
  1. Seed > 20 recent reads, load History, reload.
- **Expected:** at most 20 `.row-skel` shimmer rows render pre-hydration.
- **Selectors:** `.row-skel`.

---

## Flow inventory — Reading List

### L01. Sidebar Lists sub-entry sets `app.listStatus` and hero updates

- **Status:** [ ] TODO
- **Goal:** clicking each `Lists › <status>` sidebar entry navigates to Reading List with the right hero label + colored dot.
- **Preconditions:** none.
- **Steps:**
  1. Expand the sidebar `Lists` group.
  2. Click each status in turn: `reading`, `plan`, `on_hold`, `completed`, `dropped`.
- **Expected:**
  - Hero `h1` text equals the localized `statusInfo.labelKey`.
  - `.rs-dot` `background-color` equals `statusInfo.chipColor`.
- **Selectors:** sidebar list entries — propose `[data-test="nav-list-<id>"]` if not already present in `SidebarPage`.

### L02. Empty state per status

- **Status:** [ ] TODO
- **Goal:** when no series has `reading_status = <id>`, the empty branch renders `list.empty` + `list.empty.hint`.
- **Preconditions:** fixture (most statuses are empty).
- **Steps:** navigate to e.g. `plan`.
- **Expected:** `.empty` with two lines, no `.grid` or `.list-view`.

### L03. Hero counter and shimmer placeholder

- **Status:** [ ] TODO
- **Goal:** while loading, counter shows shimmer block (22×18); after load, count = filtered length.
- **Steps:**
  1. Seed 3 series with `reading_status = 'reading'`.
  2. Navigate to Reading list `reading` (cold).
- **Expected:**
  - During load, `.count-skel` shows a `Shimmer`.
  - After load, `.count` text reads `3`.
- **Selectors:** `.count-skel`, `.count`.

### L04. Search-within-list narrows by name/alias, case-insensitive

- **Status:** [ ] TODO
- **Goal:** typing in the search input filters by `name.includes(q)` OR `alias.includes(q)` (lowercased).
- **Steps:**
  1. Seed two series with status `reading`, distinct names.
  2. Open list, type 3+ chars from one name.
- **Expected:** only the matching card remains.
- **Selectors:** `.toolbar .search`.

### L05. View-mode segmented control: grid → compact → list

- **Status:** [ ] TODO
- **Goal:** clicking each view button swaps layout class and persists `aan.list.view`.
- **Steps:**
  1. Seed 2 reading-status series.
  2. Click `compact` button, then `list` button.
- **Expected:**
  - After `compact`: `.grid.mode-compact` is in the DOM.
  - After `list`: `.list-view` replaces `.grid`; `CoverRow` components render.
  - `localStorage('aan.list.view')` ends as `list`.
  - Active button carries `.active`.
- **Selectors:** `.view-seg .view-btn`, `.view-btn.active`, `.grid.mode-compact`, `.list-view`.

### L06. View change uses `document.startViewTransition` when available

- **Status:** [ ] TODO
- **Goal:** when the WebView2 supports `startViewTransition`, switching modes uses the API.
- **Steps:**
  1. Stub `document.startViewTransition` via `addInitScript` to a spy that wraps the original.
  2. Reload, open list, click compact.
- **Expected:** spy is called exactly once per click.
- **Notes:** optional / low priority — pure rendering polish. May skip if too WebView-version-specific.

### L07. View choice survives reload

- **Status:** [ ] TODO
- **Goal:** `aan.list.view` rehydrates on cold start.
- **Steps:**
  1. Click `list` view, assert.
  2. `app.reload()`, navigate to a Lists entry.
- **Expected:** `.list-view` is the rendered shape, `list` button `.active`.

### L08. Skeleton count seeded per status from `aan.list.lastCount.<status>`

- **Status:** [ ] TODO
- **Goal:** each status keeps its own skeleton-count under a distinct key, capped at 24.
- **Steps:**
  1. Seed 5 series `reading`, 2 series `plan`.
  2. Open `reading`, wait load — should write `aan.list.lastCount.reading=5`.
  3. Open `plan`, wait load — writes `aan.list.lastCount.plan=2`.
  4. Reload, briefly hit each.
- **Expected:** Skeletons match the previous count per status.
- **Selectors:** `.skeleton`.

### L09. Card click navigates to Series Detail

- **Status:** [ ] TODO
- **Goal:** clicking a card (or row in list mode) opens series detail.
- **Steps:**
  1. Seed `reading` series 1001, open list, click card.
- **Expected:** route on series detail.
- **Selectors:** `CoverCard` / `CoverRow` root — confirm `data-test`.

### L10. Search persists per-session only (not in localStorage)

- **Status:** [ ] TODO
- **Goal:** verify `query` is intentionally NOT persisted — confirms expected behavior, not a bug.
- **Steps:**
  1. Type a query, reload, navigate back.
- **Expected:** input is empty, no `aan.list.query` written.
- **Notes:** small but cheap sanity check.

---

## Coverage summary

- Favorites: 3 covered (F01, F03, F08 partial), 8 TODO (F02, F04–F07, F09–F11).
- History: 0 covered, 9 TODO (H01–H09).
- Reading List: 0 covered, 10 TODO (L01–L10).

Total: **30 flows, 0 covered, 30 TODO.**
