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

Run before every commit; `npm run gate` runs all of:

```bash
npm ci
npm run lint
npm run format:check
npm run db:validate
npm run test
npm run build
```

`npm ci` is first and installs strictly from `package-lock.json` (needs the exact Node
version pinned in `.node-version`; `engine-strict` in `.npmrc` refuses any other version).
`db:validate` needs `DATABASE_URL` to be set — see [Database](#database). CI runs the same,
plus `npm audit signatures`, `npm audit --audit-level=high`, and — against a throwaway
Postgres service — `npm run db:deploy`, `npm run db:seed` and `npm run test:db`, proving the
migrations apply from scratch and the seed fills them correctly. Those aren't in the local
gate because they need a running database and rewrite its contents; run `npm run test:db`
yourself when changing anything that touches it.

To add, update, or remove a dependency: `npm install [--save-dev] <package>@<exact-version>`
(`save-exact` in `.npmrc` pins it precisely), in the same commit that needs it, then run
the gate to confirm everything's still consistent.

Much of this also runs automatically, and any of it can reject outright — fix the cause,
don't route around it:

- **pre-commit hook** — lints and formats staged files, and if `package.json` or the
  lockfile are staged, runs `npm ci --dry-run` to catch a desynced lockfile.
- **commit-msg hook** — validates the commit message.
- **`pr-title.yml` (CI)** — validates the pull request title the same way.

## Database

Postgres runs in Docker locally. Once per clone:

```bash
cp .env.example .env
```

Then:

```bash
npm run db:up        # start Postgres
npm run db:migrate   # apply migrations (and generate one, if the schema changed)
npm run db:seed      # load data/diary.json into it
npm run db:down      # stop it
```

The Prisma client is generated into `node_modules`, which `npm ci` wipes — so on a fresh
clone run `npm run db:validate` (or the whole gate, which does it early) before `npm run
build` or `npm run test`, or they'll fail on a missing `@prisma/client`. If an editor still
reports that after generating, its TypeScript server is holding a stale copy and needs
restarting.

The schema lives in `prisma/schema.prisma`; a change to it means running `npm run db:migrate`
and committing the generated migration alongside. The database is a derived artifact —
rebuilt from its migrations, never hand-edited. A fix belongs upstream in the schema or the
ingestion pipeline, then re-applied, so every environment converges on the same state.

## The API

Fastify, with one Zod schema per route driving validation, the OpenAPI document and
the response types together rather than three descriptions of the same shape.

```bash
npm run dev     # rebuild and restart on change
npm start       # run the built server
```

`src/api/server.ts` exports `buildServer()`, which builds the app without listening so
tests drive it through `app.inject()` instead of binding a port; `src/api/index.ts` is
the entry point that listens and handles shutdown. `/docs` serves the API documentation.

`/health` checks the database rather than reporting a hollow "ok" — the service is only
useful when it can reach Postgres, so its health should say so.

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
