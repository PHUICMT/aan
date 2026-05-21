# Reader (Manga / Comic) — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Sourced from [`docs/ui-review/06-reader-manga.md`](../../../docs/ui-review/06-reader-manga.md), [`Reader.svelte`](../../../src/features/reader/Reader.svelte), [`MangaReader.svelte`](../../../src/features/reader/MangaReader.svelte), [`ReaderToolbar.svelte`](../../../src/features/reader/ReaderToolbar.svelte), [`ReaderTapZones.svelte`](../../../src/features/reader/ReaderTapZones.svelte), [`BrightnessControls.svelte`](../../../src/features/reader/BrightnessControls.svelte), [`BookmarksMenu.svelte`](../../../src/features/reader/BookmarksMenu.svelte), [`ReaderSettingsMenu.svelte`](../../../src/features/reader/ReaderSettingsMenu.svelte). Tick `[x]` when a flow is covered by at least one test.

## Flow inventory

### F01. Open single-page PDF chapter and return via Back

- **Status:** [x] covered by [`manga-reader.spec.ts › "open 1001-ch1 (1 page) and back to series"`](../flows/manga-reader.spec.ts)

### F02. Open 20-page PDF chapter; Next does not throw

- **Status:** [x] covered by [`manga-reader.spec.ts › "open 1001-ch3 (20 pages) and Next does not throw"`](../flows/manga-reader.spec.ts)

### F03. Shell topbar matches reader bg (light/dark)

- **Status:** [ ] TODO
- **Goal:** `<html data-reader-bg="light|dark">` toggles when bg changes; topbar uses the matching variant.
- **Steps:**
  1. Open 1001-ch3.
  2. Open settings menu, click the "Background" row to flip dark → light.
- **Expected:** `document.documentElement.dataset.readerBg === 'light'`; topbar background colour resolves to the light variant.
- **Selectors / commands:** `app.evaluate(() => document.documentElement.dataset.readerBg)`. Propose `data-test="reader-bg-toggle"` on the settings row.

### F04. Toolbar slides off when immersive triggers controls-hidden

- **Status:** [ ] TODO
- **Goal:** with `immersive=on` and 2.5 s of idle, `[data-reader-controls="hidden"]` is set and `.reader-bar` translates off-screen.
- **Steps:**
  1. Open chapter; open settings; click Immersive row to enable.
  2. Wait 2700 ms with no mouse/keyboard input.
- **Expected:** `<html data-reader-controls="hidden">` present.
- **Notes:** `mousemove` listener nudges controls back — test must avoid moving the mouse.

### F05. Toolbar Prev/Next nav buttons (continuous mode)

- **Status:** [ ] TODO
- **Goal:** clicking `[data-test="reader-prev"]` / `[data-test="reader-next"]` calls `scrollToPage(currentPage ± 1)` in continuous mode.
- **Preconditions:** open 1001-ch3 in continuous mode (default fresh state).
- **Steps:** click `reader-next`; assert page indicator advances.
- **Notes:** the `currentPage` value isn't directly exposed — read the page-jump input placeholder (which equals `currentPage`).

### F06. Toolbar Prev/Next nav buttons (paged mode)

- **Status:** [ ] TODO
- **Goal:** in paged mode, the same buttons step `pagedPrev` / `pagedNext` (step 1).
- **Steps:** cycle mode to `Paged` via settings menu; click `reader-next` twice; assert `currentPage` advances 1 → 3.

### F07. Toolbar Prev/Next nav buttons (spread mode with spreadSolo)

- **Status:** [ ] TODO
- **Goal:** at page 1 step is 1 (cover solo), then step is 2.
- **Steps:** spread mode; from page 1 click Next once → page 2; click Next again → page 4.

### F08. Page jump input: Enter submits to `scrollToPage`

- **Status:** [ ] TODO
- **Goal:** typing a number and pressing Enter jumps to that page.
- **Steps:** focus `[data-test="reader-jump-input"]`, type `10`, press Enter.
- **Expected:** placeholder of the input now reads `10`.

### F09. Page jump placeholder shows `currentPage-currentPage+1` in spread

- **Status:** [ ] TODO
- **Goal:** in spread mode (visibleIndicesLen===2) the placeholder is `n-n+1`.
- **Steps:** spread mode at page 2 → placeholder is `2-3`.

### F10. Mode pill cycles continuous → paged → spread (with 220 ms fade-swap)

- **Status:** [ ] TODO
- **Goal:** clicking the toolbar mode pill cycles through the three modes; `aan.reader.mode` localStorage updates.
- **Steps:** click toolbar Mode button thrice; assert label sequence and `localStorage.aan.reader.mode`.
- **Selectors / commands:** propose `data-test="reader-mode-cycle"`. Or locate via `button.mode` containing the mode label.

### F11. Fit pill cycles width → height → natural

- **Status:** [ ] TODO
- **Steps:** click toolbar Fit button thrice; assert `localStorage.aan.reader.fit` cycles `width|height|natural` and `.pages` gains/loses `fit-width|fit-height|fit-natural`.

### F12. Zoom + / - / reset (button cluster)

- **Status:** [ ] TODO
- **Goal:** `+` increases zoom, `-` decreases, the percentage label resets to 100 %.
- **Steps:** click `+` twice; assert label > 100 %. Click label; assert back to 100 %.
- **Selectors / commands:** propose `data-test="reader-zoom-in"`, `reader-zoom-out`, `reader-zoom-reset`.

### F13. Keyboard: ArrowDown / PageDown / Space → next page

- **Status:** [ ] TODO
- **Goal:** each key fires `pagedNext` / `scrollToPage(currentPage+1)` depending on mode and short-circuits when an input is focused.
- **Steps (continuous):** ensure focus on `.reader-root`; `keyboard.press('ArrowDown')`; assert `currentPage` advances.
- **Steps (paged):** repeat in paged mode.
- **Notes:** test all three keys.

### F14. Keyboard: ArrowUp / PageUp → previous page

- **Status:** [ ] TODO
- **Goal:** mirror of F13.

### F15. Keyboard: ArrowLeft / ArrowRight in LTR

- **Status:** [ ] TODO
- **Goal:** Right advances, Left retreats, both in continuous and paged.

### F16. Keyboard: ArrowLeft / ArrowRight in RTL flips direction

- **Status:** [ ] TODO
- **Goal:** with RTL on, Right retreats, Left advances.
- **Preconditions:** RTL toggle is disabled in continuous mode — enter paged first.

### F17. Keyboard: Home / End

- **Status:** [ ] TODO
- **Steps:** open a multi-page chapter; press End → currentPage = pageCount; press Home → currentPage = 1.

### F18. Keyboard: `b` / `B` toggles bookmark (ignores Ctrl/Cmd)

- **Status:** [ ] TODO
- **Goal:** pressing `b` calls `toggleBookmarkHere`. `Ctrl+b` is ignored.
- **Steps:**
  1. Open chapter; press `b`.
  2. Open bookmarks menu; assert one row.
  3. Press `Ctrl+b`; assert no second add.
- **Cleanup:** `remove_bookmark` for each created id.

### F19. Keyboard: `+` / `=` zoom in, `-` / `_` zoom out, `0` reset

- **Status:** [ ] TODO
- **Steps:** open chapter; press `+`, `-`, `0` in sequence; assert toolbar zoom percent.

### F20. Keyboard handler short-circuits when input is focused

- **Status:** [ ] TODO
- **Goal:** typing in the page-jump input must not advance pages.
- **Steps:** focus jump input, press ArrowRight; assert page didn't change; only the input cursor moved.

### F21. Bookmark toggle pill toggles current page (and "on" state)

- **Status:** [ ] TODO
- **Goal:** clicking the 🔖 pill calls `addBookmark` then on next click `removeBookmark`. Amber `.on` reflects current page.
- **Selectors / commands:** propose `data-test="reader-bm-toggle"`. Cleanup: remove every bookmark id created.

### F22. Count pill hidden when no bookmarks, visible after first add

- **Status:** [ ] TODO

### F23. Bookmark menu: jump to bookmarked page

- **Status:** [ ] TODO
- **Steps:** add bookmarks at pages 2, 5, 10; open the count menu; click row for page 5; assert `currentPage = 5`.

### F24. Bookmark menu: delete row

- **Status:** [ ] TODO
- **Steps:** add a bookmark; open menu; click trash; assert list decrements and DB no longer holds the row.
- **Selectors / commands:** `list_bookmarks(chapterId)` for verification.

### F25. Bookmark menu closes on outside mousedown

- **Status:** [ ] TODO
- **Steps:** open menu; click on the reader page; menu removed.

### F26. Bookmarked page renders ribbon + amber outline

- **Status:** [ ] TODO
- **Goal:** the `.page-wrap.bookmarked` class is applied to the matching page; `.bm-ribbon` is visible.

### F27. Settings menu opens (popMenu transition) and closes on outside

- **Status:** [ ] TODO
- **Goal:** click `set-toggle` (settings cog) shows `.set-menu`; click on the scrim closes.
- **Selectors / commands:** propose `data-test="reader-settings-toggle"`.

### F28. Settings: reading-mode segmented control (3-way)

- **Status:** [ ] TODO
- **Goal:** each button (Paged / Continuous / Spread) sets both `mode` and `layout` and the `--active-idx` indicator slides.
- **Selectors / commands:** propose `data-test="reader-mode-paged"`, `reader-mode-continuous`, `reader-mode-spread`.

### F29. Settings: Background tap toggles dark ↔ light + icon swaps

- **Status:** [ ] TODO (overlap with F03)

### F30. Settings: Animations toggle (`aan.reader.anim` persists)

- **Status:** [ ] TODO
- **Steps:** open settings, click Animations row; assert `localStorage.aan.reader.anim` flips between `on/off`.

### F31. Settings: Reading direction LTR↔RTL; disabled in continuous

- **Status:** [ ] TODO
- **Goal:** in continuous, RTL row is `disabled`. Switch to paged; toggle RTL; assert `.pages.rtl` and `localStorage.aan.reader.rtl`.

### F32. Settings: Solo first page row only in spread mode (slide-in)

- **Status:** [ ] TODO
- **Steps:** continuous/paged → row absent; spread → row visible; toggle persists.

### F33. Settings: Double page cycles off → auto → always; disabled in continuous

- **Status:** [ ] TODO
- **Steps:** continuous → row disabled. Switch to paged; click row 3× and assert label cycles; `aan.reader.dpage` updates.

### F34. Settings: Cover page solo row slides in when dpage !== off

- **Status:** [ ] TODO

### F35. Settings: Immersive toggle (auto-hide after 2.5 s)

- **Status:** [ ] TODO (covered indirectly by F04)
- **Goal:** clicking the row flips `localStorage.aan.reader.immersive` and starts the idle timer.

### F36. Settings: BrightnessControls — brightness slider 30-100 %

- **Status:** [ ] TODO
- **Goal:** dragging the slider updates `app.readerBrightness`, persists to `aan.reader.brightness`, and the `.dim` overlay opacity reflects `1 - brightness`.
- **Selectors / commands:** `#b-slider` input range, set `value` + dispatch `input`. Use `app.evaluate(() => localStorage.getItem('aan.reader.brightness'))`.

### F37. Settings: BrightnessControls — warmth slider 0-60 %

- **Status:** [ ] TODO
- **Goal:** mirror of F36 for warmth.

### F38. Settings: BrightnessControls — Reset slides in and clears values

- **Status:** [ ] TODO
- **Steps:** drag brightness down; assert `.reset-wrap` appears; click `Reset`; assert both values back to default and the row collapses.

### F39. Brightness/warmth overlays render and respect values

- **Status:** [ ] TODO
- **Goal:** the shell-level `.dim` and `.warm` divs render at z-index 9 with computed opacity matching the store.
- **Notes:** Overlays live in `Reader.svelte`. Check `getComputedStyle` opacity.

### F40. Tap-zone overlay only mounts outside continuous mode

- **Status:** [ ] TODO
- **Steps:** continuous → assert `button.tap-zone` count = 0; switch to paged → assert count = 2 (left + right).

### F41. Tap-zone click advances/retreats (LTR)

- **Status:** [ ] TODO
- **Steps:** paged mode, page 1; click right tap-zone → currentPage = 2; click left → 1.
- **Selectors / commands:** `button.tap-zone.left`, `button.tap-zone.right`.

### F42. Tap-zone click flips in RTL

- **Status:** [ ] TODO

### F43. Tap-zone disabled at edges shows barrier cursor

- **Status:** [ ] TODO
- **Steps:** at page 1 hover left tap-zone; expect `.tap-cursor.cursor-disabled` (barrier line SVG); click does nothing.

### F44. Tap-zone wheel triggers paged scroll-jump (delegated)

- **Status:** [ ] TODO
- **Goal:** wheel on the tap zone fires `onTapWheel`. Mark low priority (composable behaviour).

### F45. Chapter footer shows in continuous mode

- **Status:** [ ] TODO
- **Goal:** `.ch-footer` is visible in continuous mode and at the very end of paged/spread.
- **Steps:** open chapter in continuous; scroll to bottom; assert both `[Prev chapter]` and `[Next chapter]` buttons visible.

### F46. Chapter footer Prev/Next jump to neighbouring chapter, skipping non-downloaded

- **Status:** [ ] TODO
- **Goal:** clicking footer next loads the next downloaded chapter; the spec must verify the skip-non-downloaded behaviour by inserting a tracked-but-not-downloaded sibling.
- **Preconditions:** `readerChapters` populated by Series Detail (default flow). For skip-coverage seed a partial chapter via Rust.

### F47. Chapter footer disabled when no neighbour exists

- **Status:** [ ] TODO
- **Steps:** open last chapter of a series; assert `.ch-nav-btn.primary` is disabled.

### F48. Loading state shows shimmer card, no toolbar

- **Status:** [ ] TODO
- **Goal:** during `loading=true`, `.loading-page` shimmer is visible and `[data-test="reader-toolbar"]` is absent.
- **Notes:** hard to catch — may require slowing the network or using a large PDF.

### F49. Error state shows red `.err` text and no toolbar

- **Status:** [ ] TODO
- **Goal:** when `read_chapter_bytes` rejects, `.err` is rendered.
- **Preconditions:** drive `openReader` with a chapter pointing at a missing file via Rust seed.

### F50. Continuous-mode lazy render: off-screen canvases cleared

- **Status:** [ ] TODO
- **Goal:** the IntersectionObserver removes rendered canvases when out of view (`renderedSet` reduces; canvas `width=0`).
- **Steps:** open a 20-page PDF in continuous mode; scroll to bottom; inspect first page canvas dimensions.

### F51. Continuous mode: scroll updates `currentPage` indicator

- **Status:** [ ] TODO
- **Goal:** scrolling the container changes the page-jump placeholder.

### F52. Mode cycle while in zoomed state preserves zoom

- **Status:** [ ] TODO (low priority regression guard)

### F53. PDF and image-directory chapters both render

- **Status:** [ ] TODO
- **Goal:** verify that converting a chapter to images and opening it shows `<img>` tags (not `<canvas>`).
- **Preconditions:** chain on F38 from series detail backlog.

### F54. No Escape binding for exiting reader — guard test

- **Status:** [ ] TODO (regression guard)
- **Goal:** confirm that pressing Escape inside the reader does NOT navigate back (intentional gap).
- **Steps:** focus reader; press Escape; assert still on reader page.

### F55. `aan.reader.bg` persists across cold reload

- **Status:** [ ] TODO
- **Goal:** toggle bg to light; reload; reopen chapter; bg still light.

### F56. `aan.reader.fit` persists across cold reload

- **Status:** [ ] TODO

### F57. `aan.last_reader` persists chapterId + lastPage

- **Status:** [ ] TODO
- **Goal:** flush progress + reload + Continue resumes at the previous page.
- **Notes:** more naturally lives in a Home/Continue spec but listed for completeness.

## Selectors / commands needed (proposed additions)

- `reader-mode-cycle`, `reader-fit-cycle`, `reader-zoom-in`, `reader-zoom-out`, `reader-zoom-reset` on `ReaderToolbar.svelte`.
- `reader-bm-toggle`, `reader-bm-list-toggle`, `reader-bm-item-{id}`, `reader-bm-delete-{id}` on `BookmarksMenu.svelte`.
- `reader-settings-toggle`, `reader-mode-paged|continuous|spread`, `reader-bg-toggle`, `reader-anim-toggle`, `reader-rtl-toggle`, `reader-spread-solo`, `reader-dpage-cycle`, `reader-dpage-cover-solo`, `reader-immersive-toggle` on `ReaderSettingsMenu.svelte`.
- `reader-tap-left`, `reader-tap-right` on `ReaderTapZones.svelte`.

## Summary

- Total flows: **57**
- Covered: **2** (F01, F02)
- TODO: **55**
