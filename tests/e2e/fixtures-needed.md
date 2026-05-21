# Fixture + test-seam prep for the E2E backlog

Before writing the ~472 TODO flows in [TEST_FLOWS.md](TEST_FLOWS.md), three preparation steps unblock the majority of them. Tackle in order.

---

## 1. `data-test` hooks to add to Svelte components

Each per-area flow file ends with a "Selectors / commands needed (proposed additions)" section listing the exact attribute name + component to add. Aggregate below.

### Shell — [01-shell.md](flows-todo/01-shell.md)

- `title-drag` on the drag region of `TitleBar.svelte`
- `title-brand` on the brand area
- `tray-menu-root`, `tray-menu-show`, `tray-menu-quit` on `TrayMenu.svelte`
- `lang-toggle`, `lang-{en,th}` (added in this pass)

### Home — [02-home.md](flows-todo/02-home.md)

- `home-hero`, `home-resume`, `home-continue-row`, `home-card-row-{key}`
- `continue-pill`, `continue-pill-dismiss`
- `random-reroll`, `random-close`, `random-skip-read`
- `quick-chip-{id}`
- `stats-week-card`, `stats-streak-card`, `stats-heatmap-cell-{date}`

### Library — [03-library.md](flows-todo/03-library.md)

- `library-sort-menu`, `library-sort-{key}`
- `library-filters-disclosure`, `library-filter-dl-{value}`, `library-filter-rs-{value}`
- `library-genre-pill-{name}`, `library-genre-combo-{or|and}`, `library-genre-clear`
- `library-view-{grid|compact|list}`
- `library-chapter-search-toggle`, `library-chapter-search-input`
- `library-bulk-bar`, `library-bulk-edit`, `library-bulk-delete`, `library-bulk-clear`
- `cover-card-context-menu`, `cover-card-context-{action}`

### Library modals — [04-library-modals.md](flows-todo/04-library-modals.md)

- `import-menu-pdf`, `import-menu-cbz`, `import-menu-epub`, `import-menu-imgfolder`, `import-menu-txt`
- `import-progress`, `import-progress-bar`, `import-progress-current`
- `import-summary`, `import-summary-duplicates`, `import-summary-close`
- `bulk-edit-author`, `bulk-edit-artist`, `bulk-edit-status`, `bulk-edit-reading-status`, `bulk-edit-add-tag`, `bulk-edit-remove-tag`
- `bulk-edit-delete-arm`, `bulk-edit-delete-confirm`, `bulk-edit-cancel-confirm`
- `collection-save-name`, `collection-save-confirm`, `collection-chip-{id}`, `collection-chip-delete-{id}`

### Series detail — [05-series-detail.md](flows-todo/05-series-detail.md)

- `series-folder`, `series-select-toggle`, `series-select-exit`
- `series-edit-alias`, `series-edit-author`, `series-edit-artist`, `series-edit-info`, `series-edit-status`, `series-edit-replace-cover`
- `series-edit-delete-arm`, `series-edit-delete-cancel`, `series-edit-delete-confirm`
- `chapter-delete-{id}`, `chapter-delete-confirm-{id}`, `chapter-convert-{id}`, `chapter-convert-confirm-{id}`
- `series-bulk-bar`, `series-bulk-clear`

### Manga reader — [06-reader-manga.md](flows-todo/06-reader-manga.md)

- `reader-mode-cycle`, `reader-fit-cycle`, `reader-zoom-in`, `reader-zoom-out`, `reader-zoom-reset`
- `reader-bm-toggle`, `reader-bm-list-toggle`, `reader-bm-item-{id}`, `reader-bm-delete-{id}`
- `reader-settings-toggle`, `reader-mode-{paged|continuous|spread}`, `reader-bg-toggle`, `reader-anim-toggle`, `reader-rtl-toggle`, `reader-spread-solo`, `reader-dpage-cycle`, `reader-dpage-cover-solo`, `reader-immersive-toggle`
- `reader-tap-left`, `reader-tap-right`

### Novel reader — [07-reader-novel.md](flows-todo/07-reader-novel.md)

- `novel-prev-ch`, `novel-next-ch`
- `novel-find-open`, `novel-find-input`, `novel-find-next`, `novel-find-prev`, `novel-find-close`, `novel-find-case`
- `novel-outline-open`, `novel-outline-close`, `novel-outline-item-{anchor}`
- `novel-anno-panel-open`, `novel-anno-panel-close`, `novel-anno-row-{id}`, `novel-anno-export`
- `novel-dict-popup`, `novel-dict-close`
- `novel-font-smaller`, `novel-font-larger`, `novel-lineheight-{dec|inc}`, `novel-maxwidth-{dec|inc}`

### Favorites / History / Reading List — [08-favorites-history-list.md](flows-todo/08-favorites-history-list.md)

- `favorites-page`, `favorites-empty`, `favorites-type-{id}`, `favorites-tag-{name}`, `favorites-combo-{or|and}`, `favorites-clear-tags`
- `history-tab-{kind}`, `history-row-{id}`
- `list-search`, `list-view-{grid|compact|list}`

### Settings — [09-settings.md](flows-todo/09-settings.md)

- `settings-search`, `settings-expand-all`, `settings-collapse-all`
- Section headers: `settings-section-{id}` already present
- `font-picker-ui`, `font-picker-novel`, `font-install`, `font-remove-{family}`
- `tray-toggle`
- `watch-folder-add`, `watch-folder-item-{path}`, `watch-folder-remove-{path}`
- `backup-create`, `backup-read`, `backup-restore-arm`, `backup-restore-confirm`
- `dict-install`, `dict-remove-{name}`
- `reset-ask`, `reset-confirm`
- `data-folder-set`, `data-folder-move`, `data-folder-cancel`
- `move-job-banner`

### Shared — [10-shared.md](flows-todo/10-shared.md)

- `shortcuts-dialog`, `shortcuts-backdrop`, `shortcuts-close`
- `back-button` (BackButton)

---

## 2. New fixture files

The current synthetic catalog (`tests/fixtures/build/`) has 6 series + 10 chapters + 1 sample PDF + 1 sample CBZ + 1 sample TXT. The TODO flows need a few extras.

### Required additions

| File / seed | Used by | Notes |
|---|---|---|
| `tests/fixtures/build/import-samples/sample.epub` | `04-library-modals.md` F22-F27 (EPUB import path) | A valid mini-EPUB: container.xml + content.opf + nav.xhtml + 2 chapter xhtml + 1 cover image. Generate via `generate.ts` or hand-craft once and check in. |
| Large catalog seed (~250 series) | `03-library.md` F95 (VirtualGrid viewport math) | Add a `generate.ts` flag `--large` that produces a separate `tests/fixtures/build-large/` and a `test.use({ largeCatalog: true })` fixture to point `app_config.json` at it. |
| Genre-tagged series | `03-library.md` F70-F75 (genre pills + OR/AND combo) | Extend the existing 6 series with multi-tag rows so the genre pipeline can be exercised. Tags live in `tags` + `series_tags` tables. Seed via `seeds.ts`. |
| Favorited rows | `08-favorites-history-list.md` F01-F11 | Each flow seeds via `invokeCmd(app, 'set_favorite', ...)` and rolls back — no fixture needed, but confirm the Rust command exists. |
| `recent_reads` rows | `08-favorites-history-list.md` H01-H09 | Seed via `record_recent_read` (verify exact name in `src-tauri/src/lib.rs`). If absent, add a test-only `seed_recent_read` Rust command guarded by `#[cfg(debug_assertions)]`. |
| Reading-status seeds | `08-favorites-history-list.md` L01-L10 | Seed via `set_reading_status`; existing `bulk-edit.spec.ts` already uses it. |
| Watch-folder source dir with rapid-add files | `09-settings.md` W02-W04 (debounce + stability gate) | Created per test in `os.tmpdir()`, no committed fixture. |
| Dictionary TSV variants | `09-settings.md` DI04+ (multiple installed dicts, removed dict, case sensitivity) | Generated per test, no committed fixture. |
| Backup zip with future schema version | `09-settings.md` B05 (forward-compat) | Generated per test via `create_backup` + manual JSON edit. |

### Generation flow

`tests/fixtures/generate.ts` is the canonical generator (`npm run test:fixtures`). When adding the EPUB sample or large catalog, extend that script — don't hand-stage files outside of it.

---

## 3. Test-seam Rust commands

Flows that today route through a native dialog or a gesture Playwright cannot drive need a Rust-command bypass. The pattern is already established by `import_pdf`, `install_font`, `install_dictionary`, `save_text_file`, `add_annotation`. Extend where flagged.

| Need | Existing? | Where it's needed |
|---|---|---|
| `import_pdf`, `import_cbz`, `import_txt`, `import_epub`, `import_image_folder` | ✅ | Existing |
| `install_font`, `remove_custom_font`, `read_custom_font` | ✅ | Existing |
| `install_dictionary`, `remove_dictionary`, `lookup_term` | ✅ | Existing |
| `create_backup`, `read_backup_metadata` | ✅ | Existing |
| **`restore_backup` (test-safe variant)** | ⚠ Exists but mutates fixture — risky in mid-suite | Wrap in a transaction or run only in last test; `09-settings.md` B04 |
| **History seed via `set_chapter_progress(chapter_id, page)`** | ✅ | Updates `chapters.read_at`; `list_recent_reads` reads from there. No dedicated `record_recent_read` exists or is needed. |
| **`set_series_favorite(pid, fav: bool)`** | ✅ | Already exposed in `series.rs:186` + `lib.rs:147` |
| **`set_reading_status(pid, status)`** | ✅ | `series.rs:207`. Whitelist: `plan`, `reading`, `completed`, `on_hold`, `dropped`, or `None` to clear. |
| **`save_text_file(path, contents)`** | ✅ | Annotations markdown export |
| **Selection-driven annotation create** | ❌ Gesture-only | Use `add_annotation` directly with offsets, then assert wrapper render. The selection mouseup path is unreachable. |
| **Drag-and-drop import** | ❌ Native | Drop event from Playwright doesn't fire Tauri's native drop; bypass via `import_pdf` and document the gap. |
| **Native file-pick close (cancel)** | ❌ | Cannot drive — `test.fixme` with a note. |

---

## Suggested ramp

1. Land all proposed `data-test` attributes in one polish PR (no behaviour change) — unlocks ~60 % of TODO flows.
2. Extend `generate.ts` with the `sample.epub` and large-catalog options — unblocks Library + Import flows.
3. Add the two missing Rust seed commands (`set_favorite`, `record_recent_read` if absent) — unblocks Favorites + History.
4. Then start writing specs. Tackle by-area in the priority order at the bottom of [TEST_FLOWS.md](TEST_FLOWS.md).

## Per-flow ownership

Each file in `flows-todo/` is self-contained. When you (or anyone) writes a spec for a flow, replace `**Status:** [ ] TODO` with `**Status:** [x] covered by <spec>.spec.ts › "<test title>"` so this index stays accurate.
