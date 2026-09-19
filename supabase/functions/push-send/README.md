# push-send — reminders while the app is closed

The cron-driven sender. It rebuilds each subscriber's reminder state from
their synced rows, runs the **same** `dueReminders` + copy engine the app
runs (imported from `src/lib/reminders`), and Web-Pushes whatever is due to
every stored subscription (`push_subscriptions`, created by migration
`20260919120000_push_subscriptions.sql`). The `push` handler in `public/sw.js`
shows what arrives; tapping it opens the reminder's URL.

Nothing happens until the three steps below are done — until then the
in-app scheduler remains the whole story, exactly as before.

## 1. Keys (you, once)

```bash
npx web-push generate-vapid-keys
```

Keep the **private** key server-side only; the **public** key also ships to
the browser so it can subscribe.

## 2. Secrets + deploy

```bash
supabase secrets set VAPID_PUBLIC_KEY=...    # same value as VITE_VAPID_PUBLIC_KEY
supabase secrets set VAPID_PRIVATE_KEY=...   # never in the client
supabase secrets set VAPID_SUBJECT=mailto:you@yourdomain
supabase secrets set PUSH_CRON_SECRET=<a long random string>
supabase functions deploy push-send
```

Client side, add the public key to `.env` (see `.env.example`) and restart
the dev server — turning reminders on then subscribes the device.

## 3. A schedule

Any cron that POSTs with the secret works. From Supabase SQL (pg_cron +
pg_net), every 15 minutes:

```sql
select cron.schedule(
  'bloom-push-send',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/push-send',
    headers := jsonb_build_object('x-cron-secret', '<the same PUSH_CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

(Storing the cron secret in the schedule is the standard pg_net pattern; or
call the URL from any external cron with the same header.)

## Behaviour notes

- One notification per reason per day, per device — `sent_keys` on the
  subscription row dedupes; the in-app scheduler and push never double-send
  the same key to the same device.
- Dead subscriptions (404/410) are deleted automatically.
- v1 honesty: "today" is the UTC day (per-user timezones aren't stored), and
  the server-side cycle model mirrors the client's `analyzeCycle` directly
  (it imports the same pure module).
