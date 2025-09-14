# MVP P0 Test Suite (Story 1.1)

This is a pragmatic test suite for Story 1.1 (Deploy OpenProject to Cloudflare) targeting 5–10 C‑suite users. It focuses on P0 paths only and runs in <5 minutes.

What’s covered (P0):

- Wrangler deploy success (mocked)
- Homepage loads < 3 seconds (E2E)
- API key format validation (unit)
- Valid API authentication (integration)
- Invalid API graceful rejection (integration)
- Admin login via UI (E2E)
- Create task in UI (E2E)
- Health check returns 200 (unit)

Tools:

- Vitest for unit/integration
- Playwright for E2E (Chromium only)
- Simple bash smoke test
- All external dependencies are mocked

## Setup

- Node.js 18+ (20 recommended)

Install dependencies and Playwright Chromium:

```
npm install
npx playwright install chromium
```

## Run tests

- Full MVP suite (P0):

```
npm run test:mvp
```

- Unit only:

```
npm run test:unit
```

- Integration only:

```
npm run test:integration
```

- E2E only (Chromium, @P0-tagged):

```
npm run test:e2e
```

- Smoke test:

```
npm run test:smoke
```

## CI/CD

GitHub Actions workflow at `.github/workflows/mvp-tests.yml` runs on push/PR to `main`, executes the smoke test, unit/integration, a mocked wrangler deploy validation, then E2E. Slack notification triggers on failure only (requires `SLACK_WEBHOOK_URL` secret).

## Notes

- No external networks: all tests use mocks and data URLs to ensure reliability.
- Chrome-only E2E: no cross-browser guarantees per MVP scope.
- Keep it fast: timeouts and counts tuned to finish in < 5 minutes on CI.
