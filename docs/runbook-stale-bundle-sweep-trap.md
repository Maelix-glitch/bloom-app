# Runbook: Post-deploy sweep "fails" on a stale browser bundle

## What happened

After a deploy, a verification sweep of the live app appeared to fail every
check for changes that had, in fact, landed. The browser window used for
the sweep had been open since before the deploy. Because Bloom is a
single-page app, in-app navigation kept running the already-loaded (old)
JavaScript bundle — the new code was live on the server but never loaded
in that window.

After a hard reload forced a fresh document load, the same checks passed
cleanly against the same deploy.

## How it was detected

The sweep results contradicted the deploy itself: every marker of the new
build was missing at once. A hard reload of the app URL made all of the
markers appear with no code change, which isolated the problem to the
browser's cached bundle rather than the deploy.

## How it was fixed

No code fix was needed — the deploy was correct. The sweep was re-run after
a hard reload and passed. The fix is procedural: the standing rule below.

## Standing rule (prevents recurrence)

Before judging any post-deploy sweep, force a fresh document load of the
app URL (hard reload / cache bypass) in the sweep browser, and only then
measure. A sweep run in a long-open window is evidence about the old
bundle, not about the deploy.

## If this happens again

- [ ] Note whether the sweep window was open before the deploy finished.
- [ ] Hard-reload the app URL (cache bypass) and re-run one failing check.
- [ ] If it now passes, the deploy is fine — re-run the whole sweep fresh
      and discard the stale results.
- [ ] If it still fails after a hard reload, treat it as a real deploy
      problem and switch to the live-500 runbook's checks (build:worker +
      served smoke on the shipped tree).
