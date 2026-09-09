# Coach edge function

The remote brain for Bloom's coach. The app calls it through
`supabase.functions.invoke("coach", …)` for **every** message — the coach is
strictly online and has no on-device fallback. If the function is missing,
cold, slow or erroring, the app shows an honest error with a retry, so deploy
this function and set the keys below before relying on the coach.

## Deploy

```bash
supabase functions deploy coach
supabase secrets set OPENAI_API_KEY=sk-...
```

Set whichever of the provider secrets you actually have (all optional —
providers without a secret are skipped automatically):

```bash
supabase secrets set OPENAI_API_KEY=sk-...        # provider: bloom
supabase secrets set GEMINI_API_KEY=...           # provider: gemini (vision)
supabase secrets set GROQ_API_KEY=...             # provider: groq
supabase secrets set APINEX_API_KEY=...           # provider: apinex (free tier)
supabase secrets set TEAMOROUTER_API_KEY=...      # provider: teamo (free tier)
supabase secrets set HF_API_KEY=...               # provider: hf (Hugging Face)
```

### Best model first

The coach answers **auto** (the default) by walking a quality-ordered chain —
the strongest connected model first, the next one when it fails, and so on.
Set the order for your keys with:

```bash
supabase secrets set COACH_CHAIN=gemini,bloom,groq,apinex,teamo,hf
```

(`bloom,gemini,groq,apinex,teamo,hf` is the default.) Providers whose secret
is missing are skipped; a specific provider chosen in the app still goes
first, followed by the rest of the chain.

Optional per-provider model overrides:

```bash
supabase secrets set COACH_MODEL=gpt-4o-mini        # bloom / OpenAI
supabase secrets set GEMINI_MODEL=gemini-2.5-flash   # gemini (pick a model your key can reach)
supabase secrets set GROQ_MODEL=openai/gpt-oss-20b
supabase secrets set APINEX_MODEL=free/gemini-3.8-flash
supabase secrets set TEAMOROUTER_MODEL=deepseek-v4-pro-free
supabase secrets set HF_MODEL=Qwen/Qwen2.5-72B-Instruct
supabase secrets set HF_BASE_URL=https://router.huggingface.co/v1
```

## Contract

Request body:

| field      | type            | meaning                                        |
| ---------- | --------------- | ---------------------------------------------- |
| `message`  | string          | what was just asked                            |
| `history`  | `{role,content}[]` | last 8 turns, oldest first                  |
| `facts`    | object          | derived record — averages, streaks, phase      |
| `provider` | string          | "auto", or a specific model id                 |
| `register` | string          | how long the answer may be                     |
| `topic`    | string          | what the client classified it as               |
| `image`    | `{mediaType, dataBase64}` | attached photo/PDF (optional)     |

Response: `{ "paragraphs": string[], "provider": string }`. A plain
`{ "reply": "…" }` or `{ "text": "…" }` is also accepted. Anything non-2xx
makes the app show an error with a retry — the coach never substitutes an
on-device answer.

### Photos (Gemini vision)

When `image` is present the chain narrows to vision-capable providers
(Gemini) and the photo rides inline with the question. Food photos produce an
honest calorie/macro estimate; other photos get a useful description; PDFs
are read as text. Photos are never stored.

### Memory & app actions

The reply can carry structured directives that the app executes:

```text
[BLOOM_MEMORY]{"category":"preference","text":"the person is vegan"}[/BLOOM_MEMORY]
[BLOOM_FORGET]{"text":"my old gym"}[/BLOOM_FORGET]
[BLOOM_TOOL]{"name":"create_habit","args":{"name":"Read","frequency":"daily","reminderTime":"21:00"}}[/BLOOM_TOOL]
```

The client strips these from the visible prose, saves/removes memories on the
device (and the account when signed in), and runs supported tools — see
`src/lib/coach/sidecar.ts` and `src/lib/coach/tools.ts`.

## Privacy

Only *derived* numbers are sent: per-tracker averages, goals, streaks, day
counts, cycle phase, stored memories, and the photo the person just attached.
No raw entries, no check-in text, no history beyond the current conversation.
Nothing is read from or written to the database here.
