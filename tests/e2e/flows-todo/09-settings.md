# Settings — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Tick the `[x]` when a flow is covered by at least one test.

Source docs:
- [docs/ui-review/09-settings.md](../../../docs/ui-review/09-settings.md)
- [src/features/settings/Settings.svelte](../../../src/features/settings/Settings.svelte)
- [sections/GeneralSection.svelte](../../../src/features/settings/sections/GeneralSection.svelte)
- [sections/AppearanceSection.svelte](../../../src/features/settings/sections/AppearanceSection.svelte)
- [sections/TypographySection.svelte](../../../src/features/settings/sections/TypographySection.svelte)
- [sections/TraySection.svelte](../../../src/features/settings/sections/TraySection.svelte)
- [sections/WatchFoldersSection.svelte](../../../src/features/settings/sections/WatchFoldersSection.svelte)
- [sections/BackupSection.svelte](../../../src/features/settings/sections/BackupSection.svelte)
- [sections/DictionariesSection.svelte](../../../src/features/settings/sections/DictionariesSection.svelte)
- [sections/ResetSection.svelte](../../../src/features/settings/sections/ResetSection.svelte)
- [DataFolderSection.svelte](../../../src/features/settings/DataFolderSection.svelte)
- [MoveJobBanner.svelte](../../../src/features/settings/MoveJobBanner.svelte)
- [FontPicker.svelte](../../../src/features/settings/FontPicker.svelte)

Existing related specs:
- [`theme-persist.spec.ts`](../flows/theme-persist.spec.ts) — theme swatch click + reload persistence.
- [`custom-fonts.spec.ts`](../flows/custom-fonts.spec.ts) — `install_font`, `read_custom_font`, `remove_custom_font` via Rust commands.
- [`dictionary.spec.ts`](../flows/dictionary.spec.ts) — `install_dictionary`, `lookup_term` (exact/punctuation/empty).
- [`backup.spec.ts`](../flows/backup.spec.ts) — `create_backup`, `read_backup_metadata` (good + reject).
- [`watch-folder.spec.ts`](../flows/watch-folder.spec.ts) — `add_watch_folder` + auto-import + cleanup.

Constraint that drives a lot of these flows: native pickers (file/folder/save) can't be driven from Playwright in WebView2; all install / restore / set-folder paths must invoke the Rust command directly through `invokeCmd(app, 'cmd', args)` rather than clicking the Pick button.

---

## Flow inventory — page shell

### S01. Settings page renders header + all default sections in order

- **Status:** [ ] TODO
- **Goal:** verify section render order matches `Settings.svelte` (general, appearance, typography, datafolder, watch, tray, dicts, backup, reset).
- **Steps:**
  1. Open Settings via sidebar.
  2. Read `data-test="settings-section-*"` elements in document order.
- **Expected:** ids appear as `general, appearance, typography, datafolder, watch, tray, dicts, backup, reset`.
- **Selectors:** `[data-test^="settings-section-"]`.

### S02. Expand-all button opens every collapsed section

- **Status:** [ ] TODO
- **Goal:** clicking the `Expand all` head button sets every section to open and writes `0` to each `aan.settings.collapsed.<id>` key.
- **Steps:**
  1. Collapse a few sections manually (click their heads).
  2. Click `Expand all`.
- **Expected:**
  - Every section root carries `.open`.
  - Every `aan.settings.collapsed.<id>` localStorage key is `'0'`.
- **Selectors:** `.head-btn` (the chevron-down icon). Propose `data-test="settings-expand-all"` and `data-test="settings-collapse-all"`.

### S03. Collapse-all button closes every section

- **Status:** [ ] TODO
- **Goal:** symmetric of S02; every key becomes `'1'`, no section carries `.open`.
- **Steps:** open all, click `Collapse all`.
- **Expected:** all keys `'1'`; no `.group.open`.

### S04. Individual section toggle persists collapse state

- **Status:** [ ] TODO
- **Goal:** clicking the head of one section toggles `.open` and writes `aan.settings.collapsed.<id>`.
- **Steps:**
  1. Click `general` head once.
  2. Read localStorage.
  3. Reload, navigate to settings.
- **Expected:**
  - After click: section loses `.open`, key `aan.settings.collapsed.general === '1'`.
  - After reload: section still collapsed.
- **Selectors:** `[data-test="settings-section-general"] .group-head`.

### S05. Search input filters sections live

- **Status:** [ ] TODO
- **Goal:** typing into the search box hides non-matching sections and force-expands the surviving ones.
- **Steps:**
  1. Type `language` into `.search`.
- **Expected:**
  - Only `settings-section-general` is in the DOM (matches `settings.lang.title`).
  - It is rendered with body open even if previously collapsed.
  - `appearance`, `typography`, `datafolder`, `watch`, `dicts`, `backup`, `reset` are NOT in the DOM.
- **Selectors:** `.search`, `[data-test^="settings-section-"]`.

### S06. Search hides individual rows inside a section

- **Status:** [ ] TODO
- **Goal:** in Typography, typing `size` hides UI font / Novel font rows but keeps the two size sliders + the section.
- **Steps:**
  1. Type `size`.
- **Expected:**
  - `settings-section-typography` is visible.
  - Rows for `settings.font.ui.title` and `settings.font.novel.title` are NOT rendered.
  - Both `slider` inputs are rendered.
- **Selectors:** `.slider`, row titles by text.
- **Notes:** propose `data-test="settings-row-font-ui"`, `-font-ui-size`, `-font-novel`, `-font-novel-size` to make this precise.

### S07. Head buttons hidden while searching; head is disabled

- **Status:** [ ] TODO
- **Goal:** when `searching` is true, `Expand all` / `Collapse all` are removed and section heads have `disabled` so they can't be clicked.
- **Steps:**
  1. Type any non-empty query.
- **Expected:**
  - `.head-btn` buttons are absent.
  - Each `.group-head` is `disabled` (reduced caret opacity).
- **Selectors:** `.head-btn`, `.group-head:disabled`.

### S08. No-results fallback

- **Status:** [ ] TODO
- **Goal:** typing a nonsense query shows the centered `no_results` block with the query echoed.
- **Steps:**
  1. Type `zzzzqqq`.
- **Expected:**
  - `.no-results` is the only main content.
  - Text matches `settings.search.no_results` with `{q}` replaced.
- **Selectors:** `.no-results`.

### S09. Clear-search (x) button restores all sections

- **Status:** [ ] TODO
- **Goal:** clicking the `x` clear button empties the input and brings sections back to their persisted-collapse state.
- **Steps:**
  1. Type a query.
  2. Click the inline `.clear` button.
- **Expected:** all sections present; head buttons (`Expand/Collapse all`) re-appear; previously-collapsed sections remain collapsed.

### S10. TraySection search-gate regression test

- **Status:** [ ] TODO — **bug**
- **Goal:** confirm Tray section behaves like its peers when a search query matches another section. The current outer guard is `{#if visTray}` (in [TraySection.svelte L24](../../../src/features/settings/sections/TraySection.svelte)), which hides Tray during any non-matching search. Peer sections use `{#if !searching || visX}`.
- **Steps:**
  1. Type `language` (matches General only).
- **Expected (target):**
  - `settings-section-tray` is hidden (correct — query doesn't match Tray).
  - This matches current behavior, BUT also: typing `tray` should keep Tray visible with body open. Verify both.
  2. Type `tray`.
- **Expected (target):**
  - `settings-section-tray` is visible and force-expanded.
  - All other sections are hidden.
- **Notes:** if test fails the second case (because of the outer `{#if visTray}` short-circuit interacting with the `qLower` empty path — currently it works only by coincidence when `searching=true`), that confirms the regression noted in the UI-review doc. Keep this spec dual-purpose: it asserts current desired behavior and would fail if Tray ever drops below the visibility plane.

---

## Flow inventory — General section

### G01. Language pill click switches UI language and persists `aan.lang`

- **Status:** [ ] TODO
- **Goal:** clicking a non-active language pill flips strings throughout the page.
- **Steps:**
  1. Open Settings, expand General.
  2. Click the `th` (or non-EN) language pill.
- **Expected:**
  - Pill carries `.active` with a check icon.
  - `localStorage('aan.lang')` equals the picked id.
  - Hero `h1` (`settings.title`) and other localized strings switch.
- **Selectors:** `.lang-pick .lang.active`. Propose `data-test="lang-<id>"`.

### G02. Language persists across reload

- **Status:** [ ] TODO
- **Goal:** lang choice rehydrates on cold start.
- **Steps:** flip to `th`, `app.reload()`, navigate to settings.
- **Expected:** `th` pill still active; localized strings still in `th`.

---

## Flow inventory — Appearance section

### A01. Theme swatch click + persists across reload

- **Status:** [x] covered by [`theme-persist.spec.ts › "theme switch + persists across reload"`](../flows/theme-persist.spec.ts)

### A02. All five themes are reachable and apply to root

- **Status:** [ ] TODO
- **Goal:** each of `light`, `sepia`, `dim`, `dark`, `oled` can be activated; `:root` `data-theme` (or equivalent) updates each time.
- **Steps:** for each id, click `[data-test="theme-<id>"]`, assert `themeIsActive(id)` via existing helper.
- **Expected:** the active button switches; localStorage `aan.theme` cycles correctly.
- **Notes:** restore to `dark` at end (mirroring `theme-persist.spec.ts` cleanup pattern).

### A03. Themes grouped into light vs dark sub-rows

- **Status:** [ ] TODO
- **Goal:** verify the two `.theme-group` blocks each carry the right subset (light: `light`, `sepia`; dark: `dim`, `dark`, `oled`).
- **Selectors:** `.theme-group .theme-row`.

---

## Flow inventory — Typography section

### T01. UI font picker opens and changes `app.fontUi`

- **Status:** [ ] TODO
- **Goal:** clicking the UI font `FontPicker` trigger opens the menu; selecting an item updates the trigger label and writes `aan.font.ui`.
- **Steps:**
  1. Expand Typography.
  2. Click the UI font trigger.
  3. Click a non-default option.
- **Expected:**
  - Menu (portalled to `body`) is visible.
  - After click, menu closes; trigger shows new label; `aan.font.ui` is the picked CSS family stack.
- **Selectors:** scope to the UI font row. Propose `data-test="font-picker-ui"` on the trigger.
- **Notes:** the menu uses a portal so `closeOnOutside` may bite — use `force: true` if needed.

### T02. UI font size slider updates `app.fontUiSize`

- **Status:** [ ] TODO
- **Goal:** changing the slider value writes the new px to `app.fontUiSize` and `aan.font.ui.size`, and the row `.desc` reflects the new value.
- **Steps:**
  1. Locate UI size `input.slider` and set value via `input.fill(<n>)` or `dispatchEvent('input')`.
- **Expected:**
  - Desc text becomes `<n>px`.
  - `localStorage('aan.font.ui.size') === <n>`.
- **Notes:** sliders sometimes need `evaluate` to set `valueAsNumber` + dispatch `input`.

### T03. Novel font picker + slider mirror T01/T02

- **Status:** [ ] TODO
- **Goal:** same flow, but for `app.fontNovel` / `app.fontNovelSize`. Distinct options (the picker provides `NOVEL_FONTS`).
- **Notes:** the preview block uses `font-family: app.fontNovel`. Optional assertion: preview computed style.

### T04. Preview block reflects current novel font + size

- **Status:** [ ] TODO
- **Goal:** the `.preview` div renders `settings.font.preview` text using `app.fontNovel` family at `app.fontNovelSize` px.
- **Steps:** set novel size to e.g. 22.
- **Expected:** `getComputedStyle(.preview).fontSize === '22px'`.

### T05. Custom fonts install via Rust command

- **Status:** [x] covered by [`custom-fonts.spec.ts › "install_font registers the family and read_custom_font returns bytes"`](../flows/custom-fonts.spec.ts)

### T06. Custom fonts removal via Rust command

- **Status:** [x] covered by [`custom-fonts.spec.ts › "remove_custom_font drops the entry from the list"`](../flows/custom-fonts.spec.ts)

### T07. Installed font surfaces as chip + appears in picker options

- **Status:** [ ] TODO
- **Goal:** after `install_font`, the custom-fonts chip list shows the family and the UI / Novel `FontPicker` options gain a `<family> (custom)` entry.
- **Steps:**
  1. `invokeCmd(app, 'install_font', { srcPath: ... })` against a temp TTF.
  2. Open Settings → Typography.
- **Expected:**
  - `[data-test="custom-fonts-list"]` contains a `.font-chip` with the family name.
  - Open UI font picker, find `<family> (custom)` option.
- **Selectors:** `[data-test="custom-fonts-list"]`, `.font-chip`, `[data-test="custom-fonts-install"]`, `[data-test="custom-font-remove"][data-font-filename]`.
- **Notes:** clean up in `afterEach` via `remove_custom_font`.

### T08. Remove-chip button calls `remove_custom_font` and drops the chip

- **Status:** [ ] TODO
- **Goal:** clicking `.font-del` calls Rust and removes the chip from the list (and from picker options).
- **Steps:**
  1. Pre-install a font via command.
  2. Click `[data-test="custom-font-remove"][data-font-filename="<file>"]`.
- **Expected:**
  - Chip disappears.
  - `list_custom_fonts` no longer contains it.
- **Selectors:** as above.

### T09. Install error surfaces inline `.font-error`

- **Status:** [ ] TODO
- **Goal:** if `install_font` rejects (e.g. bad extension), the error string renders in `.font-error`.
- **Notes:** triggering this without the native picker means calling `install_font` against an invalid path then asserting the section's reactive `installError`. May not be reachable through UI since the install button uses `openDialog`. Mark as optional / skip if too invasive.

### T10. Custom-fonts row hidden while searching

- **Status:** [ ] TODO
- **Goal:** the `[data-test="custom-fonts"]` row is gated on `!searching`; should not render while a query is active.
- **Steps:** type `font` (matches the title rows), inspect.
- **Expected:** `[data-test="custom-fonts"]` is NOT in the DOM.

---

## Flow inventory — Data folder section

### D01. Current folder info + chip badge

- **Status:** [ ] TODO
- **Goal:** `getDataFolderInfo` populates `.path-box code` and `.chip` (`default` vs `custom`).
- **Steps:** open Settings → Data folder.
- **Expected:** `code` content equals the active fixtures path; `.chip` text matches `data_folder.chip.default` initially (the test rig points at `tests/fixtures/build/`).
- **Notes:** fixture path is custom per `global-setup.ts`, so chip will probably be `custom` — confirm and assert accordingly. Add `data-test="datafolder-current-path"` for stability.

### D02. Manual apply path via Rust command

- **Status:** [ ] TODO
- **Goal:** setting a new path through `set_data_folder` reflects in the UI.
- **Steps:**
  1. Make a temp dir.
  2. `invokeCmd(app, 'set_data_folder', { path: <tmp> })` (or whatever the command is named; verify).
  3. Reload Data folder section, assert `code` is the temp dir.
- **Expected:** updated path + chip flips to `custom`.
- **Notes:** must restore the fixture path in `afterEach` or the rest of the suite breaks. Coordinate with `global-setup` to know the canonical path.

### D03. Reset to default via Rust command

- **Status:** [ ] TODO
- **Goal:** when `info.is_custom`, the `Reset` button calls `setDataFolder(null)` and clears `is_custom`.
- **Notes:** dangerous in CI — skip unless we have a guaranteed-safe round trip. Tag as `test.fixme` and document why.

### D04. Move data job — start + progress + finalize

- **Status:** [ ] TODO
- **Goal:** start a move via `start_move_data`, listen to `data-move:progress` events, finalize via `finalize_move_data`.
- **Steps:**
  1. Snapshot fixture dir.
  2. `invokeCmd(app, 'start_move_data', { dest: <tmp> })`.
  3. Poll `moveDataStatus()` until status is `done`.
  4. `invokeCmd(app, 'finalize_move_data', { deleteSource: false })`.
- **Expected:**
  - Modal opens with progress bar, percent ticks up.
  - `MoveJobBanner` appears (fixed-position pill) while job is running.
  - After finalize, `getDataFolderInfo().current` matches the new dest.
- **Selectors:** `.modal`, `.bar .fill`, `MoveJobBanner` root (propose `data-test="move-job-banner"`).
- **Notes:** big setup. Move EVERYTHING back to fixtures path in `afterEach` or the rest of the suite breaks.

### D05. Move data — pause / resume

- **Status:** [ ] TODO
- **Goal:** after `pause_move_data`, status becomes `paused`; `start_move_data(dest)` resumes.
- **Notes:** flaky if the fixture is too small (job completes before pause lands). Consider an artificially large temp source. Probably low priority.

### D06. Move data — cancel with delete-partial flag

- **Status:** [ ] TODO
- **Goal:** `cancel_move_data(true)` removes the partial dest dir.
- **Notes:** same caveat as D05.

### D07. MoveJobBanner appears app-wide and routes to Settings on click

- **Status:** [ ] TODO
- **Goal:** banner is rendered outside Settings (any page). Click → `navigate('settings')`.
- **Steps:**
  1. Start a move job.
  2. Navigate to Library.
  3. Confirm the banner is visible.
  4. Click it.
- **Expected:** banner status pill visible while job runs; clicking it lands on Settings page.

---

## Flow inventory — Watch folders section

### W01. Auto-import when PDF dropped into watched dir

- **Status:** [x] covered by [`watch-folder.spec.ts › "dropping a PDF into a watched folder triggers auto-import"`](../flows/watch-folder.spec.ts)

### W02. `listWatchFolders` populates the list on section open

- **Status:** [ ] TODO
- **Goal:** after `add_watch_folder`, opening Settings → Watch folders shows the path in `.list li .path`.
- **Steps:**
  1. `invokeCmd(app, 'add_watch_folder', { path: <tmp> })`.
  2. Open Settings → Watch folders.
- **Expected:**
  - `.list li` contains the path text.
  - Empty-state `.empty` is not rendered.
- **Selectors:** scope inside `[data-test="settings-section-watch"]`. Propose `data-test="watch-folder-item"`.

### W03. Empty state when no folders registered

- **Status:** [ ] TODO
- **Goal:** with zero watch folders, `.empty` shows `settings.watch.none` and `.list` is absent.
- **Steps:** open section against pristine state (any pre-existing must be cleaned first).

### W04. Remove folder via the trash button

- **Status:** [ ] TODO
- **Goal:** clicking `.rm` calls `removeWatchFolder` and the row disappears.
- **Steps:**
  1. Pre-add a folder via command.
  2. Click the row's `.rm` button.
- **Expected:** row gone, `listWatchFolders()` returns `[]`.

### W05. Recent imports banner shows on successful auto-import

- **Status:** [ ] TODO
- **Goal:** `aan:watch-imported` events surface in the `.recent` list (max 5).
- **Steps:**
  1. Add a watch folder.
  2. Drop a PDF.
  3. Wait for event.
- **Expected:** `.recent ul li` with success icon and the message.
- **Notes:** overlaps with W01; could fold into one if `watch-folder.spec.ts` expands.

---

## Flow inventory — Tray section

### TR01. Toggle flips `app.closeToTray` + persists `aan.close_to_tray`

- **Status:** [ ] TODO
- **Goal:** clicking `.toggle` flips state.
- **Steps:**
  1. Read initial `app.closeToTray` (expect default false).
  2. Click toggle.
- **Expected:**
  - Button gets `.on`.
  - `aan-pressed="true"`.
  - `localStorage('aan.close_to_tray') === '1'` (or whatever the store writes).
- **Selectors:** `[data-test="settings-section-tray"] .toggle`. Propose `data-test="tray-toggle"`.

### TR02. Toggle also pushes to backend `app_config.json`

- **Status:** [ ] TODO
- **Goal:** after click, `setCloseToTrayLocal` should have written the backend config (via Rust command if applicable).
- **Steps:** flip, reload, assert state.
- **Notes:** confirm exact backend command in `store/tray.svelte.ts`; if write is async, may need a small poll.

### TR03. Tray section visibility while searching (regression — see S10)

- **Status:** [ ] TODO — **bug check**
- **Goal:** ensure typing a query that matches Tray strings keeps the section visible. See [S10](#s10-traysection-search-gate-regression-test).

---

## Flow inventory — Dictionaries section

### DI01. Install dictionary via Rust command + lookup exact

- **Status:** [x] covered by [`dictionary.spec.ts › "install_dictionary + lookup_term returns the exact match"`](../flows/dictionary.spec.ts)

### DI02. Lookup is case-insensitive + strips punctuation

- **Status:** [x] covered by [`dictionary.spec.ts › "lookup_term strips punctuation and is case-insensitive"`](../flows/dictionary.spec.ts)

### DI03. Lookup returns empty array when no match

- **Status:** [x] covered by [`dictionary.spec.ts › "lookup_term returns empty array when no match"`](../flows/dictionary.spec.ts)

### DI04. Section lists installed dictionaries with entry count + size

- **Status:** [ ] TODO
- **Goal:** after install, opening the section shows `[data-test="dict-list"]` with one `.dict-chip` per dict, displaying `<entries> entries · <fmtBytes>`.
- **Steps:**
  1. Install a 3-entry TSV via command.
  2. Open Settings → Dictionaries.
- **Expected:**
  - `.d-name` = dict name.
  - `.d-meta` text contains `3 entries`.
- **Selectors:** `[data-test="dict-list"]`, `.dict-chip`, `[data-test="dict-remove"][data-dict-filename]`.

### DI05. Section refreshes when opened (`$effect(open)`)

- **Status:** [ ] TODO
- **Goal:** the `$effect(() => { if (open) void refresh(); })` re-runs when the section opens.
- **Steps:**
  1. Open section, install dict via command, collapse, re-expand.
- **Expected:** list updates without a manual reload.

### DI06. Remove dict via trash button

- **Status:** [ ] TODO
- **Goal:** clicking `[data-test="dict-remove"]` calls `removeDictionary` and updates the list.
- **Steps:**
  1. Install + open section.
  2. Click remove.
- **Expected:** chip disappears, `listDictionaries()` returns `[]`.

### DI07. Format hint always renders at section bottom

- **Status:** [ ] TODO
- **Goal:** `.hint` shows the alert-triangle icon + `settings.dicts.format_hint` text.
- **Notes:** low value; consider skipping.

---

## Flow inventory — Backup section

### B01. `create_backup` writes a valid zip

- **Status:** [x] covered by [`backup.spec.ts › "create_backup writes a zip containing the manifest"`](../flows/backup.spec.ts)

### B02. `read_backup_metadata` returns manifest fields

- **Status:** [x] covered by [`backup.spec.ts › "read_backup_metadata returns the manifest fields"`](../flows/backup.spec.ts)

### B03. `read_backup_metadata` rejects non-aan zip

- **Status:** [x] covered by [`backup.spec.ts › "read_backup_metadata rejects a non-aan zip"`](../flows/backup.spec.ts)

### B04. Last-stats banner appears after backup

- **Status:** [ ] TODO
- **Goal:** after `create_backup`, the section renders `.status.ok` with `settings.backup.created` interpolated with file count + bytes.
- **Steps:**
  1. Open Settings → Backup section.
  2. `invokeCmd(app, 'create_backup', { destPath: <tmp> })`.
- **Expected:** `.status.ok` visible (note: the inline message is wired to `lastStats` which is set only when the UI button drives the flow — see notes).
- **Notes:** since the section's `lastStats` is set only inside `doBackup()` after `saveDialog` resolves, an `invokeCmd` route bypasses the UI state. To exercise the banner without the native dialog, we'd need a test seam to set `lastStats` directly, or assert on the lower-level command output instead. Mark as **not directly testable through the UI** until a test seam exists.

### B05. Restore arms via `[data-test="backup-restore-arm"]` then confirms via `-confirm`

- **Status:** [ ] TODO
- **Goal:** verify the two-step confirm UX without actually completing the restore.
- **Steps:**
  1. Bypass the open dialog: set `preview` via test seam OR pre-pick a backup via command + manually set the state. If no seam exists, propose `data-test="backup-restore-arm"` is already there but the picker isn't drivable.
  2. Click arm → assert `.danger` becomes `confirm-row`.
  3. Click cancel ghost → assert it reverts.
- **Expected:** UI state transitions visible. Do NOT click `[data-test="backup-restore-confirm"]` — it would `location.reload()` and wipe the DB.
- **Notes:** needs a test seam to inject `preview` since `pickRestoreFile` requires `openDialog`. Alternative: add a Rust-side `prepare_restore_preview` command callable from tests.

---

## Flow inventory — Reset section

### R01. Reset button shows confirm row on first click

- **Status:** [ ] TODO
- **Goal:** clicking `.action.warn` flips to `.confirm-wrap` with confirm + cancel buttons.
- **Steps:**
  1. Expand Reset section.
  2. Click the warn button.
- **Expected:** confirm wrap visible, original button absent.
- **Selectors:** `.action.warn`, `.confirm-wrap`. Propose `data-test="reset-ask"`, `data-test="reset-confirm"`, `data-test="reset-cancel"`.

### R02. Confirm button clears every `aan.*` localStorage key

- **Status:** [ ] TODO
- **Goal:** clicking `.action.danger` removes every `aan.*` localStorage key and triggers `location.reload()`.
- **Steps:**
  1. Pre-seed `aan.theme=light`, `aan.lang=th`, `aan.fav.type=manga` via `page.evaluate`.
  2. Expand Reset, click ask, click confirm.
- **Expected:**
  - All `aan.*` keys removed (after reload, before the test fixture clears them again).
  - Page reloads — assert via a navigation event listener.
- **Notes:** because `App` fixture clears `aan.*` between tests anyway, the assertion has to land inside the same test before fixture teardown.

### R03. Confirm auto-cancels after 5s timeout

- **Status:** [ ] TODO
- **Goal:** the 5-second timeout reverts `confirmReset` if the user doesn't click.
- **Steps:**
  1. Click ask.
  2. Wait 5.5s.
- **Expected:** confirm wrap gone, warn button back.
- **Notes:** slow test. Could mock timers via `addInitScript`.

### R04. Cancel button reverts confirm state

- **Status:** [ ] TODO
- **Goal:** clicking the small `.confirm-no` aborts the confirm gesture.
- **Steps:** ask → cancel.
- **Expected:** warn button is back; no timer leak.

---

## Coverage summary

- Page shell: 0 covered, 10 TODO (S01–S10).
- General: 0 covered, 2 TODO (G01–G02).
- Appearance: 1 covered, 2 TODO (A01 covered; A02–A03 TODO).
- Typography: 2 covered, 8 TODO (T05–T06 covered; T01–T04, T07–T10 TODO).
- Data folder: 0 covered, 7 TODO (D01–D07).
- Watch folders: 1 covered, 4 TODO (W01 covered; W02–W05 TODO).
- Tray: 0 covered, 3 TODO (TR01–TR03).
- Dictionaries: 3 covered, 4 TODO (DI01–DI03 covered; DI04–DI07 TODO).
- Backup: 3 covered, 2 TODO (B01–B03 covered; B04–B05 TODO).
- Reset: 0 covered, 4 TODO (R01–R04).

Total: **10 covered, 46 TODO across 56 flows.**
