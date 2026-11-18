# Runbook: Supabase egress spike from a base64 image in a row — 2026-11-10

## What happened

Supabase egress for the project spiked. Tracing the usage led to a single
habit record whose `icon_url` field held a ~1.17 MB base64-encoded image.
Every read of that row shipped the full blob, so ordinary habit queries
turned into megabyte responses and burned egress far beyond what the data
warranted.

## How it was detected

A Supabase usage warning flagged the egress. The investigation compared
row sizes in the habits data and found the one record carrying the base64
blob in `icon_url`.

## How it was fixed

- The offending value was corrected live, removing the blob from the row.
- The code was hardened in PR #117 so this class of value cannot be stored
  again.

## Standing rule (prevents recurrence)

- User-generated image fields are size-capped.
- Base64 image blobs are never stored in database row columns. Images live
  in files/storage; rows hold references, not payloads.
- When a usage warning arrives, check the largest row values before
  assuming traffic growth.

## If this happens again

- [ ] Open the Supabase usage view and confirm egress is the spike (not
      requests or storage).
- [ ] Find the payload: inspect recent/large rows in the tables the app
      reads most, looking for base64-length values in text/URL columns.
- [ ] Remove or replace the offending value live, then verify egress drops.
- [ ] Check the write path that allowed it and close it in code (cap or
      reject oversized values), with a regression test.
- [ ] Note the table, column, and value size here if the pattern differs
      from this incident.
