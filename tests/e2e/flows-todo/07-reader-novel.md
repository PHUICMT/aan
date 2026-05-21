# Reader (Novel) — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Sourced from [`docs/ui-review/07-reader-novel.md`](../../../docs/ui-review/07-reader-novel.md), [`Reader.svelte`](../../../src/features/reader/Reader.svelte), [`NovelReader.svelte`](../../../src/features/reader/NovelReader.svelte), [`NovelSettingsMenu.svelte`](../../../src/features/reader/NovelSettingsMenu.svelte), [`NovelAnnotations.svelte`](../../../src/features/reader/NovelAnnotations.svelte), [`NovelDictionary.svelte`](../../../src/features/reader/NovelDictionary.svelte). Tick `[x]` when a flow is covered by at least one test.

## Flow inventory

### F01. Open novel chapter; HTML body renders; back returns to detail

- **Status:** [x] covered by [`novel-reader.spec.ts › "novel chapter renders and is scrollable"`](../flows/novel-reader.spec.ts)

### F02. Shell topbar matches `bg` (light/dark) derived from theme

- **Status:** [ ] TODO
- **Goal:** `<html data-reader-bg>` is `light` for theme=light/sepia, `dark` for theme=dark/black.
- **Steps:** for each of the 4 themes (set via Rust `set_series_reader_prefs` or by clicking the swatch), assert `dataset.readerBg`.

### F03. Toolbar: Prev chapter button + disabled at first chapter

- **Status:** [ ] TODO
- **Goal:** `[Prev]` calls `readerPrev` and is disabled when `readerHasPrev()` is false.
- **Steps:**
  1. Open the first novel chapter in the readerChapters list.
  2. Assert prev `.ch-btn:has-text("Prev")` is disabled.
  3. Click `Next`; assert chapter changed.
- **Selectors / commands:** propose `data-test="novel-prev-ch"` / `novel-next-ch`.

### F04. Toolbar: Next chapter advances + disabled at last

- **Status:** [ ] TODO (mirror of F03)

### F05. Page indicator visible only in paged mode with pageCount > 1

- **Status:** [ ] TODO
- **Goal:** the `.page-ind` span renders only when `app.novelLayout === 'paged' && pageCount > 1`.
- **Steps:** scroll layout → assert absent. Switch to paged on a long enough novel → assert present.
- **Preconditions:** synthetic fixture chapters may be too short to paginate — may require a longer seed novel.

### F06. Outline button shows only when toc.length > 0

- **Status:** [ ] TODO
- **Steps:** open a fixture novel without H1-H3 headings → assert `.bg-toggle[aria-label="Outline"]` not present. Open one with headings → present.
- **Fixture deps:** add a fixture novel with at least one H2.

### F07. Outline panel toggle persists to `aan.reader.toc_open`

- **Status:** [ ] TODO
- **Steps:** click `Outline` button → `.toc-panel` portal'd to body; `localStorage.aan.reader.toc_open === '1'`. Click again → panel removed, value `0`.

### F08. Outline item click smooth-scrolls to heading

- **Status:** [ ] TODO
- **Steps:** open outline; click an item; assert the heading element is in viewport (`isIntersectingViewport`).

### F09. Outline panel close `×` button

- **Status:** [ ] TODO
- **Steps:** open outline; click `×`; panel removed; `toc_open` → `0`.

### F10. Find bar: opens via Ctrl+F and focuses input

- **Status:** [ ] TODO
- **Steps:** open chapter; press Ctrl+F; assert `.find-bar` visible; document.activeElement is the find input.

### F11. Find bar: opens via search button in toolbar

- **Status:** [ ] TODO
- **Steps:** click the `search` button in `.right-ctrls`; assert find bar opens.
- **Selectors / commands:** propose `data-test="novel-find-open"`.

### F12. Find: typing wraps matches in `<mark.nv-find>` and active gets `.active`

- **Status:** [ ] TODO
- **Steps:** open chapter known to contain "the"; open find; type `the`; assert at least one `mark.nv-find.active` exists and `n/total` count > 0.

### F13. Find: Enter → next, Shift+Enter → previous

- **Status:** [ ] TODO
- **Steps:** with multiple matches, press Enter; the `.active` mark advances. Shift+Enter; reverses.

### F14. Find: ArrowDown / ArrowUp in input also navigate matches

- **Status:** [ ] TODO

### F15. Find: case toggle re-applies highlights

- **Status:** [ ] TODO
- **Steps:** type lowercase query; toggle `Aa`; assert match count changes when capitalisation matters.

### F16. Find: Escape closes find bar and clears highlights

- **Status:** [ ] TODO
- **Steps:** open find; type; Escape; assert `.find-bar` removed and no `mark.nv-find` left in DOM.

### F17. Find: `×` close button works

- **Status:** [ ] TODO

### F18. Annotations panel toggles open / close

- **Status:** [x] covered indirectly by [`annotations.spec.ts › "annotations created via command surface as wrappers + panel rows"`](../flows/annotations.spec.ts) (uses `[data-test="anno-panel-toggle"]` and asserts `[data-test="anno-panel"]`).

### F19. Annotations panel: rows render per series annotation with chapter chip + color class

- **Status:** [x] covered by [`annotations.spec.ts › "annotations created via command surface as wrappers + panel rows"`](../flows/annotations.spec.ts)

### F20. Annotations panel: rows persist across chapter swap + cold reload

- **Status:** [x] covered by [`annotations.spec.ts › "annotation list survives chapter swap and reload"`](../flows/annotations.spec.ts)

### F21. Annotations panel: empty state copy

- **Status:** [ ] TODO
- **Goal:** when `annoItems.length === 0`, the `.anno-empty` copy shows.
- **Steps:** open a series with zero annotations → open panel → assert empty-state text.

### F22. Annotations panel: Export markdown via Tauri save dialog

- **Status:** [x] backend covered by [`annotations.spec.ts › "export_series_annotations_md emits chapter-grouped markdown"`](../flows/annotations.spec.ts). UI button click + native dialog not driven.
- **Notes:** Save dialog can't be driven; skip the click path. Backend command is asserted directly.

### F23. Annotation create popup: selection → 5 color swatches → addAnnotation

- **Status:** [x] partially covered — the wrap rendering is covered by [`annotations.spec.ts`](../flows/annotations.spec.ts) via direct `add_annotation` calls. The selection mouseup gesture path is NOT driven (Playwright cannot trigger a real selection in WebView2 reliably).
- **Notes:** Selectors `[data-test="anno-menu"]`, `[data-test="anno-color-{c}"]`. Leave as TODO marker noting the gesture limitation.

### F24. Annotation edit popup: click on `.nv-anno` span → 5 swatches → updateAnnotationColor

- **Status:** [ ] TODO
- **Goal:** after creating an annotation via Rust cmd, click the wrapped span; popup opens; clicking a different swatch fires `update_annotation_color`.
- **Steps:**
  1. `add_annotation` via Rust on 2001-ch2.
  2. Open chapter; click the `.nv-anno` span.
  3. Assert `[data-test="anno-menu"]` visible.
  4. Click `[data-test="anno-color-green"]`.
- **Expected:** the wrapped span class flips to `anno-green`; `list_annotations` returns `color='green'`.

### F25. Annotation edit popup: delete `[data-test="anno-delete"]`

- **Status:** [ ] TODO
- **Steps:** open existing annotation popup; click delete; row removed; `list_annotations` length decreases.

### F26. Annotation edit popup: note textarea + Save

- **Status:** [ ] TODO
- **Goal:** typing into `[data-test="anno-note"]` and clicking `[data-test="anno-save-note"]` persists the note.
- **Expected:** `list_annotations[…].note` matches the typed value; panel row shows the note.

### F27. Annotation popup closes on outside mousedown

- **Status:** [ ] TODO

### F28. Dictionary popup: double-click word triggers `lookup_term`

- **Status:** [ ] TODO (backend covered by [`dictionary.spec.ts › "install_dictionary + lookup_term returns the exact match"`](../flows/dictionary.spec.ts); the UI dblclick gesture path is NOT driven).
- **Goal:** double-click on a word in `.body` opens `[data-test="dict-popup"]` with `[data-test="dict-term"]` matching the word.
- **Preconditions:** install a dict with the target word.
- **Steps:** install dict via Rust; open chapter; `page.dblclick` on the word's bounding box.
- **Notes:** Browser-native dblclick selection may not produce a Selection object — flaky. Consider gating with `app.evaluate` to seed a Range first.

### F29. Dictionary popup: empty state when no match

- **Status:** [ ] TODO
- **Steps:** with no dict installed, double-click word; assert `[data-test="dict-empty"]` visible.

### F30. Dictionary popup: closes on outside mousedown

- **Status:** [ ] TODO

### F31. Dictionary popup: skipped when selection length > 3 words

- **Status:** [ ] TODO
- **Goal:** double-clicking with a 4+ word selection programmatically established should not open dict popup.

### F32. Settings menu: Layout segmented Scroll ↔ Paged

- **Status:** [x] covered by [`novel-reader-modes.spec.ts › "switching to paged layout shows page indicator and arrow keys flip pages"`](../flows/novel-reader-modes.spec.ts)

### F33. Settings menu: Spread toggle hidden in scroll, present in paged

- **Status:** [x] covered by [`novel-reader-modes.spec.ts › "two-page spread toggle only appears in paged mode and persists"`](../flows/novel-reader-modes.spec.ts)

### F34. Settings menu: 4 theme swatches change `data-novel-theme` and persist

- **Status:** [x] partially — sepia covered by [`novel-reader-modes.spec.ts › "theme swatch updates root and persists across reload"`](../flows/novel-reader-modes.spec.ts). The other 3 swatches (`light`, `dark`, `black`) are not individually tested.
- **TODO sub-flows:**
  - F34a. light swatch → `data-novel-theme="light"` + light chrome.
  - F34b. dark swatch (default).
  - F34c. black (OLED) swatch.
- **Selectors / commands:** `[data-test="novel-theme-light|sepia|dark|black"]`.

### F35. Settings menu: Font size A− / A+ stepper

- **Status:** [ ] TODO
- **Goal:** clicking A+ increases `app.fontNovelSize`, persists to `aan.font.novel.size`.
- **Steps:**
  1. Open settings; read `.set-desc` numeric font size.
  2. Click A+; assert size +1 and localStorage value increments.
  3. Click A− twice; assert size −2 from start.
- **Selectors / commands:** propose `data-test="novel-font-smaller"` / `novel-font-larger`. Currently buttons have `aria-label="smaller"` / `"larger"`.

### F36. Settings menu: Line height ± in 0.1 steps; disabled at MIN/MAX

- **Status:** [ ] TODO
- **Goal:** the `−` / `+` buttons step by 0.1 and disable at the clamp boundaries.
- **Steps:** read initial value; step `+` until disabled; assert hit MAX; step `−` past MIN; assert disabled.
- **Selectors / commands:** propose `data-test="novel-lineheight-dec"` / `novel-lineheight-inc`.

### F37. Settings menu: Max width ± in 40 px steps; disabled at MIN/MAX

- **Status:** [ ] TODO
- **Goal:** mirror of F36 with 40 px steps.
- **Selectors / commands:** propose `data-test="novel-maxwidth-dec"` / `novel-maxwidth-inc`.

### F38. Settings menu: BrightnessControls embedded (shared with manga)

- **Status:** [ ] TODO
- **Notes:** Same component as `06-reader-manga.md` F36-F39. Add a smoke test inside the novel settings menu confirming the slider mounts.

### F39. Settings menu: PER-SERIES OVERRIDE Save stamps row + reapplies cold

- **Status:** [x] covered by [`novel-override.spec.ts › "saving override stamps the row + reapplies on reopen"`](../flows/novel-override.spec.ts)

### F40. Settings menu: PER-SERIES OVERRIDE Reset clears row, falls back to globals

- **Status:** [x] covered by [`novel-override.spec.ts › "clearing the override falls back to global defaults"`](../flows/novel-override.spec.ts)

### F41. Settings menu: override section hidden when no `app.readerChapter.pid`

- **Status:** [ ] TODO
- **Goal:** when `pid == null`, the `[data-test="novel-override-row"]` is absent.
- **Notes:** Hard to set up — readerChapter is set by `openReader`. Could be exercised by opening a synthetic chapter object without pid via Rust seed.

### F42. Paged mode: ArrowRight / Space / PageDown advance pages, fall through to readerNext at last

- **Status:** [x] partially covered by [`novel-reader-modes.spec.ts › "switching to paged layout shows page indicator and arrow keys flip pages"`](../flows/novel-reader-modes.spec.ts) (only ArrowLeft/Right within chapter; chapter fall-through NOT covered).
- **TODO:** at last page, ArrowRight should call `readerNext` (chapter swap). Requires multi-chapter readerChapters and a long-enough novel.

### F43. Paged mode: ArrowLeft / PageUp retreats, falls through to readerPrev at first page

- **Status:** [ ] TODO (mirror of F42)

### F44. Scroll layout: bottom-nav `[← Prev chapter]` / `[Next chapter →]`

- **Status:** [ ] TODO
- **Goal:** in scroll layout only, the footer renders Prev/Next chapter buttons.
- **Steps:** scroll mode → assert `.bottom-nav` visible. Switch to paged → assert removed.

### F45. Scroll layout: bottom-nav disabled at neighbouring edge

- **Status:** [ ] TODO

### F46. Article fly-in transition on chapter swap (`articleEpoch` bump)

- **Status:** [ ] TODO (low priority)
- **Goal:** swapping chapter restarts the fly-in (y: 18, 320 ms).

### F47. Prefetch next chapter at ≥70 % scroll

- **Status:** [ ] TODO
- **Goal:** scrolling to ≥70 % invokes `prefetchChapterBytes` for the next downloaded chapter.
- **Notes:** Hard to assert directly; observe via spy on the prefetch cache or by timing the next-chapter mount latency.

### F48. `setChapterProgress(cid, 1)` stamps read_at on chapter load (for History)

- **Status:** [ ] TODO
- **Goal:** opening a novel chapter writes `read_at` to the row.
- **Steps:** open chapter; `list_chapters(pid)`; the opened chapter has non-null `read_at`.
- **Cleanup:** `set_chapter_progress(cid, 0)` to reset.

### F49. Annotation re-apply on chapter mount (wrappers survive reload)

- **Status:** [x] covered by [`annotations.spec.ts › "annotation list survives chapter swap and reload"`](../flows/annotations.spec.ts)

### F50. HTML extractBody strips `<button>` / `<form>` / `<input>` / `<textarea>` / `<svg>`

- **Status:** [ ] TODO
- **Goal:** import a TXT/HTML novel containing those tags; assert the rendered `.body` has none of them.

### F51. Article ResizeObserver recomputes pageCount on font/layout changes

- **Status:** [ ] TODO
- **Goal:** in paged mode, bumping font size changes `data-novel-page-count`.
- **Steps:** paged mode; read `data-novel-page-count`; click A+ several times; assert count changed.

### F52. No keyboard shortcut to open outline / annotations / settings / theme (intentional gap)

- **Status:** [ ] TODO (regression guard)
- **Goal:** confirm no global hotkey exists today for any of these. Press candidate keys; assert no panel toggled.

### F53. `aan.novel.line_height` clamp persists

- **Status:** [ ] TODO

### F54. `aan.novel.max_width` clamp persists

- **Status:** [ ] TODO

### F55. `aan.font.novel.size` persists across reload

- **Status:** [ ] TODO

### F56. Find highlights re-apply ResizeObserver-style after `findCase` toggle (no leak)

- **Status:** [ ] TODO
- **Goal:** after closing find, no `mark.nv-find` left in DOM.
- **Notes:** Could fold into F16.

## Selectors / commands needed (proposed additions)

- `novel-prev-ch`, `novel-next-ch`, `novel-find-open`, `novel-outline-open`, `novel-outline-close` on `NovelReader.svelte`.
- `novel-font-smaller`, `novel-font-larger`, `novel-lineheight-dec`, `novel-lineheight-inc`, `novel-maxwidth-dec`, `novel-maxwidth-inc` on `NovelSettingsMenu.svelte`.

## Summary

- Total flows: **56** (counting F34 as one; F34a-c are sub-items)
- Covered: **9** (F01, F18, F19, F20, F22 backend only, F23 partial, F32, F33, F34 partial, F39, F40, F49 — totalling roughly 11 spec links across overlapping flows)
- TODO: **45+** (the remainder)
