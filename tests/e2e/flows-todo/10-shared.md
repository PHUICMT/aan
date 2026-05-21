# Shared atoms — E2E flow backlog

Cross-references existing specs in [`tests/e2e/flows/`](../flows/). Source: [`docs/ui-review/10-shared.md`](../../../docs/ui-review/10-shared.md), [`src/shared/components/KeyboardShortcuts.svelte`](../../../src/shared/components/KeyboardShortcuts.svelte), [`BackButton`](../../../src/shared/components/BackButton.svelte), [`Placeholder`](../../../src/shared/components/Placeholder.svelte), [`Shimmer`](../../../src/shared/components/Shimmer.svelte), [`Icon`](../../../src/shared/components/Icon.svelte). Tick the `[x]` when a flow is covered by at least one test.

> These components carry no state of their own. Most flows below verify presence + interaction; deeper "does the back stack walk correctly" coverage belongs to page-level specs.

## Flow inventory

### F01. `?` opens the global KeyboardShortcuts dialog

- **Status:** [x] covered by [`keyboard-shortcuts.spec.ts`](../flows/keyboard-shortcuts.spec.ts) › `"? opens shortcuts dialog, Escape closes it"`
- **Notes:** uses literal `KeyboardEvent({key:'?'})` because WebView2 mishandles the Shift+/ chord.

### F02. `Escape` closes the dialog

- **Status:** [x] covered by [`keyboard-shortcuts.spec.ts`](../flows/keyboard-shortcuts.spec.ts) › `"? opens shortcuts dialog, Escape closes it"`

### F03. Dialog backdrop click closes the dialog

- **Status:** [ ] TODO
- **Goal:** the `onBackdrop` handler (which fires only when `e.target === e.currentTarget`) closes the modal.
- **Preconditions:** dialog open.
- **Steps:**
  1. Dispatch `?` to open the dialog.
  2. Click the `.backdrop` at a coordinate outside the `.modal` (e.g. near `(5, 5)`).
  3. Assert `[data-test="shortcuts-dialog"]` removed.
- **Selectors / commands:** propose `data-test="shortcuts-backdrop"` on the `.backdrop` `<div>`.
- **Fixture deps:** none.
- **Notes:** Playwright `locator.click({ position: { x: 5, y: 5 } })`.

### F04. Dialog close (`×`) button closes the dialog

- **Status:** [ ] TODO
- **Goal:** `.close` button calls `onClose`.
- **Preconditions:** dialog open.
- **Steps:**
  1. Open dialog.
  2. Click `[data-test="shortcuts-dialog"] .close` (propose `data-test="shortcuts-close"`).
  3. Assert dialog removed.

### F05. Dialog renders three sections (Global / Manga / Novel)

- **Status:** [ ] TODO
- **Goal:** the three `<section>` blocks render with the catalog from `KeyboardShortcuts.svelte`.
- **Steps:**
  1. Open dialog.
  2. Assert `.section` count === 3.
  3. For each section, assert its `h3` matches the localized title (Global / Manga / Novel) and that at least one `<kbd>` is rendered.
- **Selectors / commands:** propose `data-test="shortcuts-section-global|manga|novel"`.

### F06. Dialog Global section lists `?`, `Esc`, `R`

- **Status:** [ ] TODO
- **Steps:** open dialog; collect the `<kbd>` text under the Global section; assert it contains exactly `?`, `Esc`, `R`.

### F07. Dialog Manga section lists every documented key

- **Status:** [ ] TODO
- **Goal:** verify keys against the source table (`→`, `PgDn`, `Space`, `←`, `PgUp`, `↓`, `↑`, `Home`, `End`, `B`).
- **Steps:** open dialog; assert the union of `<kbd>` texts under Manga matches the expected set.

### F08. Dialog Novel section lists `A−` and `A+`

- **Status:** [ ] TODO
- **Steps:** open dialog; assert Novel section `<kbd>` texts are `A−` and `A+`.

### F09. Dialog footer hint copy renders

- **Status:** [ ] TODO
- **Steps:** open dialog; assert `.foot .hint` text equals `t('shortcuts.hint')`.

### F10. Dialog labels translate when `aan.lang === 'th'`

- **Status:** [ ] TODO
- **Goal:** label strings come through `t()`.
- **Steps:**
  1. Switch language to `th` via sidebar.
  2. Open dialog.
  3. Assert at least one section title text differs from its EN equivalent.
  4. `afterEach`: restore EN.

### F11. Dialog is mounted via portal so it sits above the page

- **Status:** [ ] TODO
- **Goal:** confirm the `use:portal` action moves the backdrop to `<body>` (out of the page-wrap so the page transition doesn't clip it).
- **Steps:**
  1. Open dialog.
  2. Assert `[data-test="shortcuts-dialog"]`'s `closest('.page-wrap')` is null (i.e. detached from the routed page).
- **Notes:** asserts the structural contract, not the visual.

### F12. BackButton in Series Detail returns to Library (default stack)

- **Status:** [x] partly covered by [`navigation.spec.ts`](../flows/navigation.spec.ts) › `"home -> library -> series -> reader -> back chain"` (verifies `detail.back()` lands on `[data-test="library"]`).

### F13. BackButton in Reader returns to Series Detail (not Library)

- **Status:** [x] covered by [`navigation.spec.ts`](../flows/navigation.spec.ts) › `"home -> library -> series -> reader -> back chain"` (asserts `detail.root()` after `reader.back()`).
- **Also asserted by:** [`manga-reader.spec.ts`](../flows/manga-reader.spec.ts) › `"open 1001-ch1 (1 page) and back to series"`.

### F14. BackButton walks Series → Favorites / History / Home depending on `prevPage`

- **Status:** [ ] TODO
- **Goal:** `goBack()` honors the entry point. Verify three branches:
  - From Favorites → click a card → back lands on Favorites.
  - From History → click a row → back lands on History.
  - From Home (any CardRow) → click a card → back lands on Home.
- **Preconditions:** seed a favorite, seed a recent read, and have Home cards available.
- **Steps (per branch):**
  1. Open page X via sidebar.
  2. Click a series card.
  3. Click `[data-test="back"]`.
  4. Assert page X is active again.
- **Selectors / commands:** `[data-test="back"]`.
- **Notes:** the source review confirms `prevPage` is what drives this — single spec with three sub-cases is fine.

### F15. BackButton walks Reader → Home / History / Series depending on `prevPage`

- **Status:** [ ] TODO
- **Goal:** the three entry points to the reader resolve correctly on back.
  - HomeHero `Continue` → reader → back lands on Home.
  - History row → reader → back lands on History.
  - Series Detail chapter → reader → back lands on Series Detail (already F13).
- **Notes:** the first two are not yet asserted. Pair with `02-home.md` F05.

### F16. BackButton renders i18n label

- **Status:** [ ] TODO
- **Goal:** the `<span>` text is `t('series.back')`; switches with language.
- **Steps:** switch to TH, navigate to Series Detail, assert the back button's text matches `t('series.back')` in TH (non-empty + ≠ EN value).

### F17. Placeholder renders title only when subtitle is empty

- **Status:** [ ] TODO
- **Goal:** the `{#if subtitle}` guard is honored.
- **Preconditions:** Placeholder is used by stub pages. Find a route that currently calls it without a subtitle (per source doc, Downloads is the example) — if none in current build, this becomes a unit-test candidate.
- **Steps:** navigate to a Placeholder-backed route; assert exactly one `<h1>` and zero `<p>`.
- **Notes:** if Placeholder isn't reachable from any route in the current Aan build, drop this flow and cover via component unit test instead.

### F18. Placeholder title applies the gradient heading style

- **Status:** [ ] TODO (visual regression candidate)
- **Goal:** `background-clip: text` + the `--heading-grad-*` tokens are applied.
- **Steps:** open a Placeholder route; capture `getComputedStyle(h1)` and assert `background-clip` includes `text`.
- **Notes:** visual baseline (`toHaveScreenshot`) is more meaningful here — flag for the screenshots suite when it's added.

### F19. Shimmer is mounted during Home loading phase

- **Status:** [ ] TODO
- **Goal:** verify shimmers actually render (not just exist as a class).
- **Preconditions:** Home with delayed data — if the suite's fixture catalog resolves too fast, this is hard to catch.
- **Steps:**
  1. On fresh load, expect `.shimmer` count > 0 inside Home's `.skel-*` containers within ~50 ms.
  2. Assert each `.shimmer` has the `.band` child (the animated overlay).
- **Selectors / commands:** propose `data-test="shimmer"` on the `.shimmer` div.
- **Notes:** flaky if data resolves before assertion — consider an artificial delay in test mode via a fixture flag.

### F20. Shimmer band animates (`shimmer-sweep` keyframes)

- **Status:** [ ] TODO (visual)
- **Goal:** assert `getComputedStyle(.band).animationName === 'shimmer-sweep'`.
- **Notes:** purely a regression guard against losing the animation rule.

### F21. Icon renders a path for known names

- **Status:** [ ] TODO
- **Goal:** every icon used by NAV_ITEMS + window controls resolves to a non-empty path.
- **Steps:**
  1. Capture the `innerHTML` of each sidebar nav `.icon` `<svg>`.
  2. Assert each is non-empty.
- **Notes:** guards against an `Icon name="<typo>"` regression. Optionally extend to titlebar + tray icons.

### F22. Icon renders empty SVG for unknown names (defensive)

- **Status:** [ ] TODO (low value)
- **Goal:** documents the `ICON_PATHS[name] ?? ''` fallback so it doesn't throw.
- **Steps:** unit test against the component (not e2e). Drop from e2e backlog if a component test suite already exists.

### F23. Icon size prop controls width/height

- **Status:** [ ] TODO (component test)
- **Goal:** verify `width={size}` + `height={size}` are applied.
- **Notes:** belongs in `tests/setup.ts` / Vitest, not Playwright. Listed here only for completeness of the source doc.

### F24. Icon catalogue regression — every icon name referenced in the app exists in `icons.ts`

- **Status:** [ ] TODO (build-time / lint candidate)
- **Goal:** prevent `Icon name="foo"` where `foo` is missing.
- **Notes:** better solved with a TS literal-union type on the `name` prop than an e2e test. Flag for the lint/typecheck pass; drop from the e2e backlog if rejected.

## State touched (no new keys)

These atoms read `app.shortcutsOpen`, `app.page`, `t()` lookups (driven by `aan.lang`), and CSS tokens from `aan.theme`. No flow below writes new persisted state.
