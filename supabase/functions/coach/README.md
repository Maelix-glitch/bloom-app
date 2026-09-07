# Coach edge function

The remote brain for Bloom's coach. The app calls it through
`supabase.functions.invoke("coach", …)` and **falls back to the on-device
responder** whenever it is missing, cold, slow or erroring — so deploying this
is an upgrade, never a dependency.

## Deploy

```bash
supabase functions deploy coach
supabase secrets set OPENAI_API_KEY=sk-...
```

Optional:

```bash
supabase secrets set COACH_MODEL=gpt-4o-mini   # defaults to gpt-4o-mini
```

If your function is deployed under a different name, point the app at it:

```
VITE_COACH_FUNCTION=my-coach-name
```

## Contract

Request body:

| field      | type                                   | meaning                                     |
| ---------- | -------------------------------------- | ------------------------------------------- |
| `message`  | string                                 | what was just asked                          |
| `history`  | `{role, content}[]`                    | last 8 turns, oldest first                   |
| `facts`    | object                                 | derived record — averages, streaks, phase    |
| `provider` | string                                 | which model to use                           |
| `register` | `terse\|brief\|normal\|full`           | how long the answer may be                   |
| `topic`    | string                                 | what the client classified it as             |

Response: `{ "paragraphs": string[], "provider": string }`. A plain
`{ "reply": "…" }` or `{ "text": "…" }` is also accepted — the client splits it
on blank lines.

Anything non-2xx makes the app answer locally instead.

## Privacy

Only *derived* numbers are sent: per-tracker averages, goals, streaks, day
counts, cycle phase, and any notes the person explicitly pinned. No raw
entries, no check-in text, no history beyond the current conversation. Nothing
is read from or written to the database here.

## Adding another AI

1. Add an entry to `PROVIDERS` in `index.ts` with its `env` key and a `call`
   that returns plain text.
2. Set the secret: `supabase secrets set ANTHROPIC_API_KEY=...`
3. Add the matching entry to `PROVIDERS` in `src/lib/coach/providers.ts`.

The picker in the app renders whatever is registered; no component changes.
