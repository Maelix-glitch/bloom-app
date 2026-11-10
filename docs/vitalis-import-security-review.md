# Evidence catalogue import: security review

Scope: `scripts/vitalis-import-catalogue.mjs`, the SQL it applies
(`supabase/seeds/20261107_vitalis_evidence_catalog.sql`), and the migrations that
create the roles and guards it depends on. Review date: 9 November 2026.

Methods: a full read of the script and seed, a read of the relevant migrations'
grants and triggers, and measurement on disposable hosted projects (verify5,
verify6, verify7, verify8, verify9) created and deleted for the purpose. The
production project was read once, through the dashboard SQL editor, with
`select` only; section 11 records what that showed.

Nothing here is a claim about the application's own auth model. This is about the
procedure an operator runs to put editorial rows into a database that already
holds user data.

---

## 1. Assets and trust boundaries

| Asset                                              | Where it lives                          | Consequence of compromise                                  |
| -------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Project database password (`SUPABASE_DB_PASSWORD`) | operator's environment, never committed | Full owner access to the project's database                |
| Temporary `evidence_importer` credential           | process memory only                     | `insert`/`update` on the evidence catalogue while it lives |
| Seed contents                                      | committed SQL file                      | None — it is public editorial content by design            |
| Evidence rows                                      | database, RLS-protected                 | Unreviewed health claims visible to users if written wrong |

The boundary that matters: the operator's machine holds a password that can do
anything in the database. Every control in the script exists to keep the _second_
credential — the one that can write reviewed claims — short-lived and scoped, and
to make its misuse detectable afterwards.

---

## 2. Credential lifecycle

| Stage    | What happens                                                        | Property                                                      |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Generate | `randomBytes(24).toString("base64url")` — 192 bits, in memory       | Never printed, logged, written to disk or passed in argv      |
| Store    | `alter role evidence_importer login password '<pw>'`                | Overwrites any previous password; role gains login capability |
| Use      | one connection as `evidence_importer.<ref>`, port 5432              | Scoped to the transaction; no session GUC survives it         |
| Clear    | `finally`: `nologin`, `password null`                               | Runs on success, failure, refusal-after-connect and SIGINT    |
| Verify   | login attempt with the same password must fail; member list checked | Success is asserted, not assumed                              |

Measured after every hosted run: `rolcanlogin = false`, the importer session count
returns to zero, and a login attempt with the temporary password fails. The role
itself remains, because it owns the catalogue rows; teardown restores dormancy,
not absence.

The password exists in plaintext in one SQL statement that the server parses. It
can therefore appear in a server-side statement log if `log_statement` is enabled
(Supabase's default is `none`), and it is visible to the pooler inside the TLS
tunnel. Nothing in the design depends on that not happening — the credential is
useless once the run ends, and it is cleared in the same run — but it is a real
residual, listed in section 9.

---

## 3. Transport and the pooler

The connection is always `postgres.<ref>@<pooler-host>:5432`. Port 5432 is
session mode; 6543 is transaction mode. The script hardcodes 5432 and refuses any
other port, because transaction-mode pooling multiplexes sessions and a
session-scoped guarantee is exactly what the import relies on.

Certificate verification is **on by default**. Measured against
`aws-0-ap-northeast-1.pooler.supabase.com`, Node's default trust store rejects the
pooler's chain:

```
SELF_SIGNED_CERT_IN_CHAIN: self-signed certificate in certificate chain
```

The chain is `*.pooler.supabase.com ← Supabase Intermediate 2021 CA ← Supabase Root
2021 CA` (self-signed). So verification without a trust anchor cannot succeed, and
the script fails closed with a message naming the fix: pass the project certificate
with `--ca`, downloaded from the dashboard's SSL configuration. `--insecure-tls`
is an explicit opt-out that disables verification; it is a recorded downgrade, not
a default, and the runbook forbids it for a real import.

Refusal without `--ca` was measured on hosted (exit 1, actionable message, no
credential created — the failure happens before any `alter role`).

Pinning with a downloaded certificate was **not** completed end to end: two
disposable projects became unreachable at the pooler (`ECONNRESET`, then `server
closed the connection`) before the import ran. The default-refusal path is
measured; the `--ca` path is implemented and unexercised against hosted. Section
10 records that as not verified rather than as passing.

The backend's own `port` GUC reads 5432 through either pooler mode, so the GUC
assertion is defence in depth only. The control is the client-side port, and the
refusal to accept anything else.

---

## 4. Failure cleanup and residue

Cleanup is in a `finally` block, so it also runs when the import raises, when an
assertion raises, and when the process receives SIGINT. It does three things,
each independent of the others' success:

1. `alter role evidence_importer nologin`;
2. `alter role evidence_importer password null`;
3. reset the two GUCs and re-read them to prove they are gone.

If the transaction is still open, the failure path issues an explicit `rollback`
before cleanup, so a partially applied seed is never left pending on a pooled
backend. Closing the connection would abort it too; the explicit rollback makes
the intent visible and does not depend on disconnect semantics.

**Residue window.** If the owner connection dies at the wrong moment — process
kill, network loss, machine sleep — the cleanup cannot reach the server, and the
role stays login-capable with a 192-bit password that exists only in the dead
process's memory. The exposure requires an attacker who already holds a network
position and can guess nothing; the realistic consequence is an audit finding,
not a compromise. It is closed by one query in the runbook:

```sql
select rolname, rolcanlogin, rolpassword is not null from pg_authid
 where rolname = 'evidence_importer';
```

This is a documented limitation rather than a fixed defect: it cannot be closed
from the client side, and a server-side `statement_timeout`-based expiry would be
a schema change with its own risks.

---

## 5. Session isolation and the seed's guards

The seed's guard requires `session_user = 'evidence_importer'` _and_
`current_setting('bloom.evidence_import', true) = 'on'`. Identity alone is not
enough, so a connection made with the importer's password by something else does
not get write access to reviewed states.

- The GUCs are set with `set_config(..., true)`, transaction-local. The previous
  form interpolated the `--reason` text into a `set local` statement; it escaped
  quotes, but this is a session that can write reviewed health claims, and a
  quoting bug there would be an injection into it. Bound parameters remove the
  class of bug entirely. Same behaviour, no string building.
- The GUCs are reset and re-read at the end, and a leftover value fails the run.
  This matters on a pooler that hands a backend back to the pool.
- `session_user` is asserted before the transaction opens, so an unexpected
  identity stops the run before anything is written.
- The connection cannot be promoted: `postgres` is not a superuser on hosted
  (`rolsuper = false`), and `SET SESSION AUTHORIZATION evidence_importer` returns
  `42501` (measured). That is why the temporary-credential route exists at all.

### Membership, measured

PostgreSQL 16 makes the creating role a member of the role it creates, and hosted
Supabase records that grant under `supabase_admin`. A `revoke` issued by
`postgres` therefore does not remove the row. The script reports the membership
and fails only on members _other than_ the migration executor, which is the
strongest assertion `postgres` can actually enforce. The membership is not an
escalation: `postgres` can already do everything the importer can, and the role is
`NOLOGIN` with no password.

---

## 6. What the seed itself guarantees

These are properties of the SQL, not of the procedure, and they are why a
mis-aimed run is survivable:

- no `delete`, `truncate`, `drop` or `cascade` anywhere in the file;
- a reconciliation block that raises, with the offending ids, when the database
  holds rows, versions or supersessions the catalogue does not describe;
- claim status transitions only forward (no un-approving, no reverting a newer
  version);
- an insert-if-absent path for revisions, so a re-run cannot duplicate history;
- a preflight that stops before writing if the evidence tables are absent.

The importer adds identity, transaction scope and credential lifetime. It does
**not** make the SQL safe to run against a database that has diverged; the SQL does
that by refusing.

---

## 7. Repeat-import behaviour

Supavisor caches the role's verifier. A run immediately after another can be
rejected with `28P01` even though the generated password is correct, because the
pooler still holds the previous one; it expires in about a minute. The script
recognises that code and reports it as a cache problem with the remedy, instead of
letting an operator conclude the password is wrong and start rotating things.

The practical rule is one import per project per session. Re-applying after the
cache expires is idempotent by construction (section 6): the counts do not change
and no revision is duplicated. The script is deliberately not a loop.

---

## 8. Findings

| ID    | Finding                                                                                                                                | Severity | Status                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| SR-1  | TLS verification disabled (`rejectUnauthorized: false`), so the owner password and temporary credential were exposed to an active MITM | High     | **Fixed, pinning unverified** — verification on by default and the refusal is measured; `--ca` not yet exercised end to end |
| SR-2  | `--reason` interpolated into `set local`, relying on quote escaping in a privileged session                                            | Medium   | **Fixed** — `set_config` with a bound parameter                                                                             |
| SR-3  | Failure path relied on disconnect to abort; no explicit rollback                                                                       | Low      | **Fixed** — explicit `rollback` in the catch                                                                                |
| SR-4  | Header comments claimed "membership revoked", "no memberships" and "session-mode assertions" that the code does not provide            | Low      | **Fixed** — comments now state what is enforced and what is only reported                                                   |
| SR-5  | Temporary login role survives if the owner connection dies mid-run                                                                     | Low      | **Documented** — runbook check and remedy (section 4)                                                                       |
| SR-6  | Temporary password is a literal in a DDL statement, so a server statement log or the pooler can see it                                 | Low      | **Accepted** — cleared in the same run; Supabase default `log_statement = none`                                             |
| SR-7  | Immediate re-import can fail `28P01` from the pooler verifier cache                                                                    | Low      | **Documented + handled** — specific error, one-import rule                                                                  |
| SR-8  | `postgres` remains a member of `evidence_importer`; the revoke cannot succeed                                                          | Info     | **Accepted** — not an escalation, asserted and reported                                                                     |
| SR-9  | Dormancy probe must ignore the import's own lingering backend on a pooled server                                                       | Low      | **Fixed** — compares `backend_start` with cleanup time                                                                      |
| SR-10 | `statement_timeout` of 120s bounds a large catalogue import                                                                            | Info     | **Documented** — raise deliberately, not by removing the timeout                                                            |

No finding is rated Critical. SR-1 is the one that mattered: with verification
off, anyone able to intercept the connection learned the project password, which
is the highest-value secret in the system, and nothing in the run would have shown
it.

---

## 9. Residual risks

1. **Owner password in the environment.** Unavoidable for a password-authenticated
   connection. Mitigated by never storing it in the repository and by using it
   only for this procedure.
2. **Trust anchor supplied from outside.** `--ca` is only as trustworthy as the file
   the operator downloads; the alternative — no verification — is strictly worse.
3. **Residue window (SR-5).** Accepted, with a one-query check.
4. **Statement-log exposure (SR-6).** Accepted; the credential is dead by then.
5. **The seed's guarantees are only as good as its triggers.** If a future
   migration weakens the lifecycle guard, the importer will not notice. The
   integration suite's guard tests are the control.
6. **A compromised operator account.** Out of scope: an attacker with the
   dashboard session can do all of this and more without the script.

---

## 10. Verification performed

- Default TLS against hosted pooler: refused, `SELF_SIGNED_CERT_IN_CHAIN`, exit 1,
  message names `--ca` and `--insecure-tls`. Measured on a disposable project with
  no credential created.
- `--ca` pinning against hosted: **not verified.** Two disposable projects
  (`bloom-p22-verify8`, `-9`) became unreachable at the pooler before the import
  ran; both were deleted. The untested surface is the trust-anchor read plus one
  successful verified handshake — the refusal path and every code path that does
  not connect are measured.
- Wrong `--confirm-target`: exit 2, before connecting.
- Port 6543: exit 2, before connecting.
- Missing `SUPABASE_DB_PASSWORD`: exit 2.
- Applied import: exit 0; seven counts asserted; `rolcanlogin = false`; login with
  the temporary password rejected; memberships `postgres` only, grantor
  `supabase_admin`; no importer session left open.
- Repeat import: recorded in
  [`vitalis-p2.2-hosted-verification-evidence.md`](./vitalis-p2.2-hosted-verification-evidence.md)
  section 10.
- Production read-only identity check via the dashboard SQL editor: section 11.

---

## 11. Production state at review time

The dashboard SQL editor, signed in as the project owner, returned:

```
current_user = postgres    session_user = postgres
is_superuser = false       bypass_rls = true
server_port = 5432         guc_port = 5432
evidence_importer roles = 0
evidence_* policies = 0
applied migrations = 18
```

So production has none of the P2.2 evidence migrations applied, no importer role
and no evidence tables. The importer has therefore never run against production,
and nothing in this phase changed it. The hosted verification described above was
performed exclusively on disposable projects.
