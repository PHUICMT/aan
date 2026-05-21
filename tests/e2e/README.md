# E2E suite

Playwright drives the real Tauri binary over CDP. One app instance is spawned in `global-setup.ts`, attached via `chromium.connectOverCDP`, and torn down in `global-teardown.ts`. Specs run **serially** (`workers: 1`) because they share a single window.

## Run it

```bash
cd aan
npx tauri build --debug --no-bundle   # bundles dist/ into target/debug/aan.exe
npm run test:fixtures                  # writes the synthetic catalog + import samples
npm run e2e                            # runs the suite, ~25s
npm run e2e -- --grep <name>           # one spec / one test
npm run e2e:ui                         # interactive runner
npm run e2e:report                     # open the HTML report
```

`cargo build` alone is **not enough** — the debug binary needs the embedded `dist/` from `tauri build --debug --no-bundle`, otherwise WebView2 tries to load `localhost:1420` and fails.

## How state isolation works

- `global-setup` points `app_config.json` at `tests/fixtures/build/` so the app reads a known-good catalog of 6 series + 10 chapters.
- The `app` fixture clears every `aan.*` localStorage key and reloads the page **before each test**, so persisted UI state (theme, sidebar collapse, library filters, last reader) does not bleed between specs.
- Tests that mutate the catalog (import, edit, watch) own their changes and undo them in `afterEach` (delete the series, restore the renamed field, drop the temp watch folder).
- Verified by running `npm run e2e` twice back-to-back — the second pass starts from the same pristine state as the first.

## Test catalogue

> 46 tests across 22 spec files. Runtime ≈ 38 seconds.

### `smoke.spec.ts`
Sanity that the suite is wired right.

- **boots and shows home + sidebar** — the main webview is the non-tray one and the nav rail is visible.
- **library renders the fixture catalog of 6 series** — `list_local_series` returns the seeded set and the grid renders cards.

### `navigation.spec.ts`
- **home → library → series → reader → back chain** — full forward + Back walks correctly through all four pages.
- **sidebar stays visible across pages** — sidebar isn't swallowed by any route.

### `library-filter.spec.ts`
Type, download, and search filters against the fixture catalog (3 manga, 1 comic, 1 novel, 1 original_novel, 1 partial).

- **type filter: manga narrows to 3**
- **type filter: comic narrows to 1**
- **type filter: novel narrows to 1**
- **search by name** — input narrows by substring match.
- **dl filter: missing-only shows the partial series** — only the partial series (chapters tracked but not all downloaded) survives.

### `series-detail.spec.ts`
- **series 1001 shows 4 chapter rows** — the chapter list matches the seeded chapters.
- **favorite toggle persists across nav-away-and-back** — heart icon state survives going back to library and reopening the series.

### `manga-reader.spec.ts`
PDF rendering through `pdfjs-dist`.

- **open 1001-ch1 (1 page) and back to series** — single-page PDF renders, BackButton lands on series detail (not library).
- **open 1001-ch3 (20 pages) and Next does not throw** — multi-page nav doesn't blow up.

### `novel-reader.spec.ts`
- **novel chapter renders and is scrollable** — HTML chapter loads into the iframe and scrolls.

### `novel-reader-modes.spec.ts`
Per-reader display settings (layout + theme), driven through the settings menu.

- **switching to paged layout shows page indicator and arrow keys flip pages** — clicks `Paged` in the settings menu, asserts `data-novel-layout="paged"`, then if the chapter spans more than one column, presses ←/→ and watches `data-novel-page-idx` advance and rewind.
- **theme swatch updates root and persists across reload** — clicks the sepia swatch, asserts `data-novel-theme="sepia"` + the matching `localStorage` key, reloads the app, re-opens the chapter, confirms sepia stuck.
- **two-page spread toggle only appears in paged mode and persists** — confirms the spread row is absent in scroll layout, present after switching to paged, and that toggling it flips `data-novel-spread` + writes `aan.novel.spread=1`.

### `pick-random.spec.ts`
- **pick random opens modal, reroll changes content, read opens series** — the random picker on Home cycles a different pick across rerolls and the Read button lands on series detail. (Asserts the new card via `.last()` to ride out the cross-fade.)

### `theme-persist.spec.ts`
- **theme switch + persists across reload** — switching theme in Settings survives `page.reload()`.

### `sidebar-collapse.spec.ts`
- **collapse hides labels, expand restores them** — collapse animation finishes and labels actually leave the DOM.

### `keyboard-shortcuts.spec.ts`
- **? opens shortcuts dialog, Escape closes it** — `?` is dispatched via `KeyboardEvent` literal (Playwright's `Shift+/` chord doesn't always set `e.key='?'` under WebView2).

### `import-dedupe.spec.ts` *(mutates — cleans up in afterEach)*

Bit-identical re-imports get short-circuited: the second call returns the existing chapter with `duplicate: true` and no new row is inserted.

- **importing the same PDF twice flags the second as duplicate** — calls `import_pdf` against `sample.pdf`, then calls it again with a different series name and chapter number; asserts the second response has `duplicate: true`, points at the first chapter, and `list_chapters` still returns a single row.

### `import.spec.ts` *(mutates — cleans up in afterEach)*

Drives the importer through Tauri commands directly so the native file dialog isn't in the loop. Each test deletes the series it created.

- **PDF import adds a card visible in Library** — invokes `import_pdf` against `import-samples/sample.pdf`, asserts the new card.
- **CBZ import unpacks images into a chapter folder** — `import_cbz` on `sample.cbz`, asserts card.
- **TXT import lands as a novel chapter** — `import_txt` on `novel.txt`, filters Library to "novel", asserts card.

### `series-edit.spec.ts` *(mutates — restores in afterEach)*

Opens the SeriesEditModal on series 1001 and either reverts the edit or, for chapter edits, uses a throwaway imported series so fixture chapters stay clean.

- **rename a series and see the hero update** — edits name through the form, asserts the hero text changed. `afterEach` resets the name to `Test Manga Alpha`.
- **blank name shows an error and does not save** — fills `   `, save is blocked, modal stays open, original name unchanged.
- **inline chapter title edit persists** — imports a throwaway series, clicks the chapter row's edit icon, retypes the title, presses Enter; cleanup deletes the throwaway series.

### `annotations.spec.ts` *(mutates — cleans up in afterEach)*

Novel highlights persist as rows in the `annotations` table, get re-applied as `<span class="nv-anno">` wrappers on chapter mount, and listed in a side panel. The selection-driven create flow needs a real user gesture, so we drive the Rust commands directly and assert through the panel.

- **annotations created via command surface as wrappers + panel rows** — `add_annotation` twice in different colours, opens the panel, asserts both rows render with the right colour class.
- **annotation list survives chapter swap and reload** — adds one with a note, reloads the app cold, re-enters the chapter, asserts the row + note are still there.
- **export_series_annotations_md emits chapter-grouped markdown** — adds two annotations, calls the export command, asserts the markdown contains `## Chapter` headings + both snippets.

### `bulk-edit.spec.ts` *(mutates — cleans up in afterEach)*

Multi-select two cards in Library, open the bulk editor, write a new author + add a tag, then assert the change made it through `get_series`. `afterEach` rolls back only what the spec touched (author + tag) — reading-status is left alone, because clearing it would strip series 1002's engagement and break downstream fixture-count specs.

- **select two cards + bulk edit author + add tag** — enters select mode, clicks pids 1001 + 1002, asserts the `bulk-count` reads `2`, opens the modal, applies, then confirms via the Rust `get_series` command.

### `collections.spec.ts` *(mutates — cleans up in afterEach)*

Smart collections store a named snapshot of Library filter state in the `collections` table; chips render above the grid. afterEach deletes every collection row.

- **save current filters as a collection, chip appears and persists** — narrows the type + reading-status filters, clicks `Save as collection`, names it, then asserts the chip is visible and the row in `list_collections` has the expected `filter_json`.
- **clicking a chip re-applies the saved filter snapshot** — seeds a `Novels only` collection via the Rust command, opens Library with a manga filter active, clicks the chip, and asserts the novel type chip is now active.
- **deleting a chip drops it from the row and the backend** — seeds a row, clicks the `×` on its chip, asserts the chip is gone from the DOM and `list_collections` returns `[]`.

### `dictionary.spec.ts` *(mutates — cleans up in afterEach)*

User-installed TSV dictionaries live in `<data_root>/dicts/`; `lookup_term` searches across all of them with case-insensitive + punctuation-stripped queries. Native file dialog can't be driven, so the install path goes through the Rust command directly.

- **install_dictionary + lookup_term returns the exact match** — writes a fake TSV, installs it, then queries `hello` and asserts the Thai translation comes back.
- **lookup_term strips punctuation and is case-insensitive** — feeds `Hello,` against a lower-case `hello` entry; asserts the match still lands.
- **lookup_term returns empty array when no match** — with no dict installed, the query returns `[]` instead of erroring.

### `backup.spec.ts`

Bundle the data root into a `.aan.zip` archive (library.db + covers + manga + novel + fonts + manifest.json). Restore is destructive — we don't exercise it end-to-end because it would wipe the fixture mid-suite.

- **create_backup writes a zip containing the manifest** — invokes the command into a tmp dir, asserts the file exists + starts with the ZIP magic bytes.
- **read_backup_metadata returns the manifest fields** — creates a backup, reads it back, asserts `version`/`app`/`files`/`created_at` are populated.
- **read_backup_metadata rejects a non-aan zip** — feeds a junk file in, expects an error string.

### `novel-override.spec.ts` *(mutates — cleans up in afterEach)*

Per-series override of the novel reader settings (stored in `series.reader_prefs_json`). Each test clears the column for the fixture series in `afterEach`.

- **saving override stamps the row + reapplies on reopen** — flips theme to sepia + layout to paged, clicks `Save for this book`, asserts the JSON column has `"theme":"sepia"`/`"layout":"paged"`, reloads cold and re-opens the chapter — the override re-applies on its own.
- **clearing the override falls back to global defaults** — seeds an override via the Rust command, opens the chapter, clicks `Use defaults`, asserts the root snaps back to the global theme and the column is NULL.

### `custom-fonts.spec.ts` *(mutates — cleans up in afterEach)*

Native file picker can't be driven from Playwright, so the install path is exercised via the `install_font` Tauri command directly (same pattern as import specs). Cleanup removes the font + the tmp source dir.

- **install_font registers the family and read_custom_font returns bytes** — writes a fake `Bookerly-Regular.ttf` stub, invokes `install_font`, asserts the family stem strips `-Regular`, then reads the bytes back through `read_custom_font`.
- **remove_custom_font drops the entry from the list** — installs a throwaway font then removes it, asserts `list_custom_fonts` no longer contains it.

### `watch-folder.spec.ts` *(mutates — full teardown in afterEach)*

- **dropping a PDF into a watched folder triggers auto-import** — creates an `os.tmpdir()` directory, registers it via `add_watch_folder`, `fs.copyFileSync` the sample PDF in, polls `list_local_series` up to 20s for the new series (notify-rs + 400ms stability gate adds latency). `afterEach` calls `remove_watch_folder`, deletes the series, and `rm -rf`s the temp dir.

## Adding a new test that mutates state

1. Use `invokeCmd(page, 'cmd', args)` from `fixtures/app.ts` to set up via the Rust commands directly.
2. Track every pid you create in a top-level `Set<number>`.
3. In `afterEach`, call `delete_series_force` on every tracked pid, then clear the set.
4. If you create files outside the data root (watch tests), `fs.rmSync(dir, { recursive: true, force: true })` them too.
5. Run the suite twice in a row to confirm no drift.

## Known traps

- The Tauri tray icon creates a second webview (`?win=tray_menu`). `fixtures/app.ts` filters it out — don't grab `pages[0]` blindly.
- Out-transitions (Svelte `transition:scale` on modals) keep an element in the DOM for ~160ms after `flushSync`. Use `waitFor` or query `.last()` rather than asserting immediately.
- jsdom's missing `Element.animate` is polyfilled in `tests/setup.ts` for component tests; e2e runs against the real WebView2 so it doesn't apply there.
