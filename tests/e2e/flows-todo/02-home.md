# Home — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Source: [`docs/ui-review/02-home.md`](../../../docs/ui-review/02-home.md), [`src/features/home/`](../../../src/features/home/). Tick the `[x]` when a flow is covered by at least one test.

## Flow inventory

### F01. Home renders the loading skeleton then the live phase

- **Status:** [ ] TODO
- **Goal:** `loading=true` shows shimmers; resolves to the populated phase.
- **Preconditions:** fixture catalog seeded.
- **Steps:**
  1. Navigate to Home.
  2. Assert `.skel-hero`, `.skel-chips`, `.skel-stats`, `.skel-heatmap` shimmers exist initially.
  3. Wait for the live phase (e.g. `[data-test="home-pick-random"]` visible).
  4. Assert skeleton elements have been removed.
- **Selectors / commands:** propose `data-test="home-skeleton"` wrapping the skeleton phase. `[data-test="home-pick-random"]` already exists.
- **Fixture deps:** none.
- **Notes:** the skeleton fades out over 160 ms — use `waitFor` rather than asserting immediately.

### F02. Header greeting + subtitle render with i18n strings

- **Status:** [ ] TODO
- **Goal:** verify `home.title` + `home.sub` lookups.
- **Steps:**
  1. Read `.hero-head h1` text — expect non-empty, matches `t('home.title')` in EN.
  2. Switch lang to TH via Settings (`[data-test="lang-th"]` inside General section).
  3. Assert text changes.
  4. Restore EN.
- **Notes:** thin layer over i18n, but verifies header renders.

### F03. HomeHero appears when `listRecentReads` returns at least one entry

- **Status:** [ ] TODO
- **Goal:** the hero card is conditional on `recent.length > 0`.
- **Preconditions:** seed a recent read for fixture series 1001 via `invokeCmd(app, 'record_read', { pid: 1001, chapter_id: '1001-ch1', last_page: 5 })` (verify command name in `src-tauri/`). `afterEach` removes the row.
- **Steps:**
  1. Confirm via `invokeCmd(app, 'list_recent_reads', { limit: 7 })` that at least one row exists.
  2. Navigate to Home.
  3. Assert `.hero-card` (propose `data-test="home-hero"`) visible.
- **Expected:**
  - Hero shows series name, chapter no, page progress, accent CTA pill.
- **Fixture deps:** needs a "seed recent read" command. If absent, drive UI: open the chapter through Library → Reader, back to Home.
- **Notes:** the doc warns `recent` is deduped by pid — see F06.

### F04. HomeHero is hidden when there are no recent reads

- **Status:** [ ] TODO
- **Goal:** absence of recents removes the hero card.
- **Preconditions:** wipe history (`invokeCmd(app, 'clear_history')` or per-row deletes). Use a fresh fixture pid that has never been read.
- **Steps:**
  1. Ensure `list_recent_reads(7)` returns `[]`.
  2. Visit Home.
  3. Assert hero card is not in the DOM.
  4. Assert empty-state copy renders when favorites are also empty (see F22).
- **Notes:** consider a `tests/fixtures/build-empty/` snapshot for clean-slate flows.

### F05. HomeHero click resumes reading via `resumeRecent`

- **Status:** [ ] TODO
- **Goal:** clicking the hero card lands on the reader at the right chapter.
- **Preconditions:** F03's seeded recent read pointing at `1001-ch1`.
- **Steps:**
  1. Visit Home.
  2. Click `.hero-card` (propose `data-test="home-hero"`).
  3. Wait for reader to mount.
- **Expected:**
  - Reader is open on chapter `1001-ch1`.
- **Selectors / commands:** propose `data-test="home-hero"` on the `<button>` in `HomeHero.svelte`.

### F06. HomeHero falls back to Series Detail when `listChapters` fails

- **Status:** [ ] TODO (low priority; failure path)
- **Goal:** `resumeRecent` catch block calls `openSeries(pid)`.
- **Preconditions:** mock `list_chapters` to throw via `invokeCmd(app, 'force_command_failure', ...)` if available, _or_ delete the chapter row before clicking.
- **Steps:** click hero, assert Series Detail mounts.
- **Notes:** likely too invasive — flag for manual review unless a generic command-error hook is added.

### F07. HomeHero progress bar width matches `last_page_read / page_count`

- **Status:** [ ] TODO
- **Goal:** verify `pct` calc inside `HomeHero.svelte`.
- **Steps:**
  1. Seed a recent read with `last_page=5`, `page_count=20`.
  2. Inspect `.hero-progress-fill` computed `width` — expect `25%`.
- **Selectors / commands:** propose `data-test="home-hero-progress"` on `.hero-progress-fill`.

### F08. HomeHero handles `page_count === 0` gracefully

- **Status:** [ ] TODO
- **Goal:** divide-by-zero guard renders `0%` progress (note from source review).
- **Preconditions:** seed a recent read with `page_count=0`.
- **Notes:** also surfaces the "12/0 pages" display nit flagged in source.

### F09. QuickChips: Surprise me cycles a different pick across rerolls and Read lands on series

- **Status:** [x] covered by [`pick-random.spec.ts`](../flows/pick-random.spec.ts) › `"pick random opens modal, reroll changes content, read opens series"`

### F10. QuickChips: Surprise me disabled while busy

- **Status:** [ ] TODO
- **Goal:** the `disabled={randomBusy}` attribute fires.
- **Steps:**
  1. Click `[data-test="home-pick-random"]` rapidly twice within 50 ms.
  2. Assert only one modal mounted (`[data-test="random-modal"]` count is 1).
- **Notes:** depends on `listLocalSeries` taking long enough that the second click hits the `randomBusy` gate. Test may need to wrap the command with an artificial delay; otherwise flag as flaky and skip.

### F11. QuickChips: Favorites chip routes to Favorites page

- **Status:** [ ] TODO
- **Steps:** click the Favorites chip, assert Favorites page root visible (propose `data-test="favorites"`).
- **Selectors / commands:** propose `data-test="home-chip-favorites"`.

### F12. QuickChips: Library chip routes to Library

- **Status:** [ ] TODO
- **Steps:** click Library chip, assert `[data-test="library"]` visible.
- **Selectors / commands:** propose `data-test="home-chip-library"`.

### F13. QuickChips: History chip routes to History

- **Status:** [ ] TODO
- **Steps:** click History chip, assert History page root visible (propose `data-test="history"`).
- **Selectors / commands:** propose `data-test="home-chip-history"`.

### F14. StatsBoard renders KPIs when `reading.total_read > 0`

- **Status:** [ ] TODO
- **Goal:** the three KPI tiles (Streak, Today, This week) render.
- **Preconditions:** seed enough reading_history rows to push `total_read > 0`. If a command exists (`invokeCmd(app, 'seed_reading_stats', { ... })`), use it; otherwise drive UI to read a chapter.
- **Steps:**
  1. Visit Home.
  2. Assert `.kpi.streak` visible; numbers are non-empty.
  3. Assert 3 `.kpi` tiles in `.kpis`.
- **Selectors / commands:** propose `data-test="stats-kpi-streak|today|week"`.

### F15. StatsBoard is hidden when `total_read === 0`

- **Status:** [ ] TODO
- **Steps:** with empty history, visit Home, assert `.stats-board` not present.

### F16. StatsBoard heatmap shows 26 columns × 7 rows; future cells are transparent

- **Status:** [ ] TODO
- **Goal:** the `grid` derivation produces the right shape.
- **Steps:**
  1. Visit Home (with stats seeded).
  2. Assert `.heatmap .col` count === 26.
  3. Assert each column has 7 `.cell` children.
  4. Assert cells past today carry the `.future` class.
- **Selectors / commands:** propose `data-test="stats-heatmap"`.

### F17. StatsBoard top-week list renders cards from `topSeriesWeek(5)`

- **Status:** [ ] TODO
- **Preconditions:** seed at least one row with `seconds > 0` this week.
- **Steps:** assert ≤5 `.top-item` rows; each has rank, name, minutes badge.

### F18. StatsBoard top-week empty state shows muted copy

- **Status:** [ ] TODO
- **Steps:** with no plays this week, assert `.top-empty` shows `t('home.stats.top_empty')`.

### F19. StatsBoard top-week row click opens Series Detail

- **Status:** [ ] TODO
- **Steps:**
  1. Seed a top-week entry for series 1001.
  2. Click the row.
  3. Assert Series Detail for 1001 mounts.
- **Selectors / commands:** propose `data-test="stats-top-item"` per row, keyed by pid.

### F20. ContinueRow renders only when `restRecent.length > 0` (i.e. ≥2 distinct recent series)

- **Status:** [ ] TODO
- **Goal:** section header `CONTINUE` and grid render when there are ≥2 recents.
- **Preconditions:** seed recents for 2 different pids.
- **Steps:** assert `.continue-row` visible with N cards matching `restRecent`.
- **Selectors / commands:** propose `data-test="home-continue"`, `data-test="home-continue-card"`.

### F21. ContinueRow `See all` routes to History

- **Status:** [ ] TODO
- **Steps:** click `.more` in the ContinueRow header. Assert History mounts.
- **Selectors / commands:** propose `data-test="home-continue-see-all"`.

### F22. ContinueRow card click resumes the chapter

- **Status:** [ ] TODO
- **Steps:** click a card; assert reader mounts on that chapter id.

### F23. CardRow — Favorites — renders when favorites exist; click opens series

- **Status:** [ ] TODO
- **Preconditions:** mark a fixture series as favorite (`invokeCmd(app, 'set_favorite', { pid: 1001, value: true })`).
- **Steps:**
  1. Visit Home.
  2. Assert `t('home.favorites')` header visible.
  3. Click first card; assert Series Detail mounts.
  4. `afterEach`: unset favorite.
- **Selectors / commands:** propose `data-test="home-row-favorites"` and `data-test="home-card-<pid>"`.

### F24. CardRow — Favorites — "See all" routes to Favorites

- **Status:** [ ] TODO
- **Steps:** click `.more` in the Favorites row → Favorites page.

### F25. CardRow — Abandoned — renders dimmed style + hint label

- **Status:** [ ] TODO
- **Preconditions:** seed a series with `last_read_at` older than 30 days. Likely needs `invokeCmd(app, 'set_last_read_at', ...)` or direct SQL via a test command.
- **Steps:**
  1. Visit Home.
  2. Assert `.abandoned-card` class on the cards in the row.
  3. Assert `.more.muted` hint copy renders (no link).
- **Notes:** seed mechanism is the blocker — flag fixture work.

### F26. CardRow — Abandoned — card click opens Series Detail

- **Status:** [ ] TODO
- **Steps:** click first abandoned card, assert series mounts.

### F27. CardRow — Recently Added — renders + "See all" → Library

- **Status:** [ ] TODO
- **Goal:** `listRecentlyAdded(6)` populates the row; `See all` routes to Library.
- **Preconditions:** fixture catalog provides ≥1 recently-added series (timestamps already in seed).
- **Steps:**
  1. Visit Home.
  2. Assert row header `t('home.recently_added')` visible.
  3. Click `See all`; assert `[data-test="library"]` mounts.

### F28. Empty home: no hero + no favorites shows the empty-state block

- **Status:** [ ] TODO
- **Preconditions:** start from `tests/fixtures/build-empty/` (or wipe via cleanup commands).
- **Steps:**
  1. Visit Home.
  2. Assert `.empty` block visible with `t('home.empty')` + `t('home.empty.hint')`.
- **Selectors / commands:** propose `data-test="home-empty"`.

### F29. RandomPickModal opens with `[data-test="random-modal"]` and a picked series

- **Status:** [x] partly covered by [`pick-random.spec.ts`](../flows/pick-random.spec.ts) (modal visibility + reroll). Full coverage of close paths below.

### F30. RandomPickModal — `×` close button cancels and returns to Home

- **Status:** [ ] TODO
- **Goal:** `[data-test="random-cancel"]` clears `pickedSeries`.
- **Steps:**
  1. Open modal via Surprise me.
  2. Click `[data-test="random-cancel"]`.
  3. Assert modal removed from DOM (after the 160 ms out-transition — `waitFor` or `.last()` pattern).
- **Selectors / commands:** `[data-test="random-cancel"]`.

### F31. RandomPickModal — click outside the card cancels

- **Status:** [ ] TODO
- **Goal:** the overlay-only handler (`e.target === e.currentTarget`) closes the modal.
- **Steps:**
  1. Open modal.
  2. Click outside the `.pick-card` (e.g. coordinate near a corner of the viewport).
  3. Assert modal closes.
- **Notes:** Playwright `app.locator('[data-test="random-modal"]').click({ position: { x: 5, y: 5 } })`.

### F32. RandomPickModal — Escape key cancels

- **Status:** [ ] TODO
- **Steps:** open modal, press Escape, assert closed.
- **Notes:** confirms `onPickKey` Escape branch (svelte:window).

### F33. RandomPickModal — Enter key opens picked series

- **Status:** [ ] TODO
- **Steps:**
  1. Open modal.
  2. Read picked name via `[data-test="random-name"]`.
  3. Press Enter.
  4. Assert Series Detail for that pid mounts.
- **Selectors / commands:** `[data-test="random-name"]`.

### F34. RandomPickModal — `r`/`R` reroll cycles content

- **Status:** [x] partly covered by [`pick-random.spec.ts`](../flows/pick-random.spec.ts) (uses button click). Add: dispatch the literal `r` keydown and confirm name changes within 5 tries.
- **Status:** [ ] TODO (key-driven variant)

### F35. RandomPickModal — Read button opens series and clears modal

- **Status:** [x] covered by [`pick-random.spec.ts`](../flows/pick-random.spec.ts) (`await home.readPicked()` + Series Detail assertion).

### F36. RandomPickModal — Reroll disabled when only one series exists

- **Status:** [ ] TODO
- **Goal:** `canReroll === false` (i.e. `allSeriesCache.length <= 1`) disables the button.
- **Preconditions:** fixture catalog reduced to 1 series. Either:
  - Build a tiny fixture (`tests/fixtures/build-one/`) and point the app at it via a per-spec `global-setup` override.
  - _Or_ delete 5 of the 6 fixture series in `beforeEach` and restore in `afterEach` (heavy).
- **Steps:**
  1. Open modal.
  2. Assert `[data-test="random-reroll"]` has `disabled` attribute.
- **Selectors / commands:** `[data-test="random-reroll"]`.

### F37. RandomPickModal — `r`/`R` while open also triggers global `resumeLastReader` (latent bug)

- **Status:** [ ] TODO
- **Goal:** document the conflict flagged in the source review notes.
- **Preconditions:** `app.lastReader` is set.
- **Steps:**
  1. Open modal.
  2. Press `r`.
  3. Assert both: picked name changed _and_ reader mounted under/over the modal.
- **Notes:** asserts the current buggy behavior so a future fix has a test to flip.

### F38. ContinuePill renders on non-reader pages when `app.lastReader` is set

- **Status:** [ ] TODO
- **Preconditions:** seed `lastReader`.
- **Steps:** visit Home, Library, Settings; assert pill visible on each.
- **Selectors / commands:** propose `data-test="continue-pill"` on the `.pill` root.

### F39. ContinuePill is hidden while on Reader page

- **Status:** [ ] TODO
- **Steps:** open a chapter, assert pill not in DOM.

### F40. ContinuePill main button resumes via `resumeLastReader`

- **Status:** [ ] TODO
- **Preconditions:** seed `lastReader`.
- **Steps:**
  1. From Home, click `[data-test="continue-pill"] .main` (propose `data-test="continue-resume"`).
  2. Assert reader mounts on the right chapter.

### F41. ContinuePill close (×) collapses the pill (not persisted)

- **Status:** [ ] TODO
- **Goal:** `dismissContinue()` flips to `.collapsed` style.
- **Steps:**
  1. Click `[data-test="continue-pill"] .close` (propose `data-test="continue-close"`).
  2. Assert pill element gains `.collapsed` class.
  3. Reload; assert pill is back to expanded (in-memory only).
- **Notes:** documents the source-doc finding that dismissal does not persist.

### F42. Collapsed ContinuePill click restores it (does not navigate)

- **Status:** [ ] TODO
- **Goal:** in collapsed state, clicking `.main` calls `restoreContinue` instead of `onResume`.
- **Steps:**
  1. Dismiss the pill (F41).
  2. Click `.main`.
  3. Assert `.collapsed` class is removed and `app.page` is unchanged.

### F43. ContinuePill cover backfills via `getSeries` when `seriesName/kind` missing

- **Status:** [ ] TODO
- **Goal:** the `$effect` in `ContinuePill.svelte` repopulates the lastReader entry.
- **Preconditions:** seed `aan.last_reader` with `seriesName=''` and `kind=''` for a known pid via localStorage.
- **Steps:**
  1. Reload app.
  2. After a short wait, assert `.name` text is non-empty (matches the fixture series name).
  3. Assert `localStorage.getItem('aan.last_reader')` now contains the populated `seriesName`.

### F44. Global `r` shortcut on Home triggers `resumeLastReader` (not a RandomPickModal key)

- **Status:** [ ] TODO
- **Goal:** outside the modal, `r` still works as the App-level shortcut.
- **Preconditions:** `app.lastReader` set; Home active.
- **Steps:** press `r`; assert reader mounts. (Same flow as `01-shell.md` F24 but anchored at Home as the source doc emphasizes.)

### F45. Home one-shot fetches do not auto-refresh on `seriesMutationTick`

- **Status:** [ ] TODO (documentation test)
- **Goal:** verify the source-doc note: Home does NOT refresh recent / favorites / abandoned / recentlyAdded while mounted.
- **Steps:**
  1. Visit Home.
  2. Snapshot favorites card count.
  3. Mutate via `invokeCmd(app, 'set_favorite', ...)` for a new pid.
  4. Wait 500 ms.
  5. Assert favorites card count unchanged on Home (until a remount).
- **Notes:** lock in current behavior so a future "live refresh" change comes with an intentional test flip.
