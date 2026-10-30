# Contributing

Thank you for helping improve the EasySlip SDK for JavaScript and TypeScript. This guide explains how to set up the project, run the checks and send a change.

## Before you start

- For a bug, open an [issue](https://github.com/EASYSLIP-CO-LTD/sdk-js/issues) with the SDK version, your runtime and the steps to reproduce it.
- For a new feature or a change to the public API, open an issue first so we can agree on the design.
- For a security problem, follow [SECURITY.md](SECURITY.md) instead of opening an issue.
- Never put a real API key, webhook secret or slip image in an issue, a commit or a test.

## Set up

You need Node.js 22, 24 or 26 and npm.

```sh
git clone https://github.com/EASYSLIP-CO-LTD/sdk-js.git
cd sdk-js
npm ci
```

## Checks

Run these before you open a pull request. CI runs the same commands.

| Command | What it checks |
| --- | --- |
| `npm run lint` | Lint and formatting with Biome. `npm run format` fixes the formatting. |
| `npm run typecheck` | Types in the source, the tests and the examples. |
| `npm run check:readme` | Every TypeScript code block in `README.md` and `README.th.md` compiles against the current API. |
| `npm test` | Unit tests and the conformance tests in `test/conformance.test.ts`, which replay the recorded API responses in `test/fixtures`. |
| `npm run test:coverage` | The same tests with a coverage report in `coverage/`. |
| `npm run build` | Builds the ESM and CommonJS output in `dist/`. |
| `npm run check:package` | Packs the package, checks it with publint and Are the Types Wrong?, installs it in a new project and makes an offline call with ESM, CommonJS and TypeScript. |

## Integration tests

`npm run test:integration` calls the live API, so it needs your own API key. Every test is skipped when no key is set.

| Variable | What it does |
| --- | --- |
| `EASYSLIP_API_KEY` or `EASYSLIP_API_KEY_FILE` | Your API key. |
| `EASYSLIP_V2_BASE_URL`, `EASYSLIP_V1_BASE_URL` | Another API host, if you test against one. |
| `EASYSLIP_TEST_PAYLOADS_FILE` | A file with QR payloads of slips this branch has already verified, one per line. Enables the verification tests. |
| `EASYSLIP_TEST_QR_DIR` | A folder with `qr-0.png` and `qr-1.png` slip images that match those payloads. |
| `EASYSLIP_TEST_CALLBACK_URL` | An https URL that accepts webhooks. Enables the background job tests. |
| `EASYSLIP_TEST_WRITE=1` | Allows the tests to create a test bank account. |

Verifications use your quota. Use slips you are allowed to verify, and never commit them.

## Pull requests

- Keep each pull request to one change, and add or update tests for it.
- Update `README.md` and `README.th.md` when the public API or its behaviour changes, and run `npm run check:readme`.
- Write the pull request title as a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/), for example `fix: keep the request id on network errors` or `feat: add bankAccounts.delete`. Pull requests are squash merged, and the title becomes the commit message.
- `feat` adds a minor version, `fix` and `perf` add a patch version, and a `!` after the type (for example `feat!:`) marks a breaking change.

## Releases

Maintainers release the SDK with [release-please](https://github.com/googleapis/release-please):

1. Every merge to `main` updates a release pull request with the next version and the changelog.
2. Merging the release pull request creates the version tag and a draft GitHub Release.
3. A maintainer reviews the draft and publishes it. Publishing runs the `Publish` workflow, which builds and tests the tag, publishes to npm with trusted publishing and provenance, attaches the package and its build attestation to the release, and installs the published version to check it.
