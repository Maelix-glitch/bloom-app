/**
 * Bloom Coach — Supabase Edge Function.
 *
 * The client (`src/lib/coach/edge.ts`) sends the question, a few turns of
 * history, a *derived* view of the person's record, and — when one is
 * attached — a photo or PDF. This function turns that into a prompt, runs it
 * through the Bloom AI orchestrator, and returns paragraphs.
 *
 * ORCHESTRATOR (server-side, invisible to the UI)
 *   Provider registry (the ONLY providers):
 *     · gemini            — Google Gemini direct   (GEMINI_API_KEY, needs a real Google key; add via COACH_PROVIDER_ORDER)
 *     · grok              — Groq open models       (GROQ_API_KEY)
 *     · apinex            — APINEX gateway          (APINEX_API_KEY)
 *     · huggingface-qwen  — Qwen via HF router     (HF_TOKEN)
 *   No TeamoRouter. No local/offline provider. No client-side failover.
 *
 *   Routing: COACH_PROVIDER_ORDER (default apinex,grok,huggingface-qwen;
 *   google-direct gemini is registered but disabled by default because the
 *   direct Google key has been timing out — put it first with
 *   COACH_PROVIDER_ORDER=gemini,apinex,grok,huggingface-qwen when it works).
 *   best first. Health-aware: rate limits (429), auth failures (401),
 *   model/permission problems (403/404), timeouts, 5xx and empty responses
 *   each get classified; transient failures trigger a capped cooldown
 *   (30s→60s→120s), auth failures disable a provider for 10 minutes, and a
 *   success resets the breaker. Each provider is attempted at most once per
 *   request, bounded by COACH_MAX_PROVIDER_ATTEMPTS (3) and a hard total
 *   deadline (COACH_TOTAL_TIMEOUT_MS, default 12s) so the user never waits
 *   through a long provider parade.
 *
 *   Adapters are transport only: every provider receives the same Bloom
 *   system prompt, the same derived facts, the same history, the same
 *   register. No provider-specific personality, reasoning traces are never
 *   read into responses, and API keys never leave the server.
 *
 *   Every provider is vision-capable (Gemini native inline_data; Groq/APINEX/HF
 *   via OpenAI image_url parts) and tool-capable (native function schemas
 *   converted to [BLOOM_TOOL] sidecars). Photos are never stored.
 *
 *   Failure is a clean consumer-safe state: any non-2xx means the client
 *   shows "Bloom couldn't connect right now" with a manual Try again — the
 *   app never fakes an answer, never exposes providers, keys or error codes.
 *
 * Deploy:
 *   supabase functions deploy coach
 *   supabase secrets set GEMINI_API_KEY=...        # Gemini (required first)
 *   supabase secrets set GROQ_API_KEY=...           # Groq (optional)
 *   supabase secrets set APINEX_API_KEY=...          # APINEX (optional)
 *   supabase secrets set HF_TOKEN=...              # HF Qwen (optional)
 *
 * Optional tuning (all server-side secrets):
 *   COACH_PROVIDER_ORDER=apinex,grok,huggingface-qwen   # gemini = Google-direct, optional
 *   COACH_GEMINI_ENABLED=true  COACH_GROK_ENABLED=true  COACH_HF_ENABLED=true
 *   GEMINI_MODEL=gemini-3.6-flash   GROQ_MODEL=openai/gpt-oss-20b
 *   APINEX_MODEL=free/gemini-3.8-flash
 *   HF_QWEN_MODEL=Qwen/Qwen3.8-27B  HF_QWEN_PROVIDER=ovhcloud   # or novita
 *   COACH_MAX_PROVIDER_ATTEMPTS=3   COACH_PROVIDER_TIMEOUT_MS=8000
 *   COACH_TOTAL_TIMEOUT_MS=18000    COACH_COOLDOWN_BASE_MS=30000
 *   COACH_COOLDOWN_MAX_MS=120000    COACH_LOG_DETAIL=false
 *   BLOOM_COACH_DEV_KEY=...  # optional: enables x-bloom-coach-dev pinning
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
  brief: "Answer in one short paragraph, at most three sentences. No lists. Under 70 words.",
  normal:
    "Answer in at most two short paragraphs. Under 150 words. Only use a list if the answer is genuinely a sequence of steps.",
  full: "Answer in at most four paragraphs. Under 320 words. Be thorough but do not pad.",
};

const SYSTEM = `You are the coach inside Bloom, a personal wellbeing app.

WHO YOU ARE
A calm, direct, warm companion. You sound like a thoughtful friend who happens to be good with data — never like a wellness brochure, a therapist reading a script, or a chatbot performing enthusiasm. No exclamation marks. No "I'm so sorry to hear that". No emoji. Plain English, contractions. Never restate the question. Never end with "let me know if you'd like more" — just stop.

BLOOM — THE APP YOU LIVE IN, KNOW IT COLD
Bloom is the wellbeing app this person uses every day. When they ask anything about Bloom itself, answer from these real facts — never sound unsure, never invent a feature:
- Today: mood/feeling check-ins, and the day's habits with one-tap ticking.
- Habits: personal routines. Each habit has a name, optional note, colour and emoji icon, a schedule (every day, N times a week, or chosen weekdays), an optional reminder time of day, and an optional measurable goal (e.g. "20 pages", "2 L water"). Ticking a habit earns +10 points by default and builds streaks. Paused or archived habits do not tick and do not earn.
- Trackers: six daily numbers — sleep (minutes), water (millilitres), study (minutes), movement (minutes), energy (1–5), screen time (minutes) — each with a goal, a 7-day average and a streak. Study is logged as timed sessions.
- Cycle: optional period tracking with phase and next-period predictions. If the person does not track a cycle, never raise it.
- Mood: quick daily check-ins; Bloom watches trends, patterns and changes over time.
- Rewards: the points total earned from habit ticks — points come from habit ticks only, that is the entire system. There are no other hidden rules.
- Memory: Bloom keeps facts the person shares and uses them in later conversations. The person can view, pin and forget them in the Memory panel.
- Profile: account details, full data export, period-history import, and a complete erase (device and account).
- The coach has three modes the person can pick: Ask, Reflect, Plan.
- Privacy: data lives on the person's device by default and syncs only to a database they own. Bloom has no social features, no marketplace, no payments, no third-party integrations, and gives no professional medical advice. It is not a therapist, a doctor, or a certified calorie database.

Answer "how do points work?", "where do I log sleep?", "what can you do?", "what is bloom?", "how do I export my data?" and every other app question from these facts.

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
Bloom can act for the person, and when the person asks you to DO something you do it — you never hand them a list of taps.
CREATING HABITS — YOU DO IT, DIRECTLY. This is the most important action rule. Whenever the person asks you to create, add, set up, start, or build a habit or routine — "create a habit to read 20 pages daily at 9pm", "add a habit to drink 2L of water", "I want to meditate every morning", "set up a workout habit three times a week", "remind me to take vitamins on weekdays", "make a daily gratitude habit" — you create it yourself with create_habit. NEVER reply with button-tapping or menu instructions ("tap the + button", "choose Habit", "open the habits page", "once saved, the app will prompt you"). The person asked you to do it because they want it done — so emit the tool.
How to build the arguments from their words: name is required (short, clear, their wording when sensible); frequency is "daily" by default, "weekly" with timesPerWeek when they say "N times a week", "custom" with days (0=Sunday) when they name weekdays ("every weekday" = [1,2,3,4,5], "on Mondays and Thursdays" = [1,4]); reminderTime when they give a time of day ("at 9pm" → "21:00", "morning" → "08:00"); goalTarget+goalUnit when the habit has a measurable amount ("20 pages" → 20 + "pages", "2 litres of water" → 2000 + "ml", "10 minutes" → 10 + "minutes"). Missing details: choose the sensible default and say it in one short clause ("I've set it for 8am — tell me if you'd rather another time"), or ask one short question when truly stuck.
Then answer in at most two short sentences and append EXACTLY ONE line:
[BLOOM_TOOL]{"name":"create_habit","args":{...}}[/BLOOM_TOOL]
The app runs the tool after your text and shows the outcome, so never write in prose that the habit now exists unless the tool line is present.
OTHER ACTIONS follow the same pattern: tick_habit for "mark X done today" / "I did X"; list_habits for "what habits do I have?" (never guess names from memory — always list); log_tracker for "log 7.5 hours of sleep", "add 500 ml of water", "I walked 30 minutes"; set_goal for "set my water goal to 2.5 litres" (2500) or "my screen limit should be 2 hours" (120). If you cannot act because a detail is missing, say what you need in prose and do NOT emit a tool line.

Available tools:
- create_habit — args: name (string, required), note (optional, up to 240 chars), frequency ("daily" | "weekly" | "custom", default "daily"), timesPerWeek (whole number 1–7, required when frequency is "weekly"), days (array of 0–6 where 0=Sunday, required when frequency is "custom"), reminderTime ("HH:MM" 24-hour, optional), goalTarget (positive number, optional), goalUnit (short unit like "minutes", "pages", "ml", optional). Use it for EVERY request to create/add/set up/start a habit or routine — with everything the person specified — and never answer such a request with UI instructions instead of this tool.
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

type ProviderId = "gemini" | "grok" | "apinex" | "huggingface-qwen";
type ErrorCategory =
  | "rate_limited"
  | "auth"
  | "model_unavailable"
  | "bad_request"
  | "transient"
  | "timeout"
  | "network"
  | "empty";

/* ============================================================================
   Configuration — every knob is a server-side secret/env; nothing is
   hardcoded in more than one place and nothing is client-visible.
   ========================================================================== */
const envStr = (key: string, fallback: string): string => Deno.env.get(key)?.trim() || fallback;
const envInt = (key: string, fallback: number): number => {
  const n = Number.parseInt(Deno.env.get(key) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const envBool = (key: string, fallback = true): boolean => {
  const v = Deno.env.get(key)?.trim().toLowerCase();
  if (!v) return fallback;
  return v === "true" || v === "1";
};

/** Routing priority, best first. Configurable via COACH_PROVIDER_ORDER. */
const PROVIDER_ORDER_DEFAULT: ProviderId[] = ["apinex", "grok", "huggingface-qwen"];
const MAX_PROVIDER_ATTEMPTS = () => Math.min(envInt("COACH_MAX_PROVIDER_ATTEMPTS", 3), 5);
const PROVIDER_TIMEOUT_MS = () => envInt("COACH_PROVIDER_TIMEOUT_MS", 12000);
const TOTAL_TIMEOUT_MS = () => envInt("COACH_TOTAL_TIMEOUT_MS", 18000);
const COOLDOWN_BASE_MS = () => envInt("COACH_COOLDOWN_BASE_MS", 30000);
const COOLDOWN_MAX_MS = () => envInt("COACH_COOLDOWN_MAX_MS", 120000);
/** 401s disable a provider for this long — no hammering a dead key. */
const AUTH_COOLDOWN_MS = 10 * 60 * 1000;
/** 403/404 — model or access missing for this provider. */
const MODEL_COOLDOWN_MS = 5 * 60 * 1000;

function providerOrder(): ProviderId[] {
  const configured = (Deno.env.get("COACH_PROVIDER_ORDER") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id): id is ProviderId =>
      id === "gemini" || id === "grok" || id === "apinex" || id === "huggingface-qwen",
    );
  return configured.length > 0 ? configured : PROVIDER_ORDER_DEFAULT;
}

/* ============================================================================
   Provider registry — the ONLY providers Bloom talks to:
   Gemini (Google direct), Groq open models, Qwen (Hugging Face router).
   No TeamoRouter. No local/offline provider. Ever.
   ========================================================================== */
interface ProviderDef {
  id: ProviderId;
  label: string;
  secret: string;
  kind: "google" | "openai";
  vision: boolean;
  url?: string;
  /** Native OpenAI tool schemas for providers whose models prefer real tool calls. */
  tools?: boolean;
  model: () => string;
  enabled: () => boolean;
}

const REGISTRY: Record<ProviderId, ProviderDef> = {
  gemini: {
    id: "gemini",
    label: "Gemini",
    secret: "GEMINI_API_KEY",
    kind: "google",
    vision: true,
    tools: true,
    model: () => envStr("GEMINI_MODEL", "gemini-3.6-flash"),
    enabled: () => envBool("COACH_GEMINI_ENABLED"),
  },
  grok: {
    id: "grok",
    label: "Groq",
    secret: "GROQ_API_KEY",
    kind: "openai",
    vision: false,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: () => envStr("GROQ_MODEL", "openai/gpt-oss-20b"),
    enabled: () => envBool("COACH_GROK_ENABLED"),
    tools: true,
  },
  apinex: {
    id: "apinex",
    label: "APINEX",
    secret: "APINEX_API_KEY",
    kind: "openai",
    vision: true,
    url: "https://api.apinex.bond/v1/chat/completions",
    model: () => envStr("APINEX_MODEL", "free/gemini-3.8-flash"),
    enabled: () => envBool("COACH_APINEX_ENABLED"),
    tools: true,
  },
  "huggingface-qwen": {
    id: "huggingface-qwen",
    label: "Qwen",
    secret: "HF_TOKEN",
    kind: "openai",
    vision: false,
    url: "https://router.huggingface.co/v1/chat/completions",
    model: () => {
      const base = envStr("HF_QWEN_MODEL", "Qwen/Qwen3.8-27B");
      const route = envStr("HF_QWEN_PROVIDER", "ovhcloud");
      return `${base}:${route}`;
    },
    enabled: () => envBool("COACH_HF_ENABLED"),
    tools: true,
  },
};

/* ============================================================================
   Provider health — lightweight, in-memory, privacy-safe.
   Serverless reality: isolates may differ between invocations, so this is a
   best-effort circuit breaker plus strict request-local failover; it never
   stores prompts, responses, or personal data.
   ========================================================================== */
interface ProviderHealth {
  consecutiveFailures: number;
  cooldownUntil: number;
  lastCategory?: ErrorCategory;
}

const health = new Map<ProviderId, ProviderHealth>();

function stateFor(id: ProviderId): ProviderHealth {
  const existing = health.get(id);
  if (existing) return existing;
  const created: ProviderHealth = { consecutiveFailures: 0, cooldownUntil: 0 };
  health.set(id, created);
  return created;
}

function cooldownMs(category: ErrorCategory, consecutive: number): number {
  if (category === "auth") return AUTH_COOLDOWN_MS;
  if (category === "model_unavailable") return MODEL_COOLDOWN_MS;
  if (category === "bad_request") return 0; /* likely our bug — log, don't punish the provider */
  const base = COOLDOWN_BASE_MS();
  const capped = Math.min(COOLDOWN_MAX_MS(), base * 2 ** Math.max(0, consecutive - 1));
  return capped;
}

function recordFailure(id: ProviderId, category: ErrorCategory): void {
  const state = stateFor(id);
  state.consecutiveFailures += 1;
  state.lastCategory = category;
  state.cooldownUntil = Date.now() + cooldownMs(category, state.consecutiveFailures);
}

function recordSuccess(id: ProviderId): void {
  const state = stateFor(id);
  state.consecutiveFailures = 0;
  state.cooldownUntil = 0;
  state.lastCategory = undefined;
}

function isCoolingDown(id: ProviderId): boolean {
  return Date.now() < stateFor(id).cooldownUntil;
}

/* ============================================================================
   Error classification — 429 is not 401 is not 503.
   ========================================================================== */
function classifyHttp(status: number, body: string): ErrorCategory {
  if (status === 429) return "rate_limited";
  if (status === 401) return "auth";
  if (status === 403 || status === 404) return "model_unavailable";
  if (status === 400) return "bad_request";
  if (status === 408) return "timeout";
  if (status >= 500) return "transient";
  return "bad_request";
}

function classifyError(err: unknown): ErrorCategory {
  if (err instanceof HttpError) return classifyHttp(err.status, err.body);
  if (err instanceof EmptyError) return "empty";
  const name = err instanceof Error ? err.name : "";
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  if (err instanceof TypeError) return "network";
  return "transient";
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`http ${status}`);
    this.name = "HttpError";
  }
}
class EmptyError extends Error {
  constructor() {
    super("empty response");
    this.name = "EmptyError";
  }
}

/* ============================================================================
   Provider adapters — transport only. Same Bloom system, same facts, same
   history, same length rule for every provider. No provider-specific
   personality is ever introduced here.
   ========================================================================== */

   
/** Gemini (Google) — native generateContent, vision-capable, with native
    function declarations mirrored from BLOOM_TOOLS. */
async function callGemini(
  key: string,
  model: string,
  systemText: string,
  turns: Array<{ role: "user" | "assistant"; content: string }>,
  media: Media | null,
  signal: AbortSignal,
  decls?: readonly unknown[],
): Promise<string> {
  const contents: Array<Record<string, unknown>> = [];
  turns.forEach((turn, index) => {
    const isLastUser = index === turns.length - 1 && turn.role === "user";
    const parts: Array<Record<string, unknown>> = [];
    if (isLastUser && media) {
      parts.push({ inline_data: { mime_type: media.mediaType, data: media.dataBase64 } });
    }
    parts.push({ text: turn.content.slice(0, 4000) });
    contents.push({ role: turn.role === "assistant" ? "model" : "user", parts });
  });
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        ...(decls && decls.length > 0 ? { tools: [{ functionDeclarations: decls }] } : {}),
        generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
      }),
      signal,
    },
  );
  if (!res.ok) throw new HttpError(res.status, (await res.text()).slice(0, 500));
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  if (!Array.isArray(parts)) throw new EmptyError();
  const texts: string[] = [];
  const sidecars: string[] = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;
    /* Reasoning/thought parts are never read into a reply. */
    if (p["thought"] === true) continue;
    if (typeof p["text"] === "string" && p["text"].trim()) texts.push(p["text"]);
    /* Native function calls become [BLOOM_TOOL] sidecars, same as OpenAI. */
    const fc = p["functionCall"];
    if (fc && typeof fc === "object") {
      const call = fc as Record<string, unknown>;
      const name = typeof call["name"] === "string" ? call["name"].trim() : "";
      if (!name) continue;
      let args: unknown = call["args"];
      if (typeof args === "string") {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }
      if (!args || typeof args !== "object" || Array.isArray(args)) args = {};
      sidecars.push(`[BLOOM_TOOL]${JSON.stringify({ name, args })}[/BLOOM_TOOL]`);
    }
  }
  const text = [...texts, ...sidecars].filter(Boolean).join("\n\n").trim();
  if (!text) throw new EmptyError();
  return text;
}

/* Native tools are declared only for providers whose models prefer real tool
   calls (Groq's gpt-oss family) over the text sidecar contract. The Bloom
   SYSTEM prompt stays byte-identical for every provider. */
const BLOOM_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_habit",
      description: "Create a new habit or routine in Bloom for the person.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          note: { type: "string" },
          frequency: { type: "string", enum: ["daily", "weekly", "custom"] },
          timesPerWeek: { type: "number" },
          days: { type: "array", items: { type: "number" } },
          reminderTime: { type: "string" },
          goalTarget: { type: "number" },
          goalUnit: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tick_habit",
      description: "Mark a habit done for a date (default today).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          date: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_habits",
      description: "List the person's current active habits.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "log_tracker",
      description: "Log one numeric value for a daily tracker (sleep/movement/screen minutes, water ml, energy 1-5).",
      parameters: {
        type: "object",
        properties: {
          tracker: { type: "string", enum: ["sleep", "water", "movement", "screen", "energy"] },
          value: { type: "number" },
          date: { type: "string" },
        },
        required: ["tracker", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_goal",
      description: "Set a tracker's goal value.",
      parameters: {
        type: "object",
        properties: {
          tracker: { type: "string", enum: ["sleep", "water", "movement", "screen", "energy"] },
          value: { type: "number" },
        },
        required: ["tracker", "value"],
      },
    },
  },
] as const;

/** OpenAI-compatible (Groq, APINEX, Hugging Face router). Reads both plain
    content and native tool_calls — reasoning traces are never read. */
async function callOpenAICompatible(
  url: string,
  key: string,
  model: string,
  messages: Array<Record<string, unknown>>,
  signal: AbortSignal,
  tools?: readonly unknown[],
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 900,
  };
  if (tools && tools.length > 0) body["tools"] = tools;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new HttpError(res.status, (await res.text()).slice(0, 500));
  const json = await res.json();
  const message = json?.choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = typeof message?.["content"] === "string" ? message["content"].trim() : "";
  const calls = Array.isArray(message?.["tool_calls"])
    ? (message["tool_calls"] as Array<Record<string, unknown>>)
    : [];
  /* Native tool calls become [BLOOM_TOOL] sidecars, so the rest of the app
     (parser + executor) stays exactly as it is for text sidecars. */
  const sidecars: string[] = [];
  for (const call of calls) {
    const fn = call?.["function"] as Record<string, unknown> | undefined;
    const name = typeof fn?.["name"] === "string" ? fn["name"].trim() : "";
    if (!name) continue;
    let args: unknown = {};
    if (typeof fn?.["arguments"] === "string") {
      try {
        args = JSON.parse(fn["arguments"]);
      } catch {
        args = {};
      }
    }
    if (!args || typeof args !== "object" || Array.isArray(args)) args = {};
    sidecars.push(`[BLOOM_TOOL]${JSON.stringify({ name, args })}[/BLOOM_TOOL]`);
  }
  const text = [content, ...sidecars].filter(Boolean).join("\n\n").trim();
  if (!text) throw new EmptyError();
  return text;
}

async function callProvider(
  def: ProviderDef,
  key: string,
  systemText: string,
  turns: Array<{ role: "user" | "assistant"; content: string }>,
  media: Media | null,
  signal: AbortSignal,
): Promise<string> {
  if (def.kind === "google") {
    const decls = def.tools ? BLOOM_TOOLS.map((t) => t.function) : undefined;
    return callGemini(key, def.model(), systemText, turns, media, signal, decls);
  }
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: systemText },
    ...turns.map((turn) => ({ role: turn.role, content: turn.content.slice(0, 4000) })),
  ];
  /* Photos ride along for OpenAI-compatible providers too — send the last
     user turn as content parts with a data URL. PDFs stay with Gemini: it is
     the only provider guaranteed to read them. */
  if (media && media.mediaType.startsWith("image/")) {
    const last = messages[messages.length - 1];
    if (last && last["role"] === "user") {
      const text = String(last["content"] ?? "");
      last["content"] = [
        ...(text ? [{ type: "text", text }] : []),
        {
          type: "image_url",
          image_url: { url: `data:${media.mediaType};base64,${media.dataBase64}` },
        },
      ];
    }
  }
  return callOpenAICompatible(
    def.url as string,
    key,
    def.model(),
    messages,
    signal,
    def.tools ? BLOOM_TOOLS : undefined,
  );
}

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
    lines.push(
      "Cycle: this person does NOT track a cycle. Never mention periods, PMS, " +
        "ovulation, cycle phases, or period prediction unless they raise it first.",
    );
  }

  if (facts.habitsActive > 0) lines.push(`Habits: ${facts.habitsActive} active.`);
  if (facts.memories?.length) {
    lines.push(`Bloom remembers about them: ${facts.memories.join("; ")}`);
  }
  return lines.join("\n");
}

/* ============================================================================
   Request assembly — shared, identical for every provider.
   ========================================================================== */
function sanitizeHistory(raw: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is { role: string; content: string } =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as { role?: unknown }).role === "string" &&
        typeof (entry as { content?: unknown }).content === "string",
    )
    .slice(-8)
    .map((entry) => ({
      role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: entry.content.slice(0, 4000),
    }));
}

function requestId(): string {
  try {
    return `coach_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  } catch {
    return `coach_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const rid = requestId();
  const started = Date.now();

  try {
    const body: Body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "empty message" }, 400);

    /* Validate once, before any provider is contacted. */
    let media: Media | null = null;
    if (body.image && typeof body.image.dataBase64 === "string") {
      const mediaType = String(body.image.mediaType ?? "image/jpeg");
      if (body.image.dataBase64.length > 7_000_000) {
        console.error(`coach request=${rid} error=attached_too_large bytes=${body.image.dataBase64.length}`);
        return json({ error: "attached file too large for the model" }, 413);
      }
      media = { mediaType, dataBase64: body.image.dataBase64 };
    }
    if (envBool("COACH_LOG_DETAIL", false)) {
      console.info(
        `coach request=${rid} image=${media ? media.mediaType : "none"}` +
          (media ? ` imageBytes=${media.dataBase64.length}` : ""),
      );
    }

    const rule = LENGTH_RULE[body.register ?? "normal"] ?? LENGTH_RULE.normal;
    const systemText = [
      SYSTEM,
      `THEIR RECORD\n${factsToPrompt(body.facts)}`,
      `LENGTH\n${rule}`,
    ].join("\n\n");
    const turns = [...sanitizeHistory(body.history), { role: "user" as const, content: message.slice(0, 4000) }];

    /* Client-sent provider overrides are NOT trusted in production routing.
       Only an explicit dev header matching a server-side secret may pin one. */
    const devKey = Deno.env.get("BLOOM_COACH_DEV_KEY") ?? "";
    const devPin =
      devKey && req.headers.get("x-bloom-coach-dev") === devKey && typeof body.provider === "string"
        ? (body.provider as ProviderId)
        : null;

    /* Vision narrows the chain to providers that can actually see. */
    const order = providerOrder().filter(
      (id) => (media ? REGISTRY[id].vision : true) && REGISTRY[id].enabled() && Deno.env.get(REGISTRY[id].secret),
    );
    if (devPin && REGISTRY[devPin] && order.includes(devPin)) {
      order.splice(order.indexOf(devPin), 1);
      order.unshift(devPin);
    }
    if (media && order.length === 0) {
      /* No vision-capable provider available — never fake an image answer. */
      return json({ error: "unavailable", requestId: rid }, 502);
    }

    const deadline = started + TOTAL_TIMEOUT_MS();
    const maxAttempts = MAX_PROVIDER_ATTEMPTS();
    const attempted = new Set<ProviderId>();
    let answered = "";
    let answeredBy: ProviderId | null = null;
    const diagnostics: string[] = [];

    /* Immediate retries must not hard-fail just because the best provider is
       mid-cooldown: if every candidate is cooling from a TRANSIENT failure we
       probe the best one. Auth/model-unavailable cooldowns are never probed. */
    const transientOnly = (id: ProviderId): boolean => {
      const st = stateFor(id);
      return !st.lastCategory ||
        (st.lastCategory !== "auth" && st.lastCategory !== "model_unavailable");
    };
    const ready = order.filter((id) => !isCoolingDown(id) || (order.every(isCoolingDown) && transientOnly(id)));
    for (const id of ready) {
      if (attempted.size >= maxAttempts) break;
      if (attempted.has(id)) continue;
      const remaining = deadline - Date.now();
      if (remaining < 1000) break;
      attempted.add(id);
      const def = REGISTRY[id];
      const key = Deno.env.get(def.secret) ?? "";
      if (!key) continue;
      const attemptStart = Date.now();
      try {
        const signal = AbortSignal.timeout(
          Math.min(PROVIDER_TIMEOUT_MS(), Math.max(1000, remaining - 700)),
        );
        const text = await callProvider(def, key, systemText, turns, media, signal);
        recordSuccess(id);
        answered = text;
        answeredBy = id;
        diagnostics.push(`provider=${id} attempt=${attempted.size} result=success latencyMs=${Date.now() - attemptStart}`);
        break;
      } catch (err) {
        const category = classifyError(err);
        recordFailure(id, category);
        const latencyMs = Date.now() - attemptStart;
        const status = err instanceof HttpError ? err.status : "-";
        const detail = err instanceof HttpError ? err.body.slice(0, 200) : err instanceof Error ? err.message.slice(0, 200) : "";
        diagnostics.push(`provider=${id} attempt=${attempted.size} result=${category} status=${status} latencyMs=${latencyMs}`);
        /* Sanitized log: never prompts, never personal data, never secrets. */
        console.error(
          `coach request=${rid} provider=${id} category=${category} status=${status} latencyMs=${latencyMs}` +
            (envBool("COACH_LOG_DETAIL", false) ? ` detail=${detail.replace(/[^\x20-\x7e]/g, "?")}` : ""),
        );
      }
    }

    if (!answeredBy || !answered) {
      console.error(`coach request=${rid} all_providers_failed attempts=${diagnostics.join(" | ")}`);
      return json({ error: "unavailable", requestId: rid }, 502);
    }

    const paragraphs = answered
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      return json({ error: "unavailable", requestId: rid }, 502);
    }
    if (envBool("COACH_LOG_DETAIL", false)) {
      console.info(`coach request=${rid} ${diagnostics.join(" | ")}`);
    }
    return json({ paragraphs, provider: answeredBy }, 200);
  } catch (err) {
    console.error(`coach request=${rid} error=${err instanceof Error ? err.name : "unknown"}`);
    return json({ error: "unavailable", requestId: rid }, 502);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}