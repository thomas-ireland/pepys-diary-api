# CLAUDE.md

Guidance for anyone — human or AI agent — working in a repository based on this
template. The workflow is enforced by tooling, not by memory: hooks and CI reject
anything that breaks it, so the aim is to get it right, not to route around them.

## Workflow

`main` only changes by squash-merging a pull request once its checks pass — no approvals
needed (merge your own), but no direct pushes and no force pushes, ever, including
locally. **Branch before you write anything:** if you're on `main`, or on a branch that
no longer matches what you're about to do, stop and start a new one.

**A pull request is one change** — one coherent thing — and its title names that whole
thing. Everything else follows:

- **One change per branch.** If something unrelated surfaces while you work — a bug, a
  stray cleanup — it's a separate change: new branch, its own pull request. Never let it
  ride along.
- **The title covers the whole change, not just the first commit.** Squash-merging makes
  that title the commit subject on `main`, so a partial title is a false record. If an
  honest title needs "and", you have two changes — open two pull requests, don't write a
  longer title.
- **Usually one commit. Split into several only when each stands alone** as a complete,
  working state. Renaming the package is _one_ commit — `package.json` and every
  reference to the old name move together or the repo is half-broken. Adding ESLint, then
  Prettier, is _two_ — ESLint alone already works.

Then: run the gate until green, push, open the pull request, squash-merge. Before running
`git commit` or `gh pr create`, show the user the exact commit message and the exact pull
request title and body (structured per `.github/pull_request_template.md`) and wait for
their confirmation.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org), standard
`@commitlint/config-conventional`, no custom rules: `<type>: <subject>` — lower-case
subject, imperative mood, no trailing period, scope optional (acronyms keep their case,
e.g. `add OAuth login`). Commits are signed and show as Verified — set signing up once
(SSH or GPG) and every commit after is automatic. Amend freely before pushing; never
rewrite pushed history.

## The gate

Fresh clone: `npm ci` installs everything and wires up the git hooks (`prepare`).

Run before every commit; `npm run gate` runs all four:

```bash
npm ci
npm run lint
npm run format:check
npm run build
```

`npm ci` is first and installs strictly from `package-lock.json` (needs Node 24+;
`engine-strict` in `.npmrc` refuses the wrong version). CI runs the same four plus
`npm audit signatures` and `npm audit --audit-level=high`.

To add, update, or remove a dependency: `npm install [--save-dev] <package>@<exact-version>`
(`save-exact` in `.npmrc` pins it precisely), in the same commit that needs it, then run
the gate to confirm everything's still consistent.

Much of this also runs automatically, and any of it can reject outright — fix the cause,
don't route around it:

- **pre-commit hook** — lints and formats staged files, and if `package.json` or the
  lockfile are staged, runs `npm ci --dry-run` to catch a desynced lockfile.
- **commit-msg hook** — validates the commit message.
- **`pr-title.yml` (CI)** — validates the pull request title the same way.

## Security

- Pin GitHub Actions to a full commit SHA, never a mutable tag; note the version in a
  trailing comment so Dependabot can bump it. Verify the SHA two independent ways and
  confirm they agree: `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` and
  `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>`.
- Least-privilege workflow tokens (`permissions: contents: read`); `checkout` uses
  `persist-credentials: false`.
- Dependencies pinned exactly (`save-exact`), kept current by Dependabot.
- Never commit secrets; `.env` files are gitignored.

## Extending

The template ships no server, database, or test runner. When you add one, add its check
in the same pull request that introduces it: add the npm script, chain it into the `gate`
script in `package.json`, and add a matching step to `.github/workflows/ci.yml`. Never
weaken a check to make a change pass — fix the change.

## First-time setup

Repository settings — branch protection, required checks, merge and security settings —
are not copied when you "Use this template". Once, on the new repo:

1. `./scripts/init-repo.sh <owner>/<repo>` — applies them.
2. Open a pull request (your first real one is fine) so `ci` and `pr-title` run once.
3. `./scripts/init-repo.sh <owner>/<repo> --with-checks` — makes those checks required.

Until step 3, `main` is protected but nothing is required to pass before merging. The
script rewrites the whole ruleset each run, so don't hand-tune protection between steps.
