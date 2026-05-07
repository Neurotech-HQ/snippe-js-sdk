# Contributing to `@snippe/sdk`

Thanks for taking a look. This doc is for people working on the SDK itself — not for people using it. End-user docs live in [README.md](./README.md).

## Development

```bash
npm install
npm run typecheck      # tsc --noEmit
npm test               # run the vitest suite
npm run test:watch     # iterate locally
npm run test:coverage  # with v8 coverage report (coverage/)
npm run build          # emit dist/{esm,cjs,types}
```

Node 18+ is required (the SDK uses the global `fetch`).

## Examples

Runnable integration scenarios live in [`examples/`](./examples) — mobile money, card, hosted checkout, donation sessions, mobile and bank payouts, a webhook handler (Express), a retry loop, and polling-based reconciliation.

```bash
export SNIPPE_API_KEY="snp_..."
npx tsx examples/01-mobile-money.ts
```

See [`examples/README.md`](./examples/README.md) for the full index. Examples are excluded from the published npm tarball; they only exist in the GitHub repo.

## Testing approach

Tests mock the network by injecting a fake `fetch` through the `new Snippe({ fetch })` option — the same seam the SDK exposes for custom HTTP clients. No `msw`, no live network.

The suite covers:

- **HTTP layer** — auth headers, idempotency key generation and length enforcement, error mapping (401/403/400/422/429/5xx), rate-limit header parsing, timeouts, network errors.
- **Webhooks** — happy-path round-trip, bad signatures, stale timestamps (replay protection), malformed JSON, Buffer and string raw bodies.
- **Resources** — every method on `payments`, `sessions`, and `payouts`, including path correctness, body shape, and default-webhook-URL application.
- **Errors** — full `SnippeError.retryable` decision table.

Coverage thresholds (enforced in `vitest.config.ts`): 85% lines/statements/functions, 80% branches.

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push and PR to `main`:

- Node 18 **and** 20 matrix on `ubuntu-latest`.
- `npm ci` → `npm run typecheck` → `npm run test:coverage` → `npm run build`.
- Coverage uploaded as an artifact on the Node 20 leg.

## Releasing

Releases are automated by [`.github/workflows/publish.yml`](./.github/workflows/publish.yml). It runs on every push to `main`:

1. Installs, typechecks, tests, builds.
2. Reads `version` from `package.json`.
3. Queries npm — if that version is already published, it skips.
4. Otherwise runs `npm publish --provenance --access public` and opens a matching GitHub release.

To cut a release:

```bash
npm version patch   # or minor / major — creates a commit + git tag
git push --follow-tags origin main
```

Pushing code without a version bump re-runs tests but does **not** republish.

### One-time repo setup

- Create an npm [Automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) with **publish** scope.
- In GitHub → **Settings → Secrets and variables → Actions**, add it as `NPM_TOKEN`.
- Provenance is emitted via the `id-token: write` permission declared in the workflow — no extra setup.

### First publish (manual)

The very first publish of a scoped package needs `--access public`. Provenance only works from CI, so for the manual bootstrap, omit it:

```bash
npm ci
npm run typecheck && npm test && npm run build
npm publish --access public
```

Subsequent releases go through the workflow and get signed provenance automatically.

## Commit style

No strict convention, but short, imperative-voice summaries ("Fix envelope parsing for session responses") are preferred over past tense or narrative.

## License

By contributing, you agree your contributions are licensed under the MIT License (see [LICENSE](./LICENSE)).
