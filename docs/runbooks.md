# Incident runbooks

Short, factual records of real incidents: what happened, how each was
detected and fixed, and the standing rule that keeps it from recurring.
Each runbook ends with a checklist for the next occurrence.

| Runbook | Incident |
| --- | --- |
| [runbook-live-500-2026-11-08.md](runbook-live-500-2026-11-08.md) | SSR worker bundle crashed at module init after deploy; every live route returned 500. Standing rule: `build:worker` + served smoke before any sign-off. |
| [runbook-egress-2026-11-10.md](runbook-egress-2026-11-10.md) | Supabase egress spike caused by a ~1.17 MB base64 image stored in a habit row's `icon_url`. Standing rule: size-cap image fields; never store base64 blobs in row columns. |
| [runbook-stale-bundle-sweep-trap.md](runbook-stale-bundle-sweep-trap.md) | A post-deploy sweep "failed" a good deploy because a long-open browser window kept running the old JS bundle. Standing rule: hard-reload before judging any post-deploy sweep. |

Security issues are reported via the contact in
[`/.well-known/security.txt`](../public/.well-known/security.txt).
