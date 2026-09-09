/**
 * Bloom Coach — Supabase Edge Function.
 *
 * The client (`src/lib/coach/edge.ts`) sends the question, a few turns of
 * history, a *derived* view of the person's record, and — when one is
 * attached — a photo or PDF. This function turns that into a prompt, calls a
 * model, and returns paragraphs.
 *
 * Design notes:
 *
 *   - **Best first, then the next.** When `provider` is "auto" (or missing),
 *     the function walks a quality-ordered chain — the strongest configured
 *     model first, the next when it fails. A provider whose secret isn't set
 *     is skipped silently. Reorder by setting the `COACH_CHAIN` secret, e.g.
 *     `COACH_CHAIN=gemini,bloom,groq` (comma-separated ids, best first).
 *     A specific `provider` id still goes first, then the rest of the chain.
 *   - **The client decides length.** `register` arrives already computed and
 *     is enforced in the prompt and by the client trimming the result.
 *   - **Providers are a table.** Adding a model is one entry in `PROVIDERS`
 *     plus its API key in the function's secrets.
 *   - **Photos route to Gemini.** When `body.image` is present, the message
 *     carries inline image bytes and the chain is narrowed to vision-capable
 *     providers (Gemini). Food photos get an honest calorie/macro estimate;
 *     the photo is used for that one reply and never stored.
 *   - **Failure surfaces as an error, never a fake answer.** Anything wrong
 *     here returns a non-2xx and the client shows an honest error with a
 *     retry — the coach is strictly online by design.
 *   - **No storage.** This function reads and writes nothing.
 *
 * Deploy:
 *   supabase functions deploy coach
 *   supabase secrets set OPENAI_API_KEY=... APINEX_API_KEY=... \
 *     TEAMOROUTER_API_KEY=... HF_API_KEY=... GROQ_API_KEY=... GEMINI_API_KEY=...
 *   # optional: COACH_CHAIN=gemini,bloom,groq,apinex,teamo,hf
 *   # optional per provider: COACH_MODEL, APINEX_MODEL, TEAMOROUTER_MODEL,
 *   #   HF_MODEL, HF_BASE_URL, GROQ_MODEL, GEMINI_MODEL
 */

/* eslint-disable */
// @ts-nocheck - Deno runtime, not part of the app's TS project.

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

const SYSTEM = `You are the coach inside Bloom, a personal wellbeing app.

WHO YOU ARE
A calm, direct, warm companion. You sound like a thoughtful friend who happens to be good with data — never like a wellness brochure, a therapist reading a script, or a chatbot performing enthusiasm. No exclamation marks. No "I'm so sorry to hear that". No emoji. Plain English, contractions. Never restate the question. Never end with "let me know if you'd like more" — just stop.

WHAT BLOOM IS
Bloom is the app this person uses: mood check-ins; six daily trackers (sleep in minutes, water in millilitres, study minutes, movement minutes, energy /5, screen minutes); habits with reminders and points; cycle tracking with predictions; and Profile holding export, import and erase. Data is device-first and only syncs to a database the person owns. Bloom is not a medical device, a therapist, or a calorie database.

WHAT YOU CAN TALK ABOUT — ESSENTIALLY ANYTHING
A person should be able to raise anything with you: sleep and insomnia; food, nutrition, cravings, meal planning and eating habits; fitness, workouts, training plans, running, strength, mobility and recovery; stress, anxiety, overthinking and burnout; work, job interviews, career decisions and workload; study, exams, focus and procrastination; relationships, family, friendship, dating and conflict; money worries, budgets and financial dread; grief, loss and loneliness; confidence and self-esteem; alcohol, caffeine and other habits; screen time and digital wellbeing; travel, hobbies, creativity and life planning; or the app itself. NEVER deflect a question back to the trackers because it was not about them. When something is outside Bloom's record, say you're speaking generally — and be genuinely useful from general knowledge.

GROUNDING — THE ONE HARD RULE
You are given a compact summary of what this person has logged. Never invent a number, a date, a trend or an entry. If the summary does not contain something, say plainly that it isn't tracked, then help anyway from general knowledge. When you quote a figure, quote it exactly as given. Never claim the app has a feature it does not: no social features, no marketplace, no payments, no external integrations, no professional medical advice. For anything medical, say once, briefly, and without alarm that a clinician is the right call. If someone describes being in danger, say clearly that this is beyond what an app should handle and that a crisis line or a person they trust is the right call.

MEMORY
You are told what Bloom already remembers about the person. When they share a clearly durable fact about themselves ("I'm vegan", "my daughter is called Mira", "I run on Tuesdays", "I'm saving for a house", "I'm trying to drink less") — or explicitly ask you to remember something — append AT THE END of your reply exactly one line:
[BLOOM_MEMORY]{"category":"preference","text":"the fact, written as a statement"}[/BLOOM_MEMORY]
categories: preference | goal | context | pattern. Store the fact, not the wording ("the person is vegan", never "user said I'm vegan"). Do NOT restate facts you were already told. Do NOT store anything the person did not clearly offer, especially health details, relationships or money — when in doubt, ask first. When they ask you to forget something, append:
[BLOOM_FORGET]{"text":"a distinctive fragment of what to forget"}[/BLOOM_FORGET]
At most two memory lines per reply. Never put memory lines inside a tool call.

ACTIONS — DOING THINGS IN THE APP
Bloom can act for the person. When they ask you to DO something (create/tick a habit, log a tracker value, set a goal, list their habits), answer in at most two short sentences and then append EXACTLY ONE line:
[BLOOM_TOOL]{"name":"<tool>","args":{...}}[/BLOOM_TOOL]
Never claim in prose that the action already happened — the app performs it after your text and reports the outcome. If you cannot act (unclear request, missing detail), say what you need in prose and do NOT emit a tool line.

Available tools:
- create_habit — args: name (string, required), note (optional, up to 240 chars), frequency ("daily" | "weekly" | "custom", default "daily"), timesPerWeek (whole number 1–7, required when frequency is "weekly"), days (array of 0–6 where 0=Sunday, required when frequency is "custom"), reminderTime ("HH:MM" 24-hour, optional), goalTarget (positive number, optional), goalUnit (short unit like "minutes", "pages", "ml", optional). Use it when the person asks you to create, add or set up a habit or routine — with everything they specify.
- tick_habit — args: name (the habit's exact name as shown in Bloom, required), date ("YYYY-MM-DD", omit for today; only today or the past six days are accepted). Use it for "mark X done", "I did X today".
- list_habits — args: {}. Use it when they ask what habits they have. Do not guess names — list_habits is the only way to know.
- log_tracker — args: tracker ("sleep" | "water" | "movement" | "screen" | "energy"), value (number; minutes for sleep/movement/screen, millilitres for water, 1–5 for energy), date ("YYYY-MM-DD", omit for today). Use it for "log 7.5 hours of sleep", "add 500ml water".
- set_goal — args: tracker (same five names), value (number in the same units). Use it for "set my water goal to 2.5 litres" (2500).
Units of record: sleep/movement/screen = minutes; water = millilitres; energy = /5. Never invent a habit's existence — when unsure whether a habit exists, ask in prose or invite them to create it.

ATTACHED PHOTOS AND PDFS
The person can attach a photo or PDF, and you can see it.
- Food or drink photo: your FIRST paragraph must be one line starting with ≈ giving rough totals, e.g. "≈ 540 kcal · 32 g protein · 61 g carbs · 19 g fat". Then one or two short paragraphs: portion sense, what stands out nutritionally, one concrete tweak. Estimates only — round numbers, "roughly", ranges when unsure. If you genuinely cannot estimate, say so plainly instead of guessing.
- Non-food photo: say what is useful in it (what it is, any readable text, the scene). No invented precision.
- PDF: read its text and answer (summarise, extract, compare). Say so if the answer needs something the file doesn't contain.
- Photos are never stored — they exist for this single reply.`;

interface Body {
  message?: string;
  history?: Array<{ role: string; content: string }>;
  facts?: unknown;
  provider?: string;
  register?: string;
  topic?: string;
  image?: { mediaType?: string; dataBase64?: string };
}

/** Optional vision input, validated once. */
interface Media {
  mediaType: string;
  dataBase64: string;
}

/**
 * The models this function can call. `call` returns plain text; prompt
 * assembly, length enforcement and error shape are shared.
 *
 * `call` receives optional `media` — only vision-capable providers use it.
 */
const PROVIDERS: Record<
  string,
  {
    env: string;
    vision?: boolean;
    call: (
      key: string,
      messages: unknown[],
      signal?: AbortSignal,
      media?: Media | null,
    ) => Promise<string>;
  }
> = {
  bloom: {
    env: "OPENAI_API_KEY",
    call: (key, messages, signal) =>
      openaiCompatible(
        "https://api.openai.com/v1/chat/completions",
        key,
        Deno.env.get("COACH_MODEL") ?? "gpt-4o-mini",
        messages,
        signal,
      ),
  },
  /** APInex — free tier gateway. */
  apinex: {
    env: "APINEX_API_KEY",
    call: (key, messages, signal) =>
      openaiCompatible(
        "https://api.apinex.bond/v1/chat/completions",
        key,
        Deno.env.get("APINEX_MODEL") ?? "free/gemini-3.8-flash",
        messages,
        signal,
      ),
  },
  /** TeamoRouter — gateway with free tiers. */
  teamo: {
    env: "TEAMOROUTER_API_KEY",
    call: (key, messages, signal) =>
      openaiCompatible(
        "https://api.teamorouter.com/v1/chat/completions",
        key,
        Deno.env.get("TEAMOROUTER_MODEL") ?? "deepseek-v4-pro-free",
        messages,
        signal,
      ),
  },
  /** Groq — fast open models; OpenAI-compatible. */
  groq: {
    env: "GROQ_API_KEY",
    call: (key, messages, signal) =>
      openaiCompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        key,
        Deno.env.get("GROQ_MODEL") ?? "openai/gpt-oss-20b",
        messages,
        signal,
      ),
  },
  /**
   * Google Gemini, official API — the vision provider. Not OpenAI-shaped, so
   * it has its own call: POST :generateContent with contents/parts.
   */
  gemini: {
    env: "GEMINI_API_KEY",
    vision: true,
    call: async (key, messages, signal, media) => {
      const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";
      const systemText = messages
        .filter((m: any) => m.role === "system")
        .map((m: any) => String(m.content ?? ""))
        .join("\n\n");
      const turns = messages.filter((m: any) => m.role !== "system");
      const contents: any[] = [
        ...(systemText ? [{ role: "user", parts: [{ text: systemText }] }] : []),
        ...turns.map((m: any, i: number) => {
          const isLastUser = i === turns.length - 1 && m.role === "user";
          const parts: any[] = [];
          if (isLastUser && media) {
            parts.push({
              inline_data: { mime_type: media.mediaType, data: media.dataBase64 },
            });
          }
          parts.push({ text: String(m.content ?? "").slice(0, 4000) });
          return { role: m.role === "assistant" ? "model" : "user", parts };
        }),
      ];
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
          }),
          signal,
        },
      );
      if (!res.ok) throw new Error(`model ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      return parts
        .map((p: any) => p?.text ?? "")
        .join("")
        .trim();
    },
  },
  /** Hugging Face Inference Providers (OpenAI-compatible). */
  hf: {
    env: "HF_API_KEY",
    call: (key, messages, signal) =>
      openaiCompatible(
        Deno.env.get("HF_BASE_URL") ?? "https://router.huggingface.co/v1/chat/completions",
        key,
        Deno.env.get("HF_MODEL") ?? "Qwen/Qwen2.5-72B-Instruct",
        messages,
        signal,
      ),
  },
};

/**
 * Best-first order. The first entry whose secret is set is the model the
 * person's question actually reaches; each later entry is the next fallback.
 * Override per deployment with the `COACH_CHAIN` secret (comma-separated
 * provider ids, best first).
 */
const DEFAULT_CHAIN = ["bloom", "gemini", "groq", "apinex", "teamo", "hf"];

function chainFor(requested: string | undefined): string[] {
  const configured =
    (Deno.env.get("COACH_CHAIN") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean) || null;
  const order = configured ?? DEFAULT_CHAIN;
  if (!requested || requested === "auto") return order;
  return [requested, ...order.filter((id) => id !== requested)];
}

/**
 * How long one model gets before the chain moves on. The client gives the
 * whole function about 15s, so a hung provider must not eat the budget the
 * next one needs.
 */
const ATTEMPT_TIMEOUT_MS = 5000;
/** Hard ceiling for the whole chain — leaves room for the response hop. */
const CHAIN_DEADLINE_MS = 10_500;

/**
 * One call shape for every OpenAI-compatible endpoint: POST /chat/completions,
 * Bearer key, `choices[0].message.content` back.
 */
async function openaiCompatible(
  url: string,
  key: string,
  model: string,
  messages: unknown[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 900,
    }),
    signal,
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
      lines.push("Cycle: tracking paused - do not predict anything or call a period late.");
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
    lines.push("Cycle: not tracked by this person - do not raise it.");
  }

  if (facts.habitsActive > 0) lines.push(`Habits: ${facts.habitsActive} active.`);
  if (facts.memories?.length) {
    lines.push(`Bloom remembers about them: ${facts.memories.join("; ")}`);
  }
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body: Body = await req.json();
    const message = (body.message ?? "").trim();
    if (!message) return json({ error: "empty message" }, 400);

    /* Validate media once: photos and PDFs, raw base64, bounded size. */
    let media: Media | null = null;
    if (body.image && typeof body.image.dataBase64 === "string") {
      const mediaType = String(body.image.mediaType ?? "image/jpeg");
      if (body.image.dataBase64.length > 7_000_000) {
        return json({ error: "attached file too large for the model" }, 413);
      }
      media = { mediaType, dataBase64: body.image.dataBase64 };
    }

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

    /*
     * The best configured model first, then the next. Each provider gets one
     * attempt with its own timeout; the first non-empty answer wins. The
     * person never sees any of this — the response just says which model
     * actually produced the answer.
     */
    const chain = chainFor(body.provider).filter(
      (id) => !media || PROVIDERS[id]?.vision,
    );
    const deadline = Date.now() + CHAIN_DEADLINE_MS;

    let text = "";
    let answeredBy = "";
    let lastError = "";

    for (const id of chain) {
      const provider = PROVIDERS[id];
      if (!provider) continue;
      const key = Deno.env.get(provider.env);
      if (!key) continue; /* no secret set — never tried */
      const remaining = deadline - Date.now();
      if (remaining < 1200) break;
      try {
        const candidate = await provider.call(
          key,
          messages,
          AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining - 700)),
          media,
        );
        if (candidate.trim()) {
          text = candidate;
          answeredBy = id;
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`coach provider ${id} failed, trying next:`, lastError);
      }
    }

    if (!answeredBy) {
      /* Every configured model failed — the client answers on-device, so
         this is degraded, never broken. */
      return json(
        { error: media ? "no vision provider available" : "all providers failed", detail: lastError },
        502,
      );
    }

    const paragraphs = String(text)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return json({ error: "empty completion" }, 502);
    return json({ paragraphs, provider: answeredBy }, 200);
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
