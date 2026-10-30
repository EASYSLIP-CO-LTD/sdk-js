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

Maintainers release the SDK with [release-please](https://github.com/googleapis/release-please). Everything runs in one workflow, [`.github/workflows/release.yml`](.github/workflows/release.yml):

1. Every merge to `main` updates a release pull request with the next version and the changelog. GitHub does not start workflows for a pull request that a workflow updated, so the release job starts CI on the release branch itself, and the checks show on the release pull request. If they are missing, run the `CI` workflow on the `release-please--branches--main` branch from the Actions tab.
2. Merging the release pull request creates the version tag and a draft GitHub Release. The same workflow run then checks that the tag points at the release commit on `main` and matches the `package.json` version, runs every check, and builds the tarball.
3. The `publish` job runs in the `release` environment. It publishes the tarball to npm with trusted publishing and provenance, attaches the tarball and its build attestation to the draft release and publishes the release. The `smoke` job then installs the published version on every supported Node.js version.

If a publish job fails, fix the cause and re-run the failed jobs of that run, which reuse the tarball it built. When that run can no longer be re-run, run the `Release` workflow on `main` from the Actions tab and enter the tag, such as `v1.0.0`. The run checks the tag the same way and builds the tarball again. When npm already has that version, the run goes on only if npm holds the same file, and it leaves a published release as it is.

### One-time setup

- On npmjs.com, create the `easyslip` organization, which owns the `@easyslip` scope, and require two-factor authentication for its members.
- In the repository settings, create the `release` environment. Limit its deployment branches to `main`, and add required reviewers if a person should approve each publish. While a publish waits for approval, later runs of the `Release` workflow on `main` wait for it.
- In the repository settings, under Actions, General, Workflow permissions, turn on "Allow GitHub Actions to create and approve pull requests". release-please opens the release pull request with the workflow's `GITHUB_TOKEN`, and GitHub refuses that without this setting.
- In the repository's security settings, turn on private vulnerability reporting, which [SECURITY.md](SECURITY.md) asks reporters to use.
- Optional: create an `integration` environment with an `EASYSLIP_API_KEY` secret, so that CI runs the integration tests on `main`.

### First release

npm accepts a trusted publisher only for a package that already exists, so a maintainer publishes the first version by hand, from the tarball that the workflow built:

1. Merge the release pull request. The `Release` run builds and tests the tarball, creates its build attestation and then stops at the `Publish` step, because `@easyslip/sdk` is not on npm yet.
2. Download the `package` artifact of that run, unzip it and check that this workflow built the tarball: `gh attestation verify easyslip-sdk-1.0.0.tgz --repo EASYSLIP-CO-LTD/sdk-js`.
3. Publish it with your own npm login: `npm publish easyslip-sdk-1.0.0.tgz --access public --provenance=false`. npm creates provenance only inside CI, so this one version has none on npm. The attestation from step 2 covers it.
4. Add the trusted publisher on the package settings page, or with npm 11.15 or later: `npm trust github @easyslip/sdk --repository EASYSLIP-CO-LTD/sdk-js --file release.yml --environment release --allow-publish`. npm then accepts a publish only from the workflow file `release.yml` in the `release` environment, and no npm token is stored anywhere.
5. Re-run the failed jobs of the `Release` run. `Publish` finds the same tarball on npm and does not publish it again, attaches it and its attestation to the release and publishes the release. `smoke` then installs it on every supported Node.js version.

Every later release is published by the workflow, with provenance.
