# Continuous integration

`bloom-discord.yml` is the pipeline for this project. It is **not yet active** —
it lives here rather than in `.github/workflows/` because the GitHub App that
authored it is not granted the `workflows` permission, and GitHub rejects any
push that creates or edits a workflow file without it. That is a deliberate
GitHub safety rule: an integration that can write workflows can run arbitrary
code with the repository's credentials.

## Installing it

One command, from the repository root:

```sh
mkdir -p .github/workflows
cp bloom-discord/ci/github-actions/bloom-discord.yml .github/workflows/
git add .github/workflows/bloom-discord.yml
git commit -m "ci: add the Bloom Discord pipeline"
git push
```

Pushed by a human, or by any integration that holds the `workflows` permission,
it takes effect on the next pull request.

## What it does

Two jobs.

**`verify`** runs the same loop a developer runs locally, in the same order:
formatting, lint, `tsc --build`, a separate typecheck of the test project, unit
tests, then migrations and integration tests against a real PostgreSQL 17
service container. A CI that checks a different set of things than the local
loop is a CI that fails for reasons nobody can reproduce, so these are
deliberately identical.

Two steps in it are worth keeping:

- **Migrations run twice.** Re-running must be a no-op. A migration that is not
  safe to re-apply will eventually be re-applied — by a retried deploy, by two
  replicas starting together — and discovering that here costs nothing.
- **Migrations run from the compiled CLI**, not `tsx`. That is the command
  production runs, so a migration path that only works when dev dependencies
  are installed fails in CI rather than during a deploy.

**`image`** builds the container and inspects it: all three entry points and the
migration CLI are present, the image runs as the unprivileged `node` user, and
the Node major version satisfies `engines.node`. It deliberately does not try to
start a bot — that needs a token and a database, and a smoke test requiring
credentials is a smoke test that gets switched off.

## Secrets

None. The pipeline needs no Discord token and no production database: the
`DISCORD_*` values in it are literal placeholders that satisfy the config
schema's shape check and cannot authenticate against anything. Nothing in CI
connects to Discord.
