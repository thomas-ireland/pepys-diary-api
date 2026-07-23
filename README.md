# pepys-diary-api

The Diary of Samuel Pepys API. Built on
[ts-template-base](https://github.com/thomas-ireland/ts-template-base), a TypeScript base
template with a locked-down git workflow — no framework, test runner, or database yet,
just the scaffolding and guardrails, ready to build on.

## What's included

- Node 24+ — enforced via `.npmrc` (`engine-strict`), so an older Node version won't install.
- TypeScript, ESLint, and Prettier.
- A CI workflow (`ci.yml`, using `actions/checkout` and `actions/setup-node`) that runs
  on every pull request, every push to `main`, and weekly: install, dependency signature
  check, lint, format check, build, vulnerability audit.
- A pre-commit hook (husky + lint-staged) that lints and formats staged files, and runs
  `npm ci --dry-run` when `package.json` or the lockfile are staged.
- A commit-msg hook and a PR-title check, both validating against Conventional Commits.
- Dependabot, a pull request template, and `scripts/init-repo.sh`.

## Using it

1. Click **Use this template** to create a new repository.
2. Run `./scripts/init-repo.sh <owner>/<repo>` — repository settings (branch protection,
   merge strategy, security settings) aren't copied from a template, so this reapplies
   them. Without this step, `main` is not protected.
3. Open a pull request — your first real one works fine, no throwaway needed — so `ci`
   and `pr-title` run once, then run `./scripts/init-repo.sh <owner>/<repo> --with-checks`
   to make them required.

## License

MIT — see [LICENSE](LICENSE).
