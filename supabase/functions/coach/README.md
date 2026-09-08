# Bloom Coach — Edge Function

Turns a question plus a *derived* view of the person's record into an answer.
Never sees raw entries, stores nothing, and its failure mode is the client
answering on-device instead.

## Deploy

```bash
supabase functions deploy coach
```

## Secrets

Set only the keys for the providers you actually want.

```bash
# APInex — one key, many models (Gemini, GPT, Claude, DeepSeek...)
supabase secrets set APINEX_API_KEY=sk-apx...

# Optional: OpenAI directly
supabase secrets set OPENAI_API_KEY=sk-...
```

Keys live here and only here. They are never in the client bundle, never in
`.env`, and never committed — the client sends a provider *id*, and the
function looks up which secret to read.

## Providers

| Picker entry | id | Secret | Model (override) |
|---|---|---|---|
| Gemini 3.8 Flash | `gemini` | `APINEX_API_KEY` | `gemini/3.8-flash` (`COACH_MODEL_GEMINI`) |
| Gemini 3.8 Flash (free) | `gemini-free` | `APINEX_API_KEY` | `free/gemini-3.8-flash` (`COACH_MODEL_GEMINI_FREE`) |
| OpenAI | `bloom` | `OPENAI_API_KEY` | `gpt-4o-mini` (`COACH_MODEL`) |
| On this device | `local` | — | no network |

Model ids are overridable from the Supabase dashboard, so when a gateway
renames or retires one you can fix it without redeploying:

```bash
supabase secrets set COACH_MODEL_GEMINI=gemini/3.1-pro
```

## Adding another model

APInex models are one entry, since the gateway is OpenAI-compatible:

```ts
kimi: {
  env: "APINEX_API_KEY",
  call: (key, messages) =>
    openAICompatible(key, messages,
      "https://api.apinex.bond/v1/chat/completions",
      Deno.env.get("COACH_MODEL_KIMI") ?? "kimi/k3"),
},
```

A different vendor's own API needs a bespoke `call` — the body shape, auth
header and response parsing all differ.

Either way, add a matching entry to `PROVIDERS` in
`src/lib/coach/providers.ts` so it appears in the picker.
`src/lib/coach/providers.test.ts` fails if the two tables disagree.

## Checking it works

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/coach" \
  -H "Authorization: Bearer <anon key>" \
  -H "Content-Type: application/json" \
  -d '{"message":"why am I tired?","provider":"gemini","register":"brief"}'
```

A `200` with `{"paragraphs":[...]}` means it's live. Anything else and the app
answers on-device — check the function logs in the dashboard.

