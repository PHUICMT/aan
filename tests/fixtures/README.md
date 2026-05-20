# Aan — Synthetic Test Fixtures

Generates a self-contained `build/` tree mimicking the user's data directory.
All content is synthetic. No real manga / novel content is ever included.

## Regenerate

```bash
npm install
npm run test:fixtures        # writes tests/fixtures/build/
npm run test:fixtures:clean  # nukes build/
```

## Output

```
build/
├── library.db              # rusqlite-compatible SQLite seed
├── covers/<pid>.jpg        # one tiny JPEG per series
├── manga/<pid>/<chapter_id>.pdf
└── novel/<pid>/<chapter_id>.{html,txt}
```

`build/` is gitignored.

## Series catalog

| pid  | name                | type            | local/total | favorite | reading_status | purpose                                  |
| ---- | ------------------- | --------------- | ----------- | -------- | -------------- | ---------------------------------------- |
| 1001 | Test Manga Alpha    | manga           | 4/4         | yes      | reading        | reader / zoom / spread / lazy-render     |
| 1002 | Test Manga Beta     | manga           | 0/0         | no       | plan           | empty-library / plan-to-read screens     |
| 1003 | Test Manga Gamma    | comic           | 1/1         | no       | on_hold        | comic type filter                        |
| 2001 | Test Novel One      | novel           | 2/2         | yes      | reading        | novel reader, TOC outline, find-in-page  |
| 2002 | Test Novel Two      | original_novel  | 1/1         | no       | (null)         | plain-text fallback                      |
| 3001 | Test Manga Dropped  | manga           | 2/10        | no       | dropped        | partial-download UI                      |

## Chapter notes

- `1001-ch1`: single page — quick reader smoke test
- `1001-ch2`: 5 pages, mixed portrait/landscape — orientation handling
- `1001-ch3`: 20 pages — lazy-render + zoom test surface
- `1001-ch4`: 2 pages — spread / two-page-view test
- `2001-ch2`: long HTML with `<h2>` / `<h3>` — drives TOC + scroll tests
- `2002-ch1`: `.txt` — text fallback render path

Two chapters carry `last_page_read` + `read_at`, so Continue-Reading and
reading-stats queries return rows.
