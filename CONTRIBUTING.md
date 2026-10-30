# Contributing

Use a runtime listed in `.github/workflows/ci.yml`. Install the development tools, then run:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run check:package
```

The test suite checks the README examples and conformance fixtures without credentials.
For live tests, set `EASYSLIP_API_KEY` or `EASYSLIP_API_KEY_FILE` to your own key, and optionally
`EASYSLIP_V1_BASE_URL` and `EASYSLIP_V2_BASE_URL` to the API endpoints. The other variables are
listed at the top of `test/integration/live.test.ts`:

```sh
npm run test:integration
```

Live tests may use quota. Never commit keys or slip data.
Keep pull requests focused, add regression tests and update both READMEs when the API changes.
Run the checks above before submitting. Use Conventional Commits for commit messages and PR titles.
Report vulnerabilities through [SECURITY.md](SECURITY.md).
Maintainers follow [RELEASING.md](RELEASING.md).
