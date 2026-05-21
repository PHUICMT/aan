# E2E flow backlog

Comprehensive inventory of every user-visible flow in Aan, mapped against existing specs in [`tests/e2e/flows/`](flows/). Use this as the source of truth for what e2e covers and what's outstanding.

| # | Area | File | Total | Covered | TODO |
|---|------|------|------:|--------:|-----:|
| 01 | App shell (TitleBar, Sidebar, TrayMenu, routes) | [flows-todo/01-shell.md](flows-todo/01-shell.md) | 37 | 6 | 31 |
| 02 | Home (Hero, Continue, QuickChips, Stats, RandomPick) | [flows-todo/02-home.md](flows-todo/02-home.md) | 46 | 4 | 42 |
| 03 | Library (filters, search, view modes, select, virtual grid) | [flows-todo/03-library.md](flows-todo/03-library.md) | 113 | 15 | 98 |
| 04 | Library modals (Import / BulkEdit / Collections) | [flows-todo/04-library-modals.md](flows-todo/04-library-modals.md) | 83 | 10 | 73 |
| 05 | Series detail (chapters, edit, bulk-select) | [flows-todo/05-series-detail.md](flows-todo/05-series-detail.md) | 42 | 8 | 34 |
| 06 | Reader — manga (toolbar, modes, bookmarks, tap zones) | [flows-todo/06-reader-manga.md](flows-todo/06-reader-manga.md) | 57 | 2 | 55 |
| 07 | Reader — novel (layout, theme, find, annotations, dictionary) | [flows-todo/07-reader-novel.md](flows-todo/07-reader-novel.md) | 56 | 13 | 43 |
| 08 | Favorites / History / Reading List | [flows-todo/08-favorites-history-list.md](flows-todo/08-favorites-history-list.md) | 30 | 0 | 30 |
| 09 | Settings (10 sections + search + move-job banner) | [flows-todo/09-settings.md](flows-todo/09-settings.md) | 56 | 10 | 46 |
| 10 | Shared atoms (Shortcuts dialog, BackButton, Placeholder, Shimmer, Icon) | [flows-todo/10-shared.md](flows-todo/10-shared.md) | 24 | 4 | 20 |
| **Σ** | — | — | **544** | **72** | **472** |

> Counts are derived from the `**Status:** [x|]` markers in each file (see `tests/e2e/flows-todo/*.md`).

## How to read a flow entry

Each flow follows one template — see [the template excerpt](#flow-template) below. The pattern is:

- **Status** — `[x] covered by spec-file › "test title"` OR `[ ] TODO`
- **Goal** — the user-facing intent
- **Preconditions** — fixture state required (which fixture series, localStorage flags, app config, etc.)
- **Steps** — what the test does, step by step
- **Expected** — assertions
- **Selectors / commands** — `[data-test=…]` for clicks, `invokeCmd(app, '…', …)` for Rust-driven setup/verification
- **Fixture deps** — any new fixture file or seed row beyond the existing 6-series catalog
- **Notes** — transition timing, native-dialog blockers, race conditions

## Before writing the missing specs

Three pieces of preparation will make ~80 % of the TODO flows trivially writable. They're all collected in [fixtures-needed.md](fixtures-needed.md):

1. **`data-test` hooks** that need to be added to a handful of Svelte components first (filter sort menu, genre pills, bulk fields, reader toolbar/menus, novel settings, settings sections, etc.). Each per-area file lists its proposed additions in a "Selectors / commands needed" section near the bottom.
2. **New fixture files** — at least `tests/fixtures/build/import-samples/sample.epub` and a larger 250+ series synthetic catalog for VirtualGrid coverage.
3. **Test-seam Rust commands** for paths that today go through a native dialog (font install, dictionary install, backup restore, data-folder move). The existing specs already use this pattern via `import_pdf` / `install_font` / `install_dictionary` — extend the pattern where flagged.

## Conventions

- **Tests run serially** (`workers: 1`) against a single Tauri window attached over CDP. See [tests/e2e/README.md](README.md) for the harness.
- **State isolation:** every test starts with `aan.*` localStorage cleared and the page reloaded.
- **Mutating tests** must clean up in `afterEach` — delete any series they created via `delete_series_force`, restore renamed fields, drop tmp dirs.
- **Native dialogs** (file picker, save dialog) cannot be driven from Playwright — bypass via the corresponding Rust command (`import_pdf`, `install_font`, `install_dictionary`, `save_text_file`, etc.) and assert through the side-effects.
- **Gesture-only flows** (text selection, double-click word selection, drag-and-drop) need Rust-command surrogates — flagged inline in each file.

## Flow template

```markdown
### F<NN>. <Short imperative title>

- **Status:** [ ] TODO
- **Goal:** what the user is trying to do
- **Preconditions:** fixture state required
- **Steps:**
  1. ...
  2. ...
- **Expected:**
  - assertion 1
  - assertion 2
- **Selectors / commands:** `[data-test=…]` for clicks, `invokeCmd(app, '…', …)` for Rust-driven setup/verification
- **Fixture deps:** any new fixture file or seed row needed
- **Notes:** any gotchas
```

## Areas in highest need

Sorted by `TODO / total` ratio (worst first):

| Area | TODO % | Comment |
|------|-------:|---------|
| Favorites / History / Reading List | 100 % | No dedicated specs exist yet |
| Reader (manga) | 96 % | Only smoke tests cover the page |
| Library | 87 % | Filter math, view modes, virtualization all uncovered |
| Library modals | 88 % | Import progress/summary, BulkEdit edge cases, Save-collection modal |
| Home | 91 % | Only `pick-random` exists |
| Shell (TitleBar, TrayMenu) | 84 % | Window-control buttons + tray have no specs |
| Series detail | 81 % | Bulk-select skeleton + chapter-row context actions |
| Settings | 82 % | Most sections have one happy-path test, edge cases missing |
| Novel reader | 77 % | Find bar, outline panel, dictionary popup UI, theme swatches |
| Shared atoms | 83 % | Backdrop close, body-scroll lock, hover transition |

## Suggested ramp

If you can't tackle all 472 at once, the ranking that pays back fastest:

1. **Add the proposed `data-test` hooks** to the components flagged in each file's "Selectors / commands needed" section — pure refactor, no logic risk, unlocks ~60 % of TODOs.
2. **Library + Library modals** (196 flows, 13 covered) — this is the most-used surface and the easiest to drive (no reader gesture limitations).
3. **Reader (manga + novel)** — every keyboard shortcut + every settings-menu row needs at least one assertion.
4. **Settings** — finish the regression net around the search-gate bug and the section-search hiding behaviour (see `09-settings.md` F-S10).
5. **Favorites / History / Reading List** — start from zero, seed everything via Rust commands per flow.
