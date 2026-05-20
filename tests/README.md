# Tests

Three layers — pick the right one for what you're verifying.

## Layout

```
tests/
├── unit/           # pure functions, helpers, store mutations
├── component/      # single Svelte component behavior
└── e2e/            # full app flows via Playwright + Tauri CDP
    ├── pages/       # Page Object Model — selectors live here
    ├── fixtures/    # app spawn, DB seed
    └── flows/       # *.spec.ts — user journeys
```

## Run

```bash
npm test              # unit + component (Vitest)
npm run e2e           # full app (Playwright, ~50s)
npm run e2e:report    # open last e2e HTML report
```

## Conventions

- **Selectors:** use `data-test="..."` attributes in Svelte, never classes or
  IDs. Tests target `data-test`; CSS targets classes. Independent.
- **Page Object Model:** all e2e selector logic in `tests/e2e/pages/*.ts`. Spec
  files describe flows in user-language; they should not reach into the DOM
  directly.
- **Fixtures:** `tests/e2e/fixtures/app.ts` exports a Playwright fixture that
  spawns the Tauri app on a free CDP port and attaches. Tests get an `app`
  Page that's ready to drive.
- **Reset between tests:** `tests/e2e/fixtures/seed.ts` clears the data root
  and re-imports a known fixture library. No test depends on order.
