/**
 * Bloom Coach — Supabase Edge Function.
 *
 * The client (`src/lib/coach/edge.ts`) sends the question, a few turns of
 * history, and a *derived* view of the person's record — averages, streaks,
 * the current phase, never raw entries. This function turns that into a
 * prompt, calls whichever model the `provider` asks for, and returns
 * paragraphs.
 *
 * Design notes:
 *
 *   · **The client decides length.** `register` arrives already computed from
 *     the shape of the question, and is enforced twice — in the prompt, and by
 *     the client trimming the result. A model asked for one line still tends
 *     to write three.
 *   · **Providers are a table.** Adding a model is one entry in `PROVIDERS`
 *     plus its API key in the function's secrets; nothing on the client
 *     changes beyond listing it in `providers.ts`.
 *   · **Failure is the client's fallback, not an error page.** Any problem
 *     returns a non-2xx, and Bloom answers on-device instead. That is why
 *     there is no retry logic here: the user already has a working answer path.
 *   · **No storage.** This function reads nothing and writes nothing. The
 *     conversation lives on the device.
 *
 * Deploy:
 *   supabase functions deploy coach
 *   supabase secrets set OPENAI_API_KEY=...
 *
 * Other models (each optional — only set the secrets for the ones you use):
 *   supabase secrets set APINEX_API_KEY=...        # APInex (free Gemini 3.8 Flash)
 *   supabase secrets set TEAMOROUTER_API_KEY=...   # TeamoRouter (free DeepSeek V4 Pro)
 *   supabase secrets set HF_API_KEY=...            # Hugging Face (router or serverless)
 *   supabase secrets set HF_BASE_URL=...           # only for the serverless endpoint
 *   supabase secrets set HF_MODEL=...              # any HF model id
 */

/* eslint-disable */
// @ts-nocheck — Deno runtime, not part of the app's TS project.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** How long an answer may be, per register the client computed. */
const LENGTH_RULE: Record<string, string> = {
  terse:
    "Answer in ONE short sentence. No preamble, no follow-up question, no list. Under 30 words.",
  brief:
    "Answer in one short paragraph, at most three sentences. No lists. Under 70 words.",
  normal:
    "Answer in at most two short paragraphs. Under 150 words. Only use a list if the answer is genuinely a sequence of steps.",
  full: "Answer in at most four paragraphs. Under 320 words. Be thorough but do not pad.",
};

const SYSTEM = `You are the coach inside Bloom, a personal wellbeing tracker.

WHO YOU ARE
A calm, direct, warm companion. You sound like a thoughtful friend who happens
to be good with data — never like a wellness brochure, a therapist reading a
script, or a chatbot performing enthusiasm. No exclamation marks. No "I'm so
sorry to hear that". No emoji.

WHAT YOU KNOW
You are given a compact summary of what this person has logged: daily trackers
(sleep, water, study, movement, energy, screen time) with today's value, their
goal, a seven-day average and a streak; their cycle position if they track one;
how many habits are active; and any notes they pinned for you.

GROUNDING — THE ONE HARD RULE
Never invent a number, a date, a trend or an entry. If the summary does not
contain something, say plainly that it isn't tracked, then help anyway from
general knowledge. Being useful without data is fine; pretending to have data
is not. When you do quote a figure, quote it exactly as given.

SCOPE
You can talk about anything a person would raise with someone who knows their
week: sleep, food, caffeine, work, study, money worry, relationships, grief,
loneliness, motivation, confidence, the app itself, or nothing much at all.
Do not deflect a question back to the trackers because it wasn't about them.

CARE
For grief, loneliness, pain, illness, body image, money or relationships: lead
with the person, not the record. One honest sentence beats three sympathetic
ones. You are not a clinician — for anything medical, say so once, briefly, and
without alarm. If someone describes being in danger, say clearly that this is
beyond what an app should handle and that a crisis line or a person they trust
is the right call.

STYLE
Plain English. Contractions. No headers unless asked. No bullet lists unless
the answer really is a sequence. Never restate the question. Never end with
"let me know if you'd like more" — just stop.`;

interface Body {
  message?: string;
  history?: Array<{ role: string; content: string }>;
  facts?: unknown;
  provider?: string;
  register?: string;
  topic?: string;
}

/**
 * The models this function can call. `call` returns plain text; everything
 * else — prompt assembly, length enforcement, error shape — is shared.
 *
 * Adding one is a table entry here (plus a matching entry in the client's
 * `src/lib/coach/providers.ts` and the API key as a function secret).
 */
const PROVIDERS: Record<
  string,
  { env: string; call: (key: string, messages: unknown[]) => Promise<string> }
> = {
  bloom: {
    env: "OPENAI_API_KEY",
    call: (key, messages) =>
      openaiCompatible(
        "https://api.openai.com/v1/chat/completions",
        key,
        Deno.env.get("COACH_MODEL") ?? "gpt-4o-mini",
        messages,
      ),
  },
  /** APInex — free tier gateway; Gemini 3.8 Flash is their free model. */
  apinex: {
    env: "APINEX_API_KEY",
    call: (key, messages) =>
      openaiCompatible(
        "https://api.apinex.bond/v1/chat/completions",
        key,
        Deno.env.get("APINEX_MODEL") ?? "free/gemini-3.8-flash",
        messages,
      ),
  },
  /** TeamoRouter — gateway with free DeepSeek V4 tiers. */
  teamo: {
    env: "TEAMOROUTER_API_KEY",
    call: (key, messages) =>
      openaiCompatible(
        "https://api.teamorouter.com/v1/chat/completions",
        key,
        Deno.env.get("TEAMOROUTER_MODEL") ?? "deepseek-v4-pro-free",
        messages,
      ),
  },
  /**
   * Hugging Face Inference Providers (router.huggingface.co/v1) — OpenAI-
   * compatible; some providers are free. The serverless Inference API
   * (api-inference.huggingface.co/v1) speaks the same shape, so set
   * HF_BASE_URL to point at whichever the key belongs to.
   */
  hf: {
    env: "HF_API_KEY",
    call: (key, messages) =>
      openaiCompatible(
        Deno.env.get("HF_BASE_URL") ?? "https://router.huggingface.co/v1/chat/completions",
        key,
        Deno.env.get("HF_MODEL") ?? "Qwen/Qwen2.5-72B-Instruct",
        messages,
      ),
  },
};

/**
 * One call shape for every OpenAI-compatible gateway (APInex, TeamoRouter,
 * Hugging Face, and OpenAI itself): POST /chat/completions, Bearer key,
 * `choices[0].message.content` back.
 */
async function openaiCompatible(
  url: string,
  key: string,
  model: string,
  messages: unknown[],
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 700,
    }),
  });
  if (!res.ok) throw new Error(`model ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

/** Render the derived record as something a model reads well. */
function factsToPrompt(facts: any): string {
  if (!facts) return "No record available.";
  const lines: string[] = [`Today is ${facts.today}.`];

  const logged = (facts.trackers ?? []).filter((t: any) => t.daysLogged > 0);
  if (logged.length === 0) {
    lines.push("Nothing has been logged on any tracker yet.");
  } else {
    lines.push("Trackers:");
    for (const t of logged) {
      const bits = [
        t.today !== null ? `today ${t.today}` : "nothing logged today",
        `goal ${t.goal}`,
        t.avg7 !== null ? `7-day average ${Math.round(t.avg7 * 10) / 10}` : null,
        t.streak > 0 ? `${t.streak}-day streak` : null,
        `${t.daysLogged} days logged`,
      ].filter(Boolean);
      lines.push(`- ${t.name}: ${bits.join(", ")}`);
    }
    const untracked = (facts.trackers ?? []).filter((t: any) => t.daysLogged === 0);
    if (untracked.length > 0) {
      lines.push(`Never logged: ${untracked.map((t: any) => t.name).join(", ")}.`);
    }
  }

  if (facts.cycle) {
    const c = facts.cycle;
    if (c.paused) {
      lines.push("Cycle: tracking paused — do not predict anything or call a period late.");
    } else {
      lines.push(
        `Cycle: ${c.cycleDay ? `day ${c.cycleDay}` : "day unknown"}${
          c.phase ? `, ${c.phase} phase` : ""
        }${c.daysUntilNext !== null ? `, next period in about ${c.daysUntilNext} days` : ""}${
          c.averageLength ? `, average length ${c.averageLength} days` : ""
        }.`,
      );
    }
  } else {
    lines.push("Cycle: not tracked by this person — do not raise it.");
  }

  if (facts.habitsActive > 0) lines.push(`Habits: ${facts.habitsActive} active.`);
  if (facts.memories?.length) {
    lines.push(`They asked you to remember: ${facts.memories.join("; ")}`);
  }
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body: Body = await req.json();
    const message = (body.message ?? "").trim();
    if (!message) return json({ error: "empty message" }, 400);

    const providerId = body.provider && PROVIDERS[body.provider] ? body.provider : "bloom";
    const provider = PROVIDERS[providerId];
    const key = Deno.env.get(provider.env);
    if (!key) return json({ error: `${provider.env} not set` }, 500);

    const rule = LENGTH_RULE[body.register ?? "normal"] ?? LENGTH_RULE.normal;

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `THEIR RECORD\n${factsToPrompt(body.facts)}` },
      { role: "system", content: `LENGTH\n${rule}` },
      ...(body.history ?? [])
        .filter((m) => m && typeof m.content === "string")
        .slice(-8)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content).slice(0, 4000),
        })),
      { role: "user", content: message.slice(0, 4000) },
    ];

    const text = await provider.call(key, messages);
    const paragraphs = String(text)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return json({ error: "empty completion" }, 502);
    return json({ paragraphs, provider: providerId }, 200);
  } catch (err) {
    /* The client falls back to its on-device answer, so a 500 here is a
       degraded experience rather than a broken one. */
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}