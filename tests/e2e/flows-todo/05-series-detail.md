# Series Detail — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Sourced from [`docs/ui-review/05-series-detail.md`](../../../docs/ui-review/05-series-detail.md), [`SeriesDetail.svelte`](../../../src/features/series/SeriesDetail.svelte), [`ChapterRow.svelte`](../../../src/features/series/ChapterRow.svelte), [`SeriesEditModal.svelte`](../../../src/features/series/SeriesEditModal.svelte). Tick `[x]` when a flow is covered by at least one test.

## Flow inventory

### F01. Open series detail from Library and see hero + chapter list

- **Status:** [x] covered by [`series-detail.spec.ts › "series 1001 shows 4 chapter rows"`](../flows/series-detail.spec.ts)
- **Goal:** confirm the detail page mounts with cover, meta grid, and the seeded chapter rows.
- **Preconditions:** fixture series 1001 (4 chapters).
- **Steps:**
  1. Open Library.
  2. Click card for pid 1001.
- **Expected:**
  - `[data-test="series-detail"]` visible.
  - chapter rows count = 4.
- **Selectors / commands:** `LibraryPage.clickSeriesByPid(1001)`, `SeriesDetailPage.chapterRows()`.

### F02. Back button returns to Library

- **Status:** [x] covered indirectly by [`navigation.spec.ts › "home → library → series → reader → back chain"`](../flows/navigation.spec.ts)
- **Goal:** BackButton on detail returns to the previous page (Library).
- **Preconditions:** any fixture series.
- **Steps:**
  1. Open detail for pid 1001.
  2. Click BackButton.
- **Expected:** Library route active.
- **Selectors / commands:** existing BackButton selector in SeriesDetailPage.

### F03. Hero scroll parallax fades + shifts

- **Status:** [ ] TODO
- **Goal:** scrolling the page translates the hero up and reduces opacity toward 0.25.
- **Preconditions:** series with enough chapter rows to make the page scroll (1001 may suffice; otherwise import a throwaway with 30+ chapters).
- **Steps:**
  1. Open detail for pid 1001.
  2. Read initial `transform` + `opacity` of `.series-hero`.
  3. Scroll the `.page` container by 300px.
  4. Re-read computed style.
- **Expected:**
  - `transform.translateY` becomes more negative (shift ≈ `-scrollTop * 0.35`).
  - `opacity` ≤ 0.4 after scroll past `FADE_AT` (240 px).
- **Selectors / commands:** `app.locator('.series-hero')`, `evaluate(el => getComputedStyle(el).opacity)`.
- **Notes:** This is a visual/animation flow; flake-prone — consider tolerance ±0.05.

### F04. Reading-status pill opens menu and assigns status (optimistic + persists)

- **Status:** [ ] TODO
- **Goal:** opening the status dropdown and picking a row stamps `series.reading_status` and the pill reflects it.
- **Preconditions:** fixture pid 1003 (no status set in seed); restore status to NULL in `afterEach`.
- **Steps:**
  1. Open detail for pid 1003.
  2. Click `[data-test="series-status"]`.
  3. Click the first reading-status item in the portal'd `.status-menu`.
- **Expected:**
  - Pill gains `.on` class and shows the picked status label + colored dot.
  - `get_series(1003).reading_status` matches the picked id.
- **Selectors / commands:** `[data-test="series-status"]`, `.status-menu .status-item`, `invokeCmd(app, 'get_series', { pid: 1003 })`. Cleanup: `invokeCmd(app, 'set_reading_status', { pid: 1003, id: null })`.

### F05. Clear reading status from the menu

- **Status:** [ ] TODO
- **Goal:** the trailing `Clear` row only appears when a status is set and resets it.
- **Preconditions:** seed status via `set_reading_status` then open detail.
- **Steps:**
  1. Seed status on pid 1003.
  2. Open detail, open status menu.
  3. Click the `.status-clear` row.
- **Expected:** pill loses `.on`, shows the bookmark "None" icon; `get_series` returns `reading_status = null`.
- **Selectors / commands:** `.status-clear .status-item`.

### F06. Status menu closes on outside click

- **Status:** [ ] TODO
- **Goal:** clicking outside the portal'd menu closes it without changing state.
- **Steps:**
  1. Open detail; click `[data-test="series-status"]`.
  2. Click on the cover image.
- **Expected:** `.status-menu` is removed from the DOM; pill state unchanged.

### F07. Favorite toggle persists across nav-away-and-back

- **Status:** [x] covered by [`series-detail.spec.ts › "favorite toggle persists across nav-away-and-back"`](../flows/series-detail.spec.ts)
- **Goal:** heart icon optimistic flip + DB round-trip; survives leaving and re-entering the page.
- **Selectors / commands:** `[data-test="series-fav"]`.

### F08. Open folder pill triggers `openInExplorer`

- **Status:** [ ] TODO
- **Goal:** click the folder pill calls `series_folder` + `open_in_explorer`. Real Explorer spawn is a side-effect we can't observe; assert no toast error is rendered.
- **Steps:**
  1. Open detail for pid 1001.
  2. Click the folder icon button (third pill in `.series-actions`).
- **Expected:** no `.toast` (error toast) shows up within 1500 ms.
- **Selectors / commands:** propose `data-test="series-folder"` on the folder button (currently only `aria-label={t('series.open_folder')}`). Or locate via `button[aria-label*="folder"]`.
- **Notes:** Cannot drive native Explorer; we observe the absence of the error toast instead.

### F09. Edit pencil opens SeriesEditModal

- **Status:** [x] covered by [`series-edit.spec.ts › "rename a series and see the hero update"`](../flows/series-edit.spec.ts) (implicitly: opening the modal).
- **Goal:** click pencil mounts the portal'd modal with snapshotted fields.
- **Selectors / commands:** `[data-test="series-edit"]` → `[data-test="series-edit-name"]`.

### F10. Edit modal: rename + save reflects in hero

- **Status:** [x] covered by [`series-edit.spec.ts › "rename a series and see the hero update"`](../flows/series-edit.spec.ts)

### F11. Edit modal: blank name is rejected

- **Status:** [x] covered by [`series-edit.spec.ts › "blank name shows an error and does not save"`](../flows/series-edit.spec.ts)

### F12. Edit modal: edit alias + author + artist + status + info

- **Status:** [ ] TODO
- **Goal:** every text field in the modal round-trips through `update_series`.
- **Preconditions:** fixture pid 1001; restore each field in `afterEach`.
- **Steps:**
  1. Open detail, click `[data-test="series-edit"]`.
  2. Fill alias, author, artist, info; change status `<select>` to `Completed (2)`.
  3. Click `[data-test="series-edit-save"]`.
- **Expected:**
  - Modal closes.
  - Hero shows the new alias under the title.
  - `invokeCmd(app, 'get_series', { pid: 1001 })` shows the new fields and `status === 2`.
- **Selectors / commands:** propose `data-test="series-edit-alias"`, `series-edit-author`, `series-edit-artist`, `series-edit-info`, `series-edit-status`. Currently only `name` and `save` have data-test. Until selectors land, use field label / `bind:value` proxies.

### F13. Edit modal: Escape key closes modal

- **Status:** [ ] TODO (partially exercised in blank-name spec via `keyboard.press('Escape')` but not the dedicated assertion)
- **Goal:** pressing Escape inside the card invokes `onClose`.
- **Steps:** open modal, press Escape.
- **Expected:** `[data-test="series-edit-name"]` no longer visible.

### F14. Edit modal: backdrop click closes modal

- **Status:** [ ] TODO
- **Steps:** open modal, click on the `.overlay` (outside the card).
- **Expected:** modal removed.

### F15. Edit modal: replace cover (via Rust cmd surrogate)

- **Status:** [ ] TODO
- **Goal:** new cover bytes propagate via `set_series_cover` and `invalidate_cover` so the hero `<img>` re-resolves.
- **Preconditions:** native picker can't be driven — call `invokeCmd(app, 'set_series_cover', { pid, bytes })` directly with a small JPEG buffer to simulate the button's effect; cleanup restores the original cover via `set_series_cover` with the seed bytes.
- **Steps:**
  1. Snapshot current cover bytes via Rust (or skip and just check the `src` blob changed).
  2. Call `set_series_cover` with a new buffer.
  3. Trigger `invalidate_cover(pid)` (already done by command in real flow) and re-open detail.
- **Expected:** cover `<img>` src changes (new blob URL).
- **Notes:** Replace-cover button calls the Tauri `open` dialog — bypass the dialog by driving the Rust command directly, same pattern as import/dictionary specs.

### F16. Edit modal: Delete → confirm flow + onDeleted goes back

- **Status:** [ ] TODO
- **Goal:** the danger-zone two-step delete actually removes the series and navigates back.
- **Preconditions:** import a throwaway series via `import_pdf` so fixtures stay clean.
- **Steps:**
  1. Open detail for the throwaway pid.
  2. Click pencil → red `Delete` button → confirm-zone `Delete now`.
- **Expected:**
  - Modal closes, page navigates back (Library).
  - `list_local_series` no longer contains the pid.
- **Selectors / commands:** propose `data-test="series-edit-delete-arm"`, `series-edit-delete-cancel`, `series-edit-delete-confirm`. Today only "Save" / "Name" have data-test; locate by text or class until added.

### F17. Edit modal: Delete → Cancel keeps the form

- **Status:** [ ] TODO
- **Goal:** clicking Cancel in the danger zone returns to the editable form, series still present.
- **Steps:** open modal → arm delete → click Cancel.
- **Expected:** form fields visible again; `get_series(pid)` still returns the row.

### F18. Genre chips render when tags exist; hidden when empty

- **Status:** [ ] TODO
- **Goal:** the `.genres` row only shows when `detail.tags.length > 0`.
- **Preconditions:** fixture series with tags (none in current seed?) — may require seeding tags via `update_series` or extending fixtures to include a `tags` value.
- **Steps:**
  1. Open a series with no tags → assert `.genres` count = 0.
  2. Seed tags via Rust, reopen → assert each chip text.
- **Fixture deps:** extend fixture builder so at least one series carries tags; otherwise this stays TODO/skipped.

### F19. Synopsis card falls back to placeholder when info is empty

- **Status:** [ ] TODO
- **Goal:** the synopsis paragraph shows `t('series.no_synopsis')` when `detail.info` is empty/null.
- **Preconditions:** fixture series with empty `info` column (most seeds — verify).
- **Steps:** open detail, read text inside `.synopsis p`.
- **Expected:** matches `t('series.no_synopsis')` — load locale JSON in test to derive the string.

### F20. Continue pill appears when a continueChapter exists and jumps to reader

- **Status:** [ ] TODO
- **Goal:** the gradient `Continue` pill is visible (next-to-read row + button) and clicking it opens the right chapter in the reader.
- **Preconditions:** stamp `chapters.last_page_read = 3` on a chapter via `set_chapter_progress` or direct seed.
- **Steps:**
  1. Seed progress on chapter `1001-ch3` to last_page_read=3.
  2. Open detail for 1001.
  3. Click `[data-test="series-continue"]`.
- **Expected:**
  - Continue pill shows correct chapter number.
  - Reader opens at chapter `1001-ch3`.
- **Notes:** Cleanup via `set_chapter_progress(chapterId, 0)`.

### F21. Continue pill hidden in select mode

- **Status:** [ ] TODO
- **Steps:** enter select mode → assert `[data-test="series-continue"]` not visible.

### F22. Continue precedence: unfinished read > most recent > lowest downloaded

- **Status:** [ ] TODO
- **Goal:** verify all three branches of `continueChapter` selector logic.
- **Steps:** Three sub-scenarios driving `chapters.last_page_read` / `read_at` via Rust commands and checking the rendered chapter number on the continue pill.
- **Notes:** Heavy seed needed; consider deferring until a small `set_chapter_progress` test helper exists.

### F23. Select-mode entry / exit toggles checkboxes and hides per-row actions

- **Status:** [ ] TODO
- **Goal:** clicking Select reveals checkbox column, hides per-row pencil/trash/read/convert; clicking Exit reverses.
- **Steps:**
  1. Open detail; click `Select` pill.
  2. Assert each row has `.sel-box` button visible.
  3. Click a row's `.sel-box`; assert row gains `.selected` class.
  4. Click `Exit`.
- **Expected:** rows lose select-mode grid, per-row action buttons reappear.
- **Notes:** Propose `data-test="series-select-toggle"` and `data-test="series-select-exit"`.

### F24. Bulk-bar appears with count, Clear empties selection (stays in select mode)

- **Status:** [ ] TODO
- **Goal:** the `.bulk-bar` only shows when ≥1 row is selected; Clear empties without exiting select mode.
- **Steps:** enter select mode → tick 2 rows → assert `.bulk-bar` visible with `2 …` → click `Clear` → assert bulk-bar removed but Select still active.
- **Notes:** Source ui-review flags this as incomplete — there is no bulk-delete / bulk-convert wired up. Test only what exists today.

### F25. Bulk-select bar is incomplete (no bulk-delete) — regression guard

- **Status:** [ ] TODO
- **Goal:** prevent silent feature regressions: assert that no `bulk-delete` / `bulk-convert` buttons exist in `.bulk-bar` today.
- **Notes:** Remove when bulk ops are wired up.

### F26. Chapter row click → opens reader (downloaded chapter)

- **Status:** [x] covered partially by [`manga-reader.spec.ts › "open 1001-ch1 (1 page) and back to series"`](../flows/manga-reader.spec.ts) (`SeriesDetailPage.openChapter`).

### F27. Chapter row Read button hidden for non-downloaded chapters

- **Status:** [ ] TODO
- **Goal:** when `chapter.is_downloaded === 0` the `[data-test="chapter-read-…"]` button is absent.
- **Preconditions:** fixture with a tracked-but-not-downloaded chapter (the partial series in `library-filter.spec.ts`).
- **Steps:** open detail for the partial series, find a non-downloaded row, assert `chapter-read-{id}` count = 0 and the `.fmt-chip` is absent.

### F28. Read-progress strip + in-progress chip render when `last_page_read > 0`

- **Status:** [ ] TODO
- **Goal:** progress strip width matches `lpr / pageCount`; the violet `lpr/pc` chip shows.
- **Steps:** seed `last_page_read = 5` on a 20-page chapter, open detail, read `.read-strip-fill` `width` style.
- **Expected:** width = "25%"; `.read-chip.in-progress` shows `5/20`.

### F29. Fully-read chapter shows green check chip

- **Status:** [ ] TODO
- **Goal:** when `lpr >= pageCount`, the green `.read-chip` (check icon, no `.in-progress`) is rendered.
- **Steps:** seed `set_chapter_progress(cid, pageCount)`, open detail.

### F30. Continue row gets gradient strip + accent border

- **Status:** [ ] TODO
- **Goal:** the chapter row matching `continueChapter` carries `.row.continue`.
- **Steps:** verify single row has the class; switch active chapter (via progress seed) and confirm class moves.

### F31. Format chip reflects file extension (PDF / IMG / HTML)

- **Status:** [ ] TODO
- **Goal:** the chip suffix matches the chapter `pdf_path` extension across all fixture types.
- **Steps:** open three series (manga PDF, image-dir, novel HTML), grep each row for `.fmt-chip.pdf|img|html`.

### F32. Chapter row inline edit: chapter title

- **Status:** [x] covered by [`series-edit.spec.ts › "inline chapter title edit persists"`](../flows/series-edit.spec.ts) (uses a throwaway imported series).

### F33. Chapter row inline edit: chapter number

- **Status:** [ ] TODO
- **Goal:** changing the chapter-no via the `<input type="number">` round-trips to DB.
- **Steps:** on a throwaway imported chapter, click `[data-test="chapter-edit-…"]`, change the number input, press Enter.
- **Expected:** row re-renders with new `chapter_no`; `list_chapters` returns updated value.

### F34. Chapter row inline edit: Escape cancels without saving

- **Status:** [ ] TODO
- **Steps:** start edit → type → press Escape → row reverts.

### F35. Chapter row: arm-then-confirm delete

- **Status:** [ ] TODO
- **Goal:** the trash icon arms `confirmingDelete`; second click `Delete now` calls `delete_chapter`.
- **Preconditions:** throwaway imported chapter so we never touch fixtures.
- **Steps:**
  1. Import a PDF.
  2. Open detail; click the row trash icon (`button.redl.danger[aria-label*="delete"]`).
  3. Assert `.confirm-yes.danger` ("Delete now") appears.
  4. Click it; row removed.
- **Expected:** `list_chapters(pid)` no longer returns the chapter.
- **Notes:** Propose `data-test="chapter-delete-{id}"` and `data-test="chapter-delete-confirm-{id}"`.

### F36. Chapter row: arm-delete auto-cancels after 4 s timeout

- **Status:** [ ] TODO
- **Goal:** if the user doesn't confirm within 4 s the arm resets.
- **Steps:** arm delete; wait 4500 ms; assert original trash button is back.
- **Notes:** Long test — consider mocking time or marking `test.slow()`.

### F37. Chapter row: arm-delete `×` cancels immediately

- **Status:** [ ] TODO
- **Steps:** arm delete; click the `confirm-no` button; assert revert.

### F38. Chapter row: convert PDF → images (arm + confirm)

- **Status:** [ ] TODO
- **Goal:** the convert icon (`folder_open` when PDF) arms `confirming`; confirm calls `convert_chapter_to_images` and the row's `pdf_path` switches.
- **Preconditions:** throwaway imported PDF.
- **Steps:**
  1. Click convert icon on the chapter row.
  2. Assert `.confirm-yes` shows "to_images?".
  3. Click confirm.
- **Expected:** `list_chapters` returns the same chapter with non-PDF `pdf_path`; row chip turns into `IMG`.
- **Notes:** Propose `data-test="chapter-convert-{id}"` and `data-test="chapter-convert-confirm-{id}"`.

### F39. Chapter row: convert image-dir → PDF

- **Status:** [ ] TODO
- **Goal:** mirror of F38 — `convertChapterToPdf` path. Use CBZ import as the seed.
- **Steps:** import a CBZ, open detail, click the convert icon (`file_text`), confirm.
- **Expected:** chip becomes `PDF`.

### F40. Chapter row: convert is hidden for novel HTML

- **Status:** [ ] TODO
- **Goal:** novel chapter rows must not render the convert icon (`isPdf || isImageDir` false).
- **Steps:** open a novel series; assert each row has no `folder_open` / `file_text` action button.

### F41. Chapter list refreshes after reader progress tick

- **Status:** [ ] TODO
- **Goal:** when MangaReader flushes progress and bumps `app.chapterProgressTick`, the detail page reloads chapters (`pendingProgressRefresh` drain effect).
- **Steps:** open detail, open a chapter, scroll to advance pages, back to detail, observe in-progress chip on the row.
- **Notes:** Race-prone; allow `expect.poll`.

### F42. Toast surfaces and auto-dismisses on API failure

- **Status:** [ ] TODO (optional regression guard)
- **Goal:** when `setSeriesFavorite` rejects the optimistic flip reverts and a 3 s toast appears.
- **Preconditions:** mock failure by stopping the Rust process is not feasible — only assertable via dependency injection. Mark as low-priority.

## Selectors / commands needed (proposed additions)

- `series-folder`, `series-select-toggle`, `series-select-exit` on `SeriesDetail.svelte`.
- `series-edit-alias`, `series-edit-author`, `series-edit-artist`, `series-edit-info`, `series-edit-status`, `series-edit-replace-cover`, `series-edit-delete-arm`, `series-edit-delete-cancel`, `series-edit-delete-confirm` on `SeriesEditModal.svelte`.
- `chapter-delete-{id}`, `chapter-delete-confirm-{id}`, `chapter-convert-{id}`, `chapter-convert-confirm-{id}` on `ChapterRow.svelte`.
- `series-bulk-bar`, `series-bulk-clear` on `SeriesDetail.svelte` (for F24).

## Summary

- Total flows: **42**
- Covered: **6** (F01, F02 indirectly, F07, F09, F10, F11, F26, F32)
- TODO: **36**
