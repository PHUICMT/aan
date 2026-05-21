# Library — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Tick the `[x]` when a flow is covered by at least one test. Source: [docs/ui-review/03-library.md](../../../docs/ui-review/03-library.md) + [Library.svelte](../../../src/features/library/Library.svelte) + [LibraryFilters.svelte](../../../src/features/library/LibraryFilters.svelte) + [useLibraryFilters.svelte.ts](../../../src/features/library/composables/useLibraryFilters.svelte.ts) + [CoverCard.svelte](../../../src/features/library/CoverCard.svelte) + [CoverRow.svelte](../../../src/features/library/CoverRow.svelte) + [LibrarySearchResults.svelte](../../../src/features/library/LibrarySearchResults.svelte) + [LibraryEmptyState.svelte](../../../src/features/library/LibraryEmptyState.svelte) + [VirtualGrid.svelte](../../../src/features/library/VirtualGrid.svelte).

Fixture catalogue (recap from [tests/e2e/README.md](../README.md)): 6 series — 3 manga (1001, 1002, 3001), 1 comic (1003), 1 novel (2001), 1 original_novel (2002). Series 3001 is the "partial" one (downloads incomplete). Series 1002 has reading_status = 'plan'.

## Flow inventory

### Page mount & initial render

#### F01. Library mounts with fixture catalog of 6 series

- **Status:** [x] covered by [`smoke.spec.ts`](../flows/smoke.spec.ts) › `"library renders the fixture catalog of 6 series"`
- **Goal:** verify list_local_series renders the seeded set
- **Selectors / commands:** `[data-test="library"]`, `[data-test="cover-card"]`

#### F02. Counter pill shows unfiltered total (`series.length`, not filtered count)

- **Status:** [ ] TODO
- **Goal:** confirm the inconsistency noted in ui-review: counter never narrows even when filters reduce visible cards
- **Preconditions:** fixture catalog loaded
- **Steps:**
  1. Open Library, read `.counter .count` value (expect `6`).
  2. Apply type filter `novel` → only 1 card visible.
  3. Read `.counter .count` again.
- **Expected:** counter still reads `6` (matches design intent; assert intentional behaviour).
- **Selectors / commands:** `.hero .counter .count`, `[data-test="filter-type-novel"]`, `[data-test="cover-card"]`
- **Notes:** propose adding `data-test="library-counter"` — currently no stable hook.

#### F03. Counter shimmer while loading

- **Status:** [ ] TODO
- **Goal:** before `listLocalSeries` resolves, `.count-skel` is rendered instead of `.count`.
- **Steps:**
  1. Navigate to Library from cold mount.
  2. Race the assertion to catch the skeleton (likely needs throttling via a Rust delay or `route` intercept — flag this).
- **Notes:** may not be runnable reliably without a delay hook. Flag and skip if too racy.

#### F04. Empty grid when filters reduce result set to zero

- **Status:** [ ] TODO
- **Goal:** `LibraryEmptyState` `state='empty'` branch (the `library.empty` message + hint).
- **Steps:**
  1. Type a clearly-non-matching query (e.g. `zzznomatch`).
  2. Wait for debounce settle (>220ms).
- **Expected:** `[data-test="library-empty"]` visible with empty message and hint.
- **Selectors / commands:** `[data-test="library-search"]`, `[data-test="library-empty"]`

#### F05. Loading skeleton uses cached count when `aan.library.lastCount` is set

- **Status:** [ ] TODO
- **Goal:** after a successful load, `aan.library.lastCount` powers skeleton count on next mount (capped at 24).
- **Preconditions:** one prior successful mount (so localStorage has the key).
- **Steps:** trigger a cold reload, assert `.card-skel` count equals saved `aan.library.lastCount` (clamped).
- **Notes:** the `app` fixture clears `aan.*` before each test → must write the key inside the test via `app.evaluate(...)`. Flag pending.

#### F06. First-ever launch shows no skeleton

- **Status:** [ ] TODO
- **Goal:** inconsistency from ui-review: `skeletonCount === 0` → loading branch renders nothing.
- **Steps:** confirm `aan.library.lastCount` absent + no `.card-skel` rendered during initial fetch.

### Hero header actions

#### F07. Select toggle enters/exits select mode

- **Status:** [x] partially covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) › `"select two cards + bulk edit author + add tag"` (entry path only)
- **Goal:** clicking `library-select-toggle` flips `selectMode`, swaps icon (`check` ↔ `x`), swaps label, applies `.on` class.
- **Steps:**
  1. Click `[data-test="library-select-toggle"]`.
  2. Assert button has class `on` and contains "Exit" label (i18n).
  3. Click again.
  4. Assert class removed.
- **Selectors / commands:** `[data-test="library-select-toggle"]`

#### F08. Exiting select mode clears selectedPids

- **Status:** [ ] TODO
- **Goal:** turning select OFF resets the selection set (so the bulk-bar disappears clean next time).
- **Steps:**
  1. Enter select mode, click 2 cards.
  2. Toggle select mode off.
  3. Toggle select mode on again.
- **Expected:** `[data-test="bulk-count"]` reads `0`.

### Toolbar — type filters

#### F09. Type filter `manga` narrows to 3

- **Status:** [x] covered by [`library-filter.spec.ts`](../flows/library-filter.spec.ts) › `"type filter: manga narrows to 3"`

#### F10. Type filter `comic` narrows to 1

- **Status:** [x] covered by [`library-filter.spec.ts`](../flows/library-filter.spec.ts) › `"type filter: comic narrows to 1"`

#### F11. Type filter `novel` narrows to 1

- **Status:** [x] covered by [`library-filter.spec.ts`](../flows/library-filter.spec.ts) › `"type filter: novel narrows to 1"`

#### F12. Type filter `original_novel` narrows to 1

- **Status:** [ ] TODO
- **Steps:** click `[data-test="filter-type-original_novel"]`, assert 1 card, assert that card is pid 2002.

#### F13. Type filter `all` resets to 6

- **Status:** [ ] TODO (implicit in beforeEach of library-filter but not asserted as a test)
- **Steps:** apply `manga`, then `all`, assert 6 cards.

#### F14. Type filter count badges hide when count is 0

- **Status:** [ ] TODO
- **Goal:** the `.filter-count.zero { visibility: hidden }` rule keeps pill sized.
- **Steps:** pick a type with zero items in some setup (hard with current 6-series fixture — every type has ≥1). Either seed a fixture without one type, or assert all six badges render with numeric text.
- **Fixture deps:** could need a stripped-down fixture variant.

#### F15. Active type pill has accent fill + shadow

- **Status:** [ ] TODO
- **Goal:** visual class assertion (`active` class).
- **Steps:** click `[data-test="filter-type-manga"]`, assert it has class `active`; assert sibling pills do not.

#### F16. Type filter `typeFilter` is NOT persisted to localStorage

- **Status:** [ ] TODO
- **Goal:** documented in state table — typeFilter is in-memory only.
- **Steps:**
  1. Set type to `novel`.
  2. Reload page via `app.reload()`.
  3. Assert active type pill is `all` again.

### Toolbar — search input

#### F17. Search by series name (substring match)

- **Status:** [x] covered by [`library-filter.spec.ts`](../flows/library-filter.spec.ts) › `"search by name"`

#### F18. Search matches series `alias` field

- **Status:** [ ] TODO
- **Goal:** the `filtered` derivation also checks `s.alias.toLowerCase().includes(q)`.
- **Fixture deps:** seed at least one series with a non-empty alias different from its name.

#### F19. Search is case-insensitive

- **Status:** [ ] TODO
- **Steps:** search `alpha` AND `ALPHA` against series `Test Manga Alpha`; both narrow to the same single card.

#### F20. Search shorter than 2 chars does not hit chapter-search

- **Status:** [ ] TODO
- **Goal:** debounced `searchChapters` only fires when `q.length >= 2`.
- **Steps:**
  1. Type `a` (1 char).
  2. Wait > 250ms.
- **Expected:** no `LibrarySearchResults` panel visible (`chapterMatches` stays empty).

#### F21. Search clears in place — empty input restores full grid

- **Status:** [ ] TODO
- **Steps:** type `Alpha`, then clear (`.fill('')`); assert 6 cards reappear.

#### F22. Search query is NOT persisted across reload

- **Status:** [ ] TODO
- **Steps:** type query, reload, assert input is empty.

### Toolbar — sort popover

#### F23. Sort button opens the popover

- **Status:** [ ] TODO
- **Goal:** click sort button → `.sort-menu` mounts in body via portal; caret flips.
- **Selectors / commands:** propose `data-test="library-sort-trigger"` and `data-test="library-sort-menu"` — currently no hooks.

#### F24. Sort by `name` reorders the grid alphabetically

- **Status:** [ ] TODO
- **Steps:**
  1. Click sort trigger → pick `library.sort.name`.
  2. Read cards' first child via `[data-test="cover-card"] .title` in order.
- **Expected:** sorted ascending by series name.

#### F25. Sort by `progress` reorders by `local/total` desc

- **Status:** [ ] TODO
- **Steps:** pick progress; assert series with highest fraction is first.

#### F26. Sort by `last_read` orders by `last_read_at` desc

- **Status:** [ ] TODO
- **Steps:** seed `last_read_at` on at least one series via Rust command; pick last_read; assert that series surfaces first.
- **Fixture deps:** may need a Rust helper to stamp `last_read_at`.

#### F27. Sort by `updated` (default) orders by `last_updated` desc

- **Status:** [ ] TODO
- **Steps:** assert default sort key behaviour against fixture's `last_updated` values.

#### F28. Sort selection persists across reload (`aan.lib.sort`)

- **Status:** [ ] TODO
- **Steps:**
  1. Pick `name`.
  2. Reload.
  3. Assert sort label still reads "Name" AND `localStorage.getItem('aan.lib.sort') === 'name'`.

#### F29. Sort popover closes on Escape

- **Status:** [ ] TODO
- **Steps:** open popover; press `Escape`; assert `.sort-menu` unmounts.

#### F30. Sort popover closes on outside mousedown

- **Status:** [ ] TODO
- **Steps:** open popover; click on page background outside the menu; assert closed.

#### F31. Active sort item shows check icon and accent background

- **Status:** [ ] TODO

### Filter disclosure & view-mode segment ([LibraryFilters.svelte](../../../src/features/library/LibraryFilters.svelte))

#### F32. Filter disclosure toggle opens/closes the panel

- **Status:** [ ] TODO
- **Goal:** click `.filters-toggle` → `.filters-panel` slides open (260ms `cubicOut`).
- **Selectors / commands:** propose `data-test="library-filters-toggle"`.

#### F33. Filters panel state persists (`aan.lib.filtersOpen`)

- **Status:** [ ] TODO
- **Steps:** open panel; reload; assert panel still open AND `localStorage.getItem('aan.lib.filtersOpen') === '1'`.

#### F34. `activeFilterCount` badge — appears when ≥1 non-type, non-query filter is set

- **Status:** [ ] TODO
- **Steps:** set status=ongoing → assert badge with `1`. Add rs=reading → badge `2`. Add type=manga → still `2` (type does NOT count). Set query=foo → still `2` (query does NOT count).

#### F35. View segment: switch to grid

- **Status:** [ ] TODO
- **Steps:** click `[data-test="view-grid"]`; assert `.grid` lacks `.mode-compact`, no `.list-view`.

#### F36. View segment: switch to compact

- **Status:** [ ] TODO
- **Steps:** click `[data-test="view-compact"]`; assert `.grid.mode-compact` selector matches.

#### F37. View segment: switch to list

- **Status:** [ ] TODO
- **Steps:** click `[data-test="view-list"]`; assert `.list-view` is the container, `CoverRow` items render with `.row` class.

#### F38. View mode persists across reload (`aan.lib.view`)

- **Status:** [ ] TODO
- **Steps:** pick list; reload; assert `.list-view` still active AND `localStorage.getItem('aan.lib.view') === 'list'`.

#### F39. View mode swap is wrapped in `document.startViewTransition` when supported

- **Status:** [ ] TODO
- **Notes:** hard to assert directly. Skip / flag — visual-only.

### Status sub-filter

#### F40. Status `ongoing` narrows to series with `status===1`

- **Status:** [ ] TODO
- **Steps:** open filter panel; click `[data-test="filter-status-ongoing"]`; assert only ongoing series visible.

#### F41. Status `completed` narrows to `status===2`

- **Status:** [ ] TODO

#### F42. Status `unknown` narrows to `status===0||null`

- **Status:** [ ] TODO

#### F43. Status filter persists (`aan.lib.status`)

- **Status:** [ ] TODO

### Reading-status sub-filter

#### F44. RS `none` shows only series with `reading_status === null`

- **Status:** [ ] TODO

#### F45. RS `plan` shows series with reading_status === 'plan' (fixture 1002)

- **Status:** [ ] TODO

#### F46. RS `reading` / `completed` / `on_hold` / `dropped` each narrow correctly

- **Status:** [ ] TODO (one test per value, or table-driven)

#### F47. RS filter persists (`aan.lib.rs`)

- **Status:** [ ] TODO

### Download sub-filter

#### F48. DL `complete` narrows to series with `local >= total`

- **Status:** [ ] TODO

#### F49. DL `missing` shows the partial series 3001

- **Status:** [x] covered by [`library-filter.spec.ts`](../flows/library-filter.spec.ts) › `"dl filter: missing-only shows the partial series"`

#### F50. DL filter persists (`aan.lib.dl`)

- **Status:** [ ] TODO

#### F51. DL `failed` is not exposed in the UI but is accepted by the persistence reader

- **Status:** [ ] TODO
- **Goal:** inconsistency: `DlFilter` type allows `failed`, persistence accepts it, but `DL_FILTERS` array doesn't expose a pill.
- **Steps:** `app.evaluate(() => localStorage.setItem('aan.lib.dl', 'failed'))`, reload; observe app reads back `failed` (or document that no visible pill is highlighted).

### Genre filter (on `app` store, NOT in composable)

#### F52. Genre chip click adds to `app.selectedGenres`

- **Status:** [ ] TODO
- **Fixture deps:** at least one genre tag seeded on a fixture series.
- **Steps:** click a `.genre-name` button; assert pill gains `.selected` class; assert `app.selectedGenres` includes the genre via `app.evaluate`.

#### F53. Genre chip click again removes from selectedGenres (toggle)

- **Status:** [ ] TODO

#### F54. Genre `★` favorite toggle adds/removes from `app.favGenres`

- **Status:** [ ] TODO
- **Goal:** clicking the fav star adds the genre, and favorites sort first in `sortedGenres`.

#### F55. With ≥2 genres selected, OR/AND segment appears

- **Status:** [ ] TODO
- **Steps:** select 2 genres; assert `.combo-seg` visible.

#### F56. OR combo: series tagged with ANY selected genre survive

- **Status:** [ ] TODO

#### F57. AND combo: series must have ALL selected genres

- **Status:** [ ] TODO

#### F58. Clear genres link resets `app.selectedGenres`

- **Status:** [ ] TODO

#### F59. Show-all reveals genres beyond the 12 visible

- **Status:** [ ] TODO
- **Fixture deps:** ≥13 distinct genres in catalog.

### Collection chips row ([CollectionChips.svelte](../../../src/features/library/CollectionChips.svelte))

#### F60. Save view chip appears only when filters/sort are non-default

- **Status:** [ ] TODO
- **Steps:**
  1. Cold mount → assert `[data-test="collection-save"]` absent.
  2. Set type=novel → assert button now visible.

#### F61. Save collection — name + persistence

- **Status:** [x] covered by [`collections.spec.ts`](../flows/collections.spec.ts) › `"save current filters as a collection, chip appears and persists"`

#### F62. Click chip re-applies snapshot

- **Status:** [x] covered by [`collections.spec.ts`](../flows/collections.spec.ts) › `"clicking a chip re-applies the saved filter snapshot"`

#### F63. Active chip highlight matches live state

- **Status:** [ ] TODO
- **Goal:** `matchesSnapshot` order-independent compare → chip gains `.active` class when state matches.

#### F64. Delete chip drops it (no confirmation)

- **Status:** [x] covered by [`collections.spec.ts`](../flows/collections.spec.ts) › `"deleting a chip drops it from the row and the backend"`

#### F65. `cc-flash` animation pulses on newly-saved chip

- **Status:** [ ] TODO
- **Notes:** visual-only; skip or flag as low-value.

### Chapter search results panel ([LibrarySearchResults.svelte](../../../src/features/library/LibrarySearchResults.svelte))

#### F66. Typing ≥2 chars fires `searchChapters` after 220ms debounce

- **Status:** [ ] TODO
- **Steps:** type `ch`, wait 300ms, assert `LibrarySearchResults` mounts when any chapter title matches.

#### F67. Pending state shows shimmer rows when matches empty

- **Status:** [ ] TODO
- **Notes:** race-y; may need a stalled Rust call hook.

#### F68. Click match with `is_downloaded === 1` → opens Reader

- **Status:** [ ] TODO
- **Steps:** seed/use a downloaded chapter; type its title prefix; click `.ch-row`; assert reader is open.

#### F69. Click match with `is_downloaded === 0` → opens Series Detail instead

- **Status:** [ ] TODO

#### F70. `listChapters` error path falls through to `openSeries`

- **Status:** [ ] TODO
- **Notes:** hard to trigger without mocking; flag.

### Grid / Compact / List body

#### F71. Cards animate in with staggered `--delay`

- **Status:** [ ] TODO
- **Notes:** visual-only; skip if too racy.

#### F72. Click card in normal mode → opens Series Detail

- **Status:** [x] covered by [`navigation.spec.ts`](../flows/navigation.spec.ts) › `"home -> library -> series -> reader -> back chain"`

#### F73. Click card in select mode → toggles selection (no navigation)

- **Status:** [x] partially covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) — clicks two cards in select mode and asserts `bulk-count` reads 2 (implicit). Add explicit assertion that page is still `[data-test="library"]`.

#### F74. Card `data-selected` attribute toggles `'0'` / `'1'`

- **Status:** [ ] TODO
- **Steps:** select a card; assert `[data-test="cover-card"][data-pid="1001"][data-selected="1"]`.

#### F75. Cover image lazy-loads via IntersectionObserver

- **Status:** [ ] TODO
- **Notes:** check `<img src>` populates only after scroll into viewport; skip if too implementation-y.

#### F76. Card progress bar width equals `local/total`

- **Status:** [ ] TODO

#### F77. Card `+N` new badge appears when `chapter_count > local_chapter_count`

- **Status:** [ ] TODO
- **Steps:** fixture 3001 has missing chapters → assert `.new-badge` visible with `+N`.

#### F78. Card favorite heart badge shows when `is_favorite === 1`

- **Status:** [ ] TODO

#### F79. Card reading-status pill shows when `reading_status` set

- **Status:** [ ] TODO
- **Steps:** fixture 1002 has reading_status=plan → assert `.rs-badge` visible with right label.

#### F80. Card type chip shows `TYPE_CHIP[type]` label

- **Status:** [ ] TODO

#### F81. Right-click opens context menu

- **Status:** [ ] TODO
- **Steps:** `dispatchEvent('contextmenu', {clientX, clientY})` or Playwright `.click({ button: 'right' })`; assert `.ctx-menu` mounts in body.

#### F82. Touch long-press (500ms) opens context menu

- **Status:** [ ] TODO
- **Notes:** Playwright touch emulation needed. Flag.

#### F83. Context menu — toggle favorite via `setSeriesFavorite`

- **Status:** [ ] TODO
- **Steps:** right-click card; click first menu item; assert favorite badge appears AND `get_series.is_favorite === 1`. Cleanup via second click or `setSeriesFavorite(pid, false)`.

#### F84. Context menu — set reading status (each of 5 values)

- **Status:** [ ] TODO
- **Steps:** right-click; click each `READING_STATUSES` entry; assert `rs-badge` color/label updates AND `get_series.reading_status` matches.

#### F85. Context menu — Clear status appears only when reading_status set

- **Status:** [ ] TODO
- **Steps:** with rs=null, open menu → assert no "Clear" item. Set rs=plan, re-open → assert "Clear" item present; click → rs=null.

#### F86. Context menu — Escape closes it

- **Status:** [ ] TODO

#### F87. Context menu — outside click closes it

- **Status:** [ ] TODO

#### F88. Context menu — scroll closes it (stale viewport coords)

- **Status:** [ ] TODO

#### F89. Singleton — opening another card's menu closes the first

- **Status:** [ ] TODO
- **Steps:** open menu on card A; right-click card B; assert only B's menu is in DOM.

#### F90. Context menu nudged inside viewport with 8px padding

- **Status:** [ ] TODO
- **Steps:** right-click near right/bottom edges; read computed `left`/`top` styles; assert within viewport bounds.

#### F91. `actDismiss` is dead code (no UI hook)

- **Status:** [ ] TODO
- **Goal:** documented inconsistency. Assert no menu item exists that triggers `deleteOrphanSeries`. Code-level check, not a runtime click test.

### List view (CoverRow) specifics

#### F92. List view ignores `selectMode` — click navigates to series

- **Status:** [ ] TODO
- **Goal:** inconsistency: `CoverRow` has no select hookup.
- **Steps:** switch to list; enter select mode; click a row; assert SeriesDetail opens (not toggled).

#### F93. List view: `Select all visible` still works (composable-driven)

- **Status:** [ ] TODO
- **Steps:** list view + select mode; click `Select all visible`; assert `bulk-count` equals filtered length.

#### F94. List view: no context menu on rows

- **Status:** [ ] TODO
- **Steps:** right-click a row; assert `.ctx-menu` is NOT in DOM.

### VirtualGrid ([VirtualGrid.svelte](../../../src/features/library/VirtualGrid.svelte))

#### F95. Virtualization kicks in when filtered.length > 200

- **Status:** [ ] TODO
- **Fixture deps:** large synthetic fixture variant with 250+ series, or a Rust helper to seed many rows. Flag as significant fixture work.
- **Steps:** assert `.vgrid` is the container, not `.grid`.

#### F96. VirtualGrid renders only visible-row range + 4 buffer rows

- **Status:** [ ] TODO
- **Steps:** scroll the page; assert the number of `.vcell` DOM nodes is much smaller than the total item count.

#### F97. VirtualGrid recomputes col count on container resize

- **Status:** [ ] TODO
- **Notes:** combine with viewport resize; observe re-layout.

#### F98. VirtualGrid stable key prevents card remount during scroll

- **Status:** [ ] TODO
- **Notes:** hard to assert directly. Could check cover image stays cached / does not re-fetch.

### Bulk action bar (select mode only)

#### F99. Bulk bar appears only in select mode

- **Status:** [ ] TODO
- **Steps:** assert `[data-test="bulk-bar"]` absent; enter select mode; assert present.

#### F100. `bulk-count` reflects selectedPids.size

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) (asserts `bulk-count === '2'`)

#### F101. `Select all visible` selects every card in filtered set

- **Status:** [ ] TODO
- **Steps:** apply type=manga → 3 cards. Enter select mode. Click `Select all visible`. Assert `bulk-count === '3'`.

#### F102. `Select all visible` is disabled when already covers everything

- **Status:** [ ] TODO

#### F103. `Clear` resets selection

- **Status:** [ ] TODO
- **Steps:** select 2 cards; click Clear; assert `bulk-count === '0'`.

#### F104. `Clear` is disabled when no cards selected

- **Status:** [ ] TODO

#### F105. `Edit` CTA disabled at 0 selection

- **Status:** [ ] TODO

#### F106. `Edit` CTA opens BulkEditModal

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts)

### Mutation reactivity (`app.seriesMutationTick`)

#### F107. `bumpSeriesMutation()` re-fetches `listLocalSeries`

- **Status:** [ ] TODO
- **Steps:** open Library; call `set_series_favorite` via invokeCmd; the favorite badge appears without manual refresh.
- **Selectors / commands:** `invokeCmd(app, 'set_series_favorite', { pid, value: true })`

#### F108. After bulk apply, `reloadAfterBulk` closes modal + exits select mode + refetches

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) (asserts modal `toHaveCount(0)` after apply)

### Persistence (localStorage) cross-cut

#### F109. `aan.library.lastCount` is written after a successful load

- **Status:** [ ] TODO
- **Steps:** assert `localStorage.getItem('aan.library.lastCount')` equals series count.

#### F110. `aan.library.lastGenres` is written but never read

- **Status:** [ ] TODO
- **Goal:** documented inconsistency. Code-level: confirm no `getItem` call elsewhere.

### Keyboard

#### F111. Escape closes sort popover (Library-level handler)

- **Status:** [ ] TODO (overlaps F29)

#### F112. Escape closes the context menu

- **Status:** [ ] TODO (overlaps F86)

#### F113. No `/` focus-search shortcut registered

- **Status:** [ ] TODO
- **Steps:** press `/`; assert search input did not gain focus.

---

## Coverage summary

- Total flows: **113**
- Covered: **11** (F01, F09, F10, F11, F17, F49, F61, F62, F64, F72, F100, F106, F108 — with overlapping coverage on F07/F73)
- TODO: **~102**

Effective covered count (de-duplicated): 13 flows have an existing test reference; 100 flows remain.

## Selectors to add (missing test hooks)

- `data-test="library-counter"` on the counter pill (F02).
- `data-test="library-sort-trigger"` on the sort button (F23–F31).
- `data-test="library-sort-menu"` on the popped listbox (F23–F30).
- `data-test="sort-item-<key>"` on each option (F24–F27, F31).
- `data-test="library-filters-toggle"` on the disclosure button (F32–F34).
- `data-test="library-filter-count"` on the filters badge (F34).
- `data-test="genre-pill"` + `data-genre="<name>"` on each chip (F52–F58).
- `data-test="genre-combo-and"` / `genre-combo-or` on the segment (F55–F57).
- `data-test="card-ctx-menu"` on the portal-mounted menu (F81–F90).
- `data-test="card-ctx-fav"` / `card-ctx-rs-<id>` / `card-ctx-clear` on each menu row (F83–F85).
- `data-test="library-empty"` already present (used in F04).
- `data-test="library-search"`, `library-select-toggle`, `bulk-bar`, `bulk-count`, `bulk-edit-open` already present.
