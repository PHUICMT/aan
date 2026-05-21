# App Shell — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Source: [`docs/ui-review/01-shell.md`](../../../docs/ui-review/01-shell.md), [`src/App.svelte`](../../../src/App.svelte), [`src/app/TitleBar.svelte`](../../../src/app/TitleBar.svelte), [`src/app/Sidebar.svelte`](../../../src/app/Sidebar.svelte), [`src/app/TrayMenu.svelte`](../../../src/app/TrayMenu.svelte). Tick the `[x]` when a flow is covered by at least one test.

## Flow inventory

### F01. Boot lands on Home with sidebar + titlebar visible

- **Status:** [x] covered by [`smoke.spec.ts`](../flows/smoke.spec.ts) › `"boots and shows home + sidebar"`
- **Goal:** verify the shell mounts on launch.
- **Preconditions:** clean `aan.*` localStorage (fixture default).
- **Steps:**
  1. App boots with fresh state.
- **Expected:**
  - `[data-test="nav-home"]` visible.
  - `[data-test="sidebar"]` visible.
- **Selectors / commands:** `[data-test="nav-home"]`, `[data-test="sidebar"]`. TitleBar visibility check (`.titlebar`) not yet asserted — propose adding `data-test="titlebar"`.
- **Fixture deps:** none.
- **Notes:** existing spec doesn't assert the TitleBar itself.

### F02. TitleBar minimize button hides the window

- **Status:** [ ] TODO
- **Goal:** clicking minimize stows the window via `win.minimize()`.
- **Preconditions:** main window is visible and not minimized.
- **Steps:**
  1. Click `[data-test="title-min"]`.
  2. Read window state via `invokeCmd(app, 'get_window_state')` _or_ Tauri `getCurrentWindow().isMinimized()` evaluated in-page.
- **Expected:**
  - Window reports `isMinimized === true`.
- **Selectors / commands:** `[data-test="title-min"]`; in-page `await window.__TAURI__.window.getCurrentWindow().isMinimized()`.
- **Fixture deps:** none.
- **Notes:** restoring the window afterwards is necessary so following specs in the serial run don't operate on a minimized webview. Use `getCurrentWindow().unminimize()`.

### F03. TitleBar maximize toggles + icon swaps maximize ↔ restore

- **Status:** [ ] TODO
- **Goal:** the max button calls `toggleMax()` and the icon name updates with `isMax`.
- **Preconditions:** window not maximized.
- **Steps:**
  1. Assert icon is `maximize` (SVG path lookup or `data-test` on the `<Icon>`).
  2. Click `[data-test="title-max"]`.
  3. Wait for `win.onResized` to refresh `isMax`.
  4. Assert icon is now `restore`.
  5. Click again, assert back to `maximize`.
- **Expected:**
  - `isMaximized()` toggles true → false across the two clicks.
  - Inner icon swaps name to match.
- **Selectors / commands:** `[data-test="title-max"]`. Source should add `data-test="title-max-icon"` on the inner `<Icon>` (or expose `isMax` via a `data-state` attribute) so the icon swap can be asserted without inspecting raw SVG.
- **Fixture deps:** none.
- **Notes:** Windowed runs may already start maximized depending on `WindowState` plugin — reset to a known state first.

### F04. TitleBar double-click toggles maximize

- **Status:** [ ] TODO
- **Goal:** the `data-tauri-drag-region` handler maximizes on double-click.
- **Preconditions:** window restored.
- **Steps:**
  1. Double-click the `.drag` filler element of the titlebar.
  2. Assert `isMaximized()` flipped.
- **Selectors / commands:** propose adding `data-test="title-drag"` to the `.drag` div. Use `app.dblclick(...)`.
- **Fixture deps:** none.
- **Notes:** this is wired by Tauri itself, not by our Svelte. Useful smoke that the `data-tauri-drag-region` attribute is still on the element.

### F05. TitleBar close button — default exits the process

- **Status:** [ ] TODO
- **Goal:** clicking close with `closeToTray=false` quits the app.
- **Preconditions:** `aan.close_to_tray` cleared so behavior is default.
- **Steps:**
  1. Verify `app.closeToTray === false`.
  2. Click `[data-test="title-close"]`.
  3. Assert the WebView2 CDP connection drops within a few seconds.
- **Selectors / commands:** `[data-test="title-close"]`.
- **Fixture deps:** none.
- **Notes:** destructive — the test must own its own Tauri spawn so it doesn't kill the shared instance used by other specs. Move into a dedicated `shell-lifecycle.spec.ts` that does its own setup/teardown, similar to `persistence.spec.ts` in the parent NekoVault project.

### F06. TitleBar close button — with `closeToTray=true`, window hides instead

- **Status:** [ ] TODO
- **Goal:** confirm the Settings toggle path round-trips through `setCloseToTray` and changes close behavior.
- **Preconditions:** enable `aan.close_to_tray` (`invokeCmd(app, 'set_close_to_tray', { value: true })` or via the Settings UI), then reload.
- **Steps:**
  1. Click `[data-test="title-close"]`.
  2. Poll `getCurrentWindow().isVisible()` until `false`.
  3. Restore via `invokeCmd(app, 'show_main_window')`.
- **Expected:**
  - Window becomes hidden, process is still alive (CDP connection survives).
- **Selectors / commands:** `[data-test="title-close"]`, `invokeCmd(app, 'show_main_window')`.
- **Fixture deps:** none.
- **Notes:** also exercises the `$effect` that re-syncs `setCloseToTray` whenever `app.closeToTray` changes.

### F07. TitleBar drag region — visual smoke

- **Status:** [ ] TODO (likely not worth automating; flag for manual review)
- **Goal:** the brand area and `.drag` filler carry `data-tauri-drag-region` so the user can drag the window.
- **Steps:** none — assert via DOM query that both elements have the attribute.
- **Expected:** `app.locator('[data-tauri-drag-region]')` returns at least 2 elements inside the titlebar.
- **Notes:** the actual drag gesture cannot be exercised under WebView2 — assert presence only.

### F08. Sidebar collapse + expand toggles labels

- **Status:** [x] covered by [`sidebar-collapse.spec.ts`](../flows/sidebar-collapse.spec.ts) › `"collapse hides labels, expand restores them"`
- **Goal:** chevron button toggles collapsed state.
- **Notes:** existing spec is a happy-path round-trip. See F09 for persistence.

### F09. Sidebar collapse state persists across reload

- **Status:** [ ] TODO
- **Goal:** `aan.sidebar` survives `page.reload()`.
- **Preconditions:** sidebar expanded.
- **Steps:**
  1. Collapse the sidebar.
  2. `await app.reload()`.
  3. Assert sidebar still collapsed.
  4. Restore expanded state for downstream specs (`afterEach`).
- **Expected:**
  - `localStorage.getItem('aan.sidebar') === 'collapsed'` after step 1.
  - `[data-test="sidebar"]` has the `.collapsed` class after reload.
- **Selectors / commands:** `[data-test="sidebar-collapse"]`, `[data-test="sidebar"]`.
- **Fixture deps:** none.

### F10. Sidebar nav buttons route to each page

- **Status:** [x] partly covered by [`navigation.spec.ts`](../flows/navigation.spec.ts) › `"sidebar stays visible across pages"` (iterates `home / library / favorites / history / settings`)
- **Goal:** every `NAV_ITEMS` entry switches `app.page`.
- **Notes:** existing spec asserts only sidebar visibility — it does click each `nav-*`, so coverage is OK. Could be tightened to assert that the corresponding page root (e.g. `[data-test="library"]`) is visible after each click. Marking `[x]` since the click + sidebar presence is asserted, but recommend tightening.

### F11. Sidebar reading-list buttons route to ReadingList with the right status

- **Status:** [ ] TODO
- **Goal:** each `READING_STATUSES` entry routes to `app.page='list'` with `app.listStatus` set.
- **Preconditions:** at least one series exists in each status (fixture catalog already provides this).
- **Steps:**
  1. For each status id in `['reading','plan','on_hold','completed','dropped']`:
     - Click `[data-test="list-<id>"]`.
     - Assert the reading-list page root is visible (propose `[data-test="reading-list"]`).
     - Assert that the page header or `data-list-status` attribute reflects the clicked status.
- **Expected:**
  - Each click leaves the sidebar entry in `.active` state.
- **Selectors / commands:** `[data-test="list-reading"]` … `[data-test="list-dropped"]`.
- **Fixture deps:** none.
- **Notes:** verifies `openList(s.id)` and `app.listStatus`.

### F12. Sidebar reading-list counts reflect catalog totals

- **Status:** [ ] TODO
- **Goal:** the `.rs-count` pill matches `listLocalSeries()` grouped by `reading_status`.
- **Preconditions:** fixture catalog (6 series with known statuses).
- **Steps:**
  1. From the page, read each `[data-test="list-<id>"] .rs-count` text.
  2. Compare against the aggregation of `invokeCmd(app, 'list_local_series')` grouped by `reading_status`.
- **Expected:**
  - All non-zero counts match; statuses with 0 series have no count badge rendered.
- **Selectors / commands:** propose `data-test="list-count-<id>"` on the `.rs-count` span. `invokeCmd(app, 'list_local_series')`.
- **Fixture deps:** relies on the seeded `reading_status` values — document the expected breakdown in `tests/fixtures/build/`.
- **Notes:** verifies `refreshCounts()` runs on mount.

### F13. Sidebar counts refresh when a series mutation ticks

- **Status:** [ ] TODO
- **Goal:** `app.seriesMutationTick` triggers `refreshCounts()` on `home / library / list / series`.
- **Preconditions:** at least one fixture series, navigated to `home`.
- **Steps:**
  1. Snapshot current count for one status.
  2. `invokeCmd(app, 'set_reading_status', { pid: 1001, status: '<a different status>' })` (or whatever the actual command name is — verify in `src-tauri/`).
  3. Wait for the count badge of the new status to increment.
  4. Restore the original status in `afterEach`.
- **Expected:**
  - Old-status count drops by 1, new-status count rises by 1, both within ~500ms of the tick.
- **Selectors / commands:** `invokeCmd(app, '<reading_status setter>')`; query both `.rs-count` spans.
- **Fixture deps:** none beyond the fixture catalog.
- **Notes:** confirms the `$effect` on `seriesMutationTick` re-fires correctly.

### F16. Sidebar "?" footer button opens the shortcuts modal

- **Status:** [ ] TODO
- **Goal:** the `.kbd-btn` in the sidebar footer toggles the global shortcuts dialog.
- **Preconditions:** sidebar expanded (button is `display: none` when collapsed).
- **Steps:**
  1. Click `aside.sidebar .kbd-btn` (propose `data-test="sidebar-shortcuts"`).
  2. Assert `[data-test="shortcuts-dialog"]` visible.
  3. Press `Escape`, assert dialog closes.
- **Selectors / commands:** propose `data-test="sidebar-shortcuts"`; `[data-test="shortcuts-dialog"]`.
- **Fixture deps:** none.
- **Notes:** confirms the sidebar exposes the same toggle as `?` keypress.

### F17. Sidebar footer hides "?" button when collapsed

- **Status:** [ ] TODO
- **Goal:** style rule `.sidebar.collapsed .kbd-btn { display: none }` actually hides it.
- **Steps:**
  1. Collapse sidebar.
  2. Assert `.kbd-btn` is not visible (`toHaveCSS('display', 'none')`).
- **Notes:** trivial regression check.

### F18. App version label renders in the footer

- **Status:** [ ] TODO
- **Goal:** `getVersion()` populates `.status-text` with `Aan {ver}`.
- **Steps:**
  1. After mount, assert `aside.sidebar .footer .status-text` matches `/^Aan \d+\.\d+\.\d+/`.
- **Selectors / commands:** propose `data-test="sidebar-version"`.
- **Fixture deps:** none.

### F19. Page transition: forward nav slides in from the right, back from the left

- **Status:** [ ] TODO
- **Goal:** `pageSlide` honors `app.navDir`.
- **Preconditions:** start on `home`.
- **Steps:**
  1. Click `[data-test="nav-library"]`. Within 50ms, screenshot or read computed transform of `.page-wrap`.
  2. Click `[data-test="back"]` (or sidebar Home) and read transform of new `.page-wrap`.
- **Expected:**
  - Forward: incoming page begins with `translateX(40px)`.
  - Back: incoming page begins with `translateX(-40px)`.
- **Selectors / commands:** `.page-wrap`; assert `getComputedStyle(...).transform`.
- **Fixture deps:** none.
- **Notes:** timing-sensitive — propose exposing `data-nav-dir="forward|back"` on `.page-wrap` so the spec doesn't have to race the 180ms animation.

### F20. Page transition does not leave ghost frames in DOM

- **Status:** [ ] TODO
- **Goal:** after a nav, only one `.page-wrap` remains 250ms later.
- **Steps:**
  1. Click `[data-test="nav-library"]`.
  2. Wait 250ms.
  3. Assert `app.locator('.page-wrap')` has count 1.
- **Notes:** verifies the `{#key}` + `duration:0` outgoing combo from the source's "Notes".

### F21. Global `?` shortcut opens shortcuts dialog

- **Status:** [x] covered by [`keyboard-shortcuts.spec.ts`](../flows/keyboard-shortcuts.spec.ts) › `"? opens shortcuts dialog, Escape closes it"`

### F22. Global `Escape` closes the shortcuts dialog

- **Status:** [x] covered by [`keyboard-shortcuts.spec.ts`](../flows/keyboard-shortcuts.spec.ts) › `"? opens shortcuts dialog, Escape closes it"`

### F23. `?` is ignored when focus is inside an input/textarea/contenteditable

- **Status:** [ ] TODO
- **Goal:** the `inField` guard in `onKey` swallows `?` while typing.
- **Preconditions:** any page with an input — e.g. Library search.
- **Steps:**
  1. Navigate to Library.
  2. Focus the search input.
  3. Dispatch `?` via `KeyboardEvent`.
  4. Assert `[data-test="shortcuts-dialog"]` has count 0.
  5. Assert the input value now contains `?`.
- **Selectors / commands:** library search input (existing `[data-test="lib-search"]` per LibraryPage).
- **Fixture deps:** none.

### F24. Global `r` / `R` resumes the last reader when one exists

- **Status:** [ ] TODO
- **Goal:** `resumeLastReader()` fires when `app.lastReader` is set and current page is not `reader`.
- **Preconditions:** open + close a chapter once to seed `aan.last_reader`. Either:
  - Drive UI to read a chapter, then `back()`. _Or_:
  - Pre-seed via `invokeCmd(app, 'set_last_read', { pid: 1001, chapter_id: '1001-ch1', last_page: 1 })` if such a command exists; otherwise localStorage write before reload.
- **Steps:**
  1. With `lastReader` set, navigate to `home`.
  2. Dispatch `r` keydown.
  3. Assert reader page mounts (`[data-test="reader"]`).
- **Expected:**
  - `app.page === 'reader'` and the chapter matches `lastReader.chapterId`.
- **Selectors / commands:** keyboard event dispatch.
- **Fixture deps:** depends on a seedable `last_reader` command.

### F25. `r` does nothing while on the reader page

- **Status:** [ ] TODO
- **Goal:** the `app.page !== 'reader'` guard suppresses re-entry.
- **Steps:**
  1. Open a chapter to land on `reader`.
  2. Dispatch `r`. Assert page is still `reader` (no state change observable, but the reader should not remount).
- **Notes:** hard to assert "nothing happened" — at minimum, page id is unchanged. Propose adding a `data-nav-counter` runtime store mirrored to `body` for stronger assertions.

### F26. `r` is suppressed while inside an input

- **Status:** [ ] TODO
- **Goal:** same `inField` guard, this time for `r/R`.
- **Steps:**
  1. Navigate to Library.
  2. Focus search input.
  3. Type `r`.
  4. Assert page didn't change to `reader` and the input value now contains `r`.
- **Fixture deps:** existing `aan.last_reader` (seeded as in F24).

### F27. Theme is applied to `<html data-theme>` on mount

- **Status:** [ ] TODO
- **Goal:** the `onMount` line `document.documentElement.dataset.theme = app.theme` runs.
- **Steps:**
  1. On boot, read `document.documentElement.getAttribute('data-theme')`.
  2. Assert it equals the persisted theme (default `dark`).
- **Notes:** complements F28.

### F28. Theme switch + persists across reload

- **Status:** [x] covered by [`theme-persist.spec.ts`](../flows/theme-persist.spec.ts) › `"theme switch + persists across reload"`

### F29. `setCloseToTray` is synced to Rust on mount

- **Status:** [ ] TODO
- **Goal:** the `onMount` + `$effect` both call `setCloseToTray(app.closeToTray)`.
- **Steps:**
  1. Read tray flag from the backend (`invokeCmd(app, 'get_close_to_tray')` — verify command name).
  2. Toggle `aan.close_to_tray` in localStorage, reload.
  3. Re-read; assert it matches.
- **Notes:** documents the doubled-sync flagged in the source review notes — only worth a single happy-path assertion.

### F30. ContinuePill renders at root when `app.lastReader` is set + not on reader

- **Status:** [ ] TODO (overlay flows fully detailed in `02-home.md`)
- **Goal:** sanity that the pill mounts above any page.
- **Steps:**
  1. Seed `lastReader`.
  2. Navigate to `settings`.
  3. Assert `[data-test="continue-pill"]` (propose adding) is visible.
- **Notes:** placement-only — interaction flows live in `02-home.md`.

### F31. ContinuePill is hidden on the reader page

- **Status:** [ ] TODO
- **Goal:** verify the `app.page !== 'reader'` guard.
- **Steps:** open a chapter, assert pill is not in DOM.

### F32. MoveJobBanner mounts at root (visibility gated by job state)

- **Status:** [ ] TODO (out of scope per source doc — flagged only)
- **Goal:** confirm it exists and is hidden by default.
- **Steps:** assert the banner element is either absent or `aria-hidden`. Move flows belong in a `settings-move` backlog.

### F33. Tray menu — "Show Aan" reveals main window from minimized state

- **Status:** [ ] TODO
- **Goal:** `invoke('show_main_window')` un-minimizes + refocuses.
- **Preconditions:** main window minimized; tray webview launched.
- **Steps:**
  1. From main window, `getCurrentWindow().minimize()`.
  2. Open a separate CDP connection to the tray webview (filter by `html[data-win="tray_menu"]`).
  3. Click the first `.row` (propose `data-test="tray-show"`).
  4. Assert main window `isVisible() && !isMinimized()`.
- **Selectors / commands:** propose `data-test="tray-show"`; `invoke('show_main_window')`.
- **Fixture deps:** requires the tray window to be createable on demand — wiring depends on Rust setup.
- **Notes:** see Known traps in the e2e README — `fixtures/app.ts` filters out the tray webview. A dedicated `tray.spec.ts` needs its own page acquisition logic.

### F34. Tray menu — "Quit Aan" terminates the process

- **Status:** [ ] TODO (destructive)
- **Goal:** clicking the quit row invokes `quit_app`.
- **Notes:** like F05 — must own its Tauri spawn. Propose `data-test="tray-quit"`.

### F35. Tray menu auto-dismisses on blur

- **Status:** [ ] TODO
- **Goal:** `win.onFocusChanged({payload:false})` hides the tray window.
- **Steps:**
  1. Open tray window.
  2. Refocus the main window via `getCurrentWindow().setFocus()`.
  3. Assert tray window `isVisible()` becomes `false` within ~250ms (200ms poll interval + slack).
- **Notes:** the 200ms polling fallback should also fire if the focus event misses.

### F36. Tray menu auto-dismisses on Escape

- **Status:** [ ] TODO
- **Steps:** open tray, press Escape inside it, assert `isVisible() === false`.
- **Notes:** uses the keydown handler attached in `onMount`.

### F37. Tray menu entry animation plays once

- **Status:** [ ] TODO (low value)
- **Goal:** `pop-in` keyframe is applied to `.tray-menu`.
- **Notes:** assert `getComputedStyle(...).animationName === 'pop-in'` on mount — purely a regression guard.
