# Contributing to Aan

Thanks for your interest.

## Before you start

- For bugs: open an issue with steps to reproduce.
- For features: open an issue first to discuss before coding. Big PRs without prior discussion may be declined.
- For translations: see the i18n section below.

## Contributor License Agreement

By submitting a pull request, you agree that your contribution is licensed
under both the GPL-3.0 (the project license) and any future commercial
license offered by the project maintainer.

This dual-licensing model lets the project sell commercial licenses to
parties that cannot use GPL software, with proceeds going to project
sustainability. Without this agreement, contributions would be locked to
GPL only and the project could not offer commercial terms.

The CLA Assistant bot will ask you to sign the agreement on your first PR.
Signing is one click. It applies to all future PRs from the same GitHub
account.

If you do not want to sign the CLA, you can still open an issue describing
the change you want and someone else can implement it.

## Development setup

```bash
git clone https://github.com/PHUICMT/aan.git
cd aan
npm install
npx tauri dev
```

Requires Rust toolchain and Node 20+.

## Commit style

```
[type] short message in present tense
```

Types: `feat`, `fix`, `refactor`, `polish`, `i18n`, `docs`, `chore`, `test`.

Example: `[feat] import: detect CBZ archives via zip signature`

## i18n

Add a new language: drop `src/locales/<code>.json` and extend
`AVAILABLE_LANGS` in `src/lib/i18n.svelte.ts`. Use `en.json` as the source
of truth for keys.

Larger translation work goes through Crowdin (link will be added when the
project is set up there).

## Code style

- Run `npx svelte-check` before opening a PR.
- Rust: `cargo fmt` and `cargo clippy -- -D warnings`.
- Keep PRs focused. One feature or fix per PR.

## Questions

Open a Discussion on GitHub.
