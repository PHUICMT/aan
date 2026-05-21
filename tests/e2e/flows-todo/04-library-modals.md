# Library modals & import flow — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Tick the `[x]` when a flow is covered by at least one test. Source: [docs/ui-review/04-library-modals.md](../../../docs/ui-review/04-library-modals.md) + [ImportButton.svelte](../../../src/features/library/ImportButton.svelte) + [import-flow.ts](../../../src/features/library/import-flow.ts) + [BulkEditModal.svelte](../../../src/features/library/BulkEditModal.svelte) + [CollectionChips.svelte](../../../src/features/library/CollectionChips.svelte).

All three surfaces share a pattern: `position: fixed` overlay + `place-items: center` + glass card + portal-mounted to escape transformed ancestors. Native `@tauri-apps/plugin-dialog` open() calls cannot be driven from Playwright — every import flow that needs them goes through the Rust commands directly (see [import.spec.ts](../flows/import.spec.ts) for the pattern).

Fixture catalogue recap: 6 series (3 manga, 1 comic, 1 novel, 1 original_novel). Import samples live at `tests/fixtures/build/import-samples/` (`sample.pdf`, `sample.cbz`, `novel.txt`).

## Flow inventory

### Import trigger button

#### F01. Import button opens the dropdown menu

- **Status:** [ ] TODO
- **Goal:** click `library-import` → `.menu` mounts with two items.
- **Steps:**
  1. Open Library.
  2. Click `[data-test="library-import"]`.
- **Expected:** `.menu` visible; both `menu_files` and `menu_folder` items rendered.
- **Selectors / commands:** `[data-test="library-import"]`, propose `data-test="import-menu"`, `data-test="import-menu-files"`, `data-test="import-menu-folder"`.

#### F02. Outside mousedown closes the menu

- **Status:** [ ] TODO
- **Steps:** open menu; click on page background; assert `.menu` unmounts.

#### F03. Clicking a menu item closes it immediately

- **Status:** [ ] TODO
- **Notes:** the click also fires `pickFiles`/`pickFolder` → native dialog. The dialog cannot be observed; just assert menu closed.

#### F04. `aria-expanded` flips with menu state

- **Status:** [ ] TODO

#### F05. Caret rotates 180° when open (`flip` class)

- **Status:** [ ] TODO
- **Notes:** visual; assert class only.

#### F06. Button disabled while busy

- **Status:** [ ] TODO
- **Notes:** triggered while a real import is mid-flight. Hard to observe without a slow Rust call. Flag.

#### F07. Tooltip from `library.import.tooltip` key

- **Status:** [ ] TODO
- **Steps:** hover; observe tooltip element. Visual / overlap with tooltip plumbing.

#### F08. `prefers-reduced-motion` disables sheen + busy-ring spin

- **Status:** [ ] TODO
- **Notes:** emulate via Playwright `emulateMedia({ reducedMotion: 'reduce' })`.

### Import — file pipeline ([import-flow.ts](../../../src/features/library/import-flow.ts))

These bypass the native dialog by invoking the Rust commands directly. Pattern lifted from [`import.spec.ts`](../flows/import.spec.ts). Track created pids and clean up in `afterEach`.

#### F09. PDF import adds a card visible in Library

- **Status:** [x] covered by [`import.spec.ts`](../flows/import.spec.ts) › `"PDF import adds a card visible in Library"`
- **Selectors / commands:** `invokeCmd(app, 'import_pdf', { args: { src_path, series_name, kind: 'manga', chapter_no, chapter_title, page_count, cover_bytes } })`

#### F10. CBZ import unpacks images into a chapter folder

- **Status:** [x] covered by [`import.spec.ts`](../flows/import.spec.ts) › `"CBZ import unpacks images into a chapter folder"`

#### F11. CBR is NOT a supported extension

- **Status:** [ ] TODO
- **Goal:** `detectExt` recognises only `pdf | cbz | epub | txt`. CBR throws `unsupported extension: <name>`.
- **Notes:** since `importFiles` is browser-side, would need to exercise via a unit/component test or wire a hidden test entry point. Flag as not-easily-E2E-able.

#### F12. EPUB import creates a novel series with synthetic chapter id `epub:<count>`

- **Status:** [x] covered by [`import-epub.spec.ts`](../flows/import-epub.spec.ts) › `"import_epub adds a novel series visible in Library"` + `"import_epub unpacks both chapters into the series"`

#### F13. Image folder imports as one chapter via `importImageFolder`

- **Status:** [ ] TODO
- **Steps:** create a temp dir containing JPGs; `invokeCmd(app, 'import_image_folder', { args })`; assert series + chapter row.
- **Fixture deps:** runtime tmp folder + a couple of JPGs (could reuse existing samples).
- **Notes:** cleanup must remove the tmp dir and `delete_series_force`.

#### F14. TXT import lands as a novel chapter

- **Status:** [x] covered by [`import.spec.ts`](../flows/import.spec.ts) › `"TXT import lands as a novel chapter"`

#### F15. Unsupported extension produces an `errors[]` entry

- **Status:** [ ] TODO
- **Notes:** like F11; lives entirely in browser-side `importFiles`. Either expose a thin entry point on `window` for tests, or skip and cover via unit test.

#### F16. Filename heuristic (`parseImportFilename`) feeds suggested series name + chapter number

- **Status:** [ ] TODO
- **Steps:** import a file named like `My Series - Ch 03 - Title.pdf` directly via `import_pdf` with the Rust-parsed name; verify both that the JS heuristic is what `ImportButton` would pass.
- **Notes:** mainly a unit-test target; flag.

### Import duplicate detection

#### F17. Same PDF re-imported flags second as duplicate

- **Status:** [x] covered by [`import-dedupe.spec.ts`](../flows/import-dedupe.spec.ts) › `"importing the same PDF twice flags the second as duplicate"`

#### F18. EPUB re-import flags second as duplicate

- **Status:** [x] covered by [`import-epub.spec.ts`](../flows/import-epub.spec.ts) › `"importing the same EPUB twice flags the second as duplicate"`

#### F19. Re-import via image folder triggers `duplicate: true` when content hash matches

- **Status:** [ ] TODO

### Import progress overlay

#### F20. Progress modal renders only while `busy && progress`

- **Status:** [ ] TODO
- **Notes:** observable only mid-import. Could use a slow fixture (large PDF, multi-file batch through the JS path) — but the JS path needs the native dialog. Flag as hard-to-reach without a test hook.

#### F21. Progress bar width = `done / total`

- **Status:** [ ] TODO

#### F22. Current filename ellipsis rendering (`.cur`)

- **Status:** [ ] TODO

#### F23. No cancel button (documented limitation)

- **Status:** [ ] TODO
- **Goal:** when progress modal is shown, assert no cancel button exists. Could be a DOM-level negative assertion combined with a forced-busy state via an instrumentation hook.

#### F24. Progress modal closes automatically when `runImport` resolves

- **Status:** [ ] TODO

### Import summary modal

#### F25. Summary opens when ≥1 of imported/dups/errors is non-empty

- **Status:** [ ] TODO
- **Steps:** drive `importFiles` via JS API exposed on window (or unit test). Flag.

#### F26. Summary stays closed when run produces empty results

- **Status:** [ ] TODO
- **Notes:** unreachable through Rust commands alone — the JS `runImport` is the gate.

#### F27. Summary `imported.length` + `imported_suffix` text rendered

- **Status:** [ ] TODO

#### F28. Summary duplicates list scrollable to `max-height: 140px`

- **Status:** [ ] TODO

#### F29. Summary errors list scrollable, `filename — error` format

- **Status:** [ ] TODO

#### F30. Background click closes summary

- **Status:** [ ] TODO

#### F31. Escape closes summary (modal `onkeydown`)

- **Status:** [ ] TODO

#### F32. Close button closes summary

- **Status:** [ ] TODO

#### F33. Successful import triggers `bumpSeriesMutation` → Library refetches

- **Status:** [x] indirectly covered by [`import.spec.ts`](../flows/import.spec.ts) (each test expects the new card to appear after force-refresh; note the spec uses `nav-library` click to force refetch — `bumpSeriesMutation` is implicit through Rust path)

### Bulk Edit modal ([BulkEditModal.svelte](../../../src/features/library/BulkEditModal.svelte))

#### F34. Modal opens from bulk-bar Edit CTA with correct pid count in title

- **Status:** [x] partially covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) (asserts modal visible). Title assertion is TODO.
- **Steps:** add assertion that `<h3>` reads `library.bulk.title` with `{n}` replaced by selected count.

#### F35. Author field — `bulkUpdateSeries.authorName`

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts)

#### F36. Author field — blank trims to undefined (no change)

- **Status:** [ ] TODO
- **Steps:** open modal with author blank; apply; assert `get_series.author_name` unchanged.

#### F37. Artist field — `bulkUpdateSeries.artistName`

- **Status:** [ ] TODO
- **Steps:** fill artist, apply, verify via `get_series`. Cleanup with empty patch.

#### F38. Status select — value `''` leaves untouched

- **Status:** [ ] TODO

#### F39. Status select — value `0` writes status=unknown

- **Status:** [ ] TODO

#### F40. Status select — value `1` writes status=ongoing

- **Status:** [ ] TODO

#### F41. Status select — value `2` writes status=completed

- **Status:** [ ] TODO

#### F42. Reading-status select — each of plan/reading/completed/on_hold/dropped writes correctly

- **Status:** [ ] TODO (one test per value or table-driven)

#### F43. Reading-status select — `clear` sends `clearReadingStatus: true` and no `value`

- **Status:** [ ] TODO
- **Steps:** pick `clear`; apply; assert `get_series.reading_status === null` AND series 1002's RS (which was 'plan') becomes null.

#### F44. Reading-status select — `''` leaves untouched

- **Status:** [ ] TODO

#### F45. Add tags — CSV splitting, trimming, empties filtered

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) (fills `e2e-tag` and verifies via `get_series`)

#### F46. Add tags — multiple CSV entries

- **Status:** [ ] TODO
- **Steps:** fill `tagA, tagB,  tagC ,,` → assert exactly 3 tags written.

#### F47. Remove tags — CSV path

- **Status:** [ ] TODO
- **Steps:** seed two tags via `bulk_update_series`; then run modal with `remove tags` filled; verify removal.

#### F48. Apply triggers `bumpSeriesMutation` → Library refetches AND modal closes via `onApplied`

- **Status:** [x] covered by [`bulk-edit.spec.ts`](../flows/bulk-edit.spec.ts) (modal asserted `toHaveCount(0)` after apply)

#### F49. Apply with empty form is a no-op (nothing gets sent that mutates)

- **Status:** [ ] TODO
- **Steps:** open modal, click Apply with all defaults; assert no fields changed in any selected series.

#### F50. Cancel (footer right) closes modal without applying

- **Status:** [ ] TODO

#### F51. × button (top-right) closes modal

- **Status:** [ ] TODO

#### F52. Background click closes modal (overlay)

- **Status:** [ ] TODO

#### F53. Escape (modal `onkeydown`) closes modal from form state

- **Status:** [ ] TODO

#### F54. Escape closes modal from confirm-delete state too

- **Status:** [ ] TODO

#### F55. 🗑 Delete arms confirm state, swaps footer left side

- **Status:** [ ] TODO
- **Steps:** click `[data-test="bulk-delete-arm"]`; assert `.confirm-text` visible + `[data-test="bulk-delete-confirm"]` visible.

#### F56. Confirm inline Cancel rewinds to form (does NOT close modal)

- **Status:** [ ] TODO
- **Goal:** documented inconsistency — there are two Cancel buttons in confirm state; the inline one rewinds, the right one closes.
- **Steps:** arm delete; click inline Cancel; assert `bulk-delete-arm` button reappears AND modal still visible.

#### F57. Confirm right-side Cancel closes the whole modal

- **Status:** [ ] TODO
- **Steps:** arm delete; click the right-aligned `.ghost` Cancel; assert modal `toHaveCount(0)`.

#### F58. Delete forever triggers `bulkDeleteSeries`

- **Status:** [ ] TODO
- **Steps:**
  1. Use throwaway series (import a fresh PDF, track pid).
  2. Enter select mode; select; open modal; arm delete; click confirm.
  3. Assert `get_series(pid)` errors (row gone) AND card no longer in Library.
- **Fixture deps:** throwaway series imported via `import_pdf`; afterEach guarantees cleanup even on failure.

#### F59. Delete forever — no second confirm

- **Status:** [ ] TODO
- **Goal:** documented behaviour — confirm state already IS the second click.

#### F60. Error banner shows when `bulkUpdateSeries` rejects

- **Status:** [ ] TODO
- **Notes:** hard to force a real failure. Skip / flag.

#### F61. Error banner shows when `bulkDeleteSeries` rejects

- **Status:** [ ] TODO

#### F62. Busy state — buttons disabled, labels swap to `…`

- **Status:** [ ] TODO
- **Notes:** races with the Rust call. Flag.

#### F63. Modal does NOT show a list of selected titles (documented limitation)

- **Status:** [ ] TODO
- **Goal:** assert no `.bm-card` element enumerates pids/names. Negative assertion only.

### Save-as-collection modal ([CollectionChips.svelte](../../../src/features/library/CollectionChips.svelte) lines 121-151)

#### F64. Save trigger only renders when filters/sort are non-default

- **Status:** [ ] TODO (overlaps with F60 in 03-library)
- **Steps:** cold mount → assert `[data-test="collection-save"]` absent. Apply type=novel → assert present.

#### F65. Click Save chip opens the modal with empty input

- **Status:** [ ] TODO
- **Steps:** trigger modal; assert `[data-test="collection-save-input"]` value is empty AND has focus (autofocus).

#### F66. Input autofocus on open

- **Status:** [ ] TODO

#### F67. Cancel closes the modal

- **Status:** [ ] TODO

#### F68. Background click closes modal

- **Status:** [ ] TODO

#### F69. Escape (window-level) closes modal

- **Status:** [ ] TODO

#### F70. Enter (window-level) commits save

- **Status:** [ ] TODO
- **Steps:** type a name; press Enter; assert collection created.

#### F71. Enter with empty name is a no-op (`commitSave` bails)

- **Status:** [ ] TODO
- **Steps:** open modal; press Enter without typing; assert modal still open and `list_collections` unchanged.

#### F72. Save button disabled when name is blank or only whitespace

- **Status:** [ ] TODO
- **Steps:** fill with spaces; assert `[data-test="collection-save-confirm"]` is `disabled`.

#### F73. Save button disabled while `saving` (label swaps to `…`)

- **Status:** [ ] TODO
- **Notes:** races with Rust call. Flag.

#### F74. commitSave calls `createCollection(name, serializeFilters())`

- **Status:** [x] covered by [`collections.spec.ts`](../flows/collections.spec.ts) › `"save current filters as a collection, chip appears and persists"`

#### F75. After save: `savedFlash` triggers `cc-flash` keyframe on the new chip for 1400ms

- **Status:** [ ] TODO
- **Notes:** visual; assert `.flash` class added then removed after timeout.

#### F76. Snapshot includes type/status/dl/rs/sort/genres/genreCombo/query

- **Status:** [ ] TODO
- **Steps:** seed full filter state (e.g. type=manga + status=ongoing + rs=reading + genre=action + AND combo + query=foo); save; read row's `filter_json`; assert all keys present.

#### F77. Trim — leading/trailing whitespace stripped from name

- **Status:** [ ] TODO
- **Steps:** input `"  My Coll  "`; save; assert created row name === `"My Coll"`.

#### F78. Empty trimmed name bails silently

- **Status:** [ ] TODO

#### F79. No pre-fill / suggested name (documented limitation)

- **Status:** [ ] TODO
- **Goal:** input opens empty even with rich filter state.

#### F80. Global-Enter race when modal open (documented quirk)

- **Status:** [ ] TODO
- **Goal:** the `svelte:window onkeydown` Enter handler fires anywhere on the page; verify it only matters when modal is open.

### Modal stacking & portal

#### F81. All three modals render through `portal` (escape transformed ancestors)

- **Status:** [ ] TODO
- **Notes:** code-level: confirm overlays mount under `<body>`, not inside `.page`. Could assert via `document.body` matchers.

#### F82. Import dropdown menu is NOT portal-mounted (documented gotcha)

- **Status:** [ ] TODO
- **Goal:** confirm `.menu` is a sibling of the import button inside `.wrap`, not under body.

#### F83. z-index stacking — modals (z-index ≥ 1000) over bulk-bar (z-index 1500) over rest

- **Status:** [ ] TODO

---

## Coverage summary

- Total flows: **83**
- Covered: **8** (F09, F10, F14, F17, F33 indirect, F34 partial, F35, F45, F48, F74)
- TODO: **~75**

Effective covered count (de-duplicated, partial counts as covered): ~10 flows with existing tests; ~73 remain.

## Selectors to add (missing test hooks)

- `data-test="import-menu"`, `import-menu-files`, `import-menu-folder` on the dropdown and items (F01–F03).
- `data-test="import-progress"` on the overlay card (F20–F24).
- `data-test="import-summary"` + `import-summary-close` on the modal + button (F25–F32).
- `data-test="import-summary-dup"`, `import-summary-err` for the two list sections (F28, F29).
- `data-test="bulk-edit-modal"` already present.
- `data-test="bulk-edit-title"` on the modal `<h3>` for F34 pid-count assertion.
- `data-test="bulk-status"` on the status select (F38–F41).
- `data-test="bulk-artist"`, `bulk-remove-tags` mirrors of existing `bulk-author` / `bulk-add-tags` (F37, F47).
- `data-test="bulk-cancel-inline"` and `bulk-cancel-footer` to distinguish the two Cancel buttons in confirm state (F56, F57).
- `data-test="bulk-err"` on the red banner (F60, F61).
- `data-test="collection-save"`, `collection-save-input`, `collection-save-confirm` already present.
- `data-test="collection-save-modal"` for the save-modal root (F65, F69).

## Hooks to add for tests that are otherwise unreachable

- Browser-side `window.__importFiles(paths)` instrumentation for F11/F15/F25/F26/F27.
- Slow-import flag (env var or Rust hook) to expose the progress overlay long enough to assert (F20–F24, F62, F73).
- Fixture entry `tests/fixtures/build/import-samples/sample.epub` for F12, F18.
- Throwaway-series helper for F58 (already a pattern from `series-edit.spec.ts`).
