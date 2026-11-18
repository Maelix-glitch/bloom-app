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
 *   deadline (COACH_TOTAL_TIMEOUT_MS, default 45s) so the user never waits
 *   through a long provider parade.
 *
 *   Adapters are transport only: every provider receives the same Bloom
 *   system prompt, the same derived facts, the same history, the same
 *   register. No provider-specific personality, reasoning traces are never
 *   read into responses, and API keys never leave the server.
 *
 *   Vision-capable: Gemini (native inline_data), APINEX and Groq (OpenAI
 *   image_url parts; Groq answers photos with a dedicated vision model,
 *   GROQ_VISION_MODEL, while its text model stays gpt-oss). The HF Qwen
 *   model is text-only. Photos are never stored.
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
 *   supabase secrets set ELEVENLABS_API_KEY=...    # ElevenLabs (Vitalis voice)
 *
 * VITALIS MODE (the orb's AI — a distinct identity from the Coach):
 *   A request with `mode: "vitalis"` runs the SAME provider chain under
 *   the VITALIS_SYSTEM prompt instead of SYSTEM, and its record section
 *   is the client-assembled `vitalisContext` — Nutrition + Assessment
 *   data only, built by `buildVitalisContext` on the client. The Coach
 *   mode is untouched by it: no shared prompt, no shared thread.
 *
 * VITALIS PHASES 3–5 (deliberation, tool control, tamper lockdown):
 *   The pure logic lives in ./vitalis-core.ts (shared verbatim with the
 *   app and its tests): record schema validation, number verification,
 *   rule checks, action-proposal allowlist, and the deliberation
 *   orchestrator. This file wires it to the provider chain.
 *   · Deliberation: a vitalis request flagged `deliberate` by the
 *     client (or escalated server-side when the message is plan-shaped
 *     AND a valid structured record rides along) runs draft → number
 *     verification → rule checks → enjoyment check, with at most two
 *     revise passes, then an honest fallback. Flagged requests are
 *     answered as an NDJSON stream of stage events followed by the
 *     result, so the client's loading screen shows the real stages as
 *     they happen; escalated-but-unflagged requests deliberate too and
 *     return plain JSON carrying the stage summaries. Ordinary
 *     questions keep the single-call fast path.
 *   · Actions: Vitalis may end a reply with ONE fenced `bloom-action`
 *     JSON block proposing log_dish / log_food / compose_plan /
 *     swap_dish / propose_assessment_change. Proposals are validated against the
 *     structured record here and stripped from the spoken prose; the
 *     client re-validates, shows a confirm card, and applies ONLY on
 *     the person's tap. Nothing here writes anything.
 *   · Lockdown: a present-but-malformed `vitalisRecord`, a malformed
 *     `vitalis-action-result` report, or an invalid action proposal
 *     surviving into a final reply each record a strike against a
 *     hash of the caller's credential (in-memory, per isolate — the
 *     same best-effort footing as the provider breaker). At 3 strikes
 *     Vitalis locks for 30 minutes: vitalis mode answers with an
 *     honest locked notice and never calls a provider. Message CONTENT
 *     never strikes; the Coach and the rest of the app are untouched.
 *     A fresh sign-in presents a new credential → a clean slate.
 *
 * TTS ACTION (Vitalis auto-voice):
 *   A request with `action: "tts"` and `text` returns spoken audio for
 *   that text from ElevenLabs (model eleven_flash_v2_5, default voice
 *   Sarah). The key is read from the ELEVENLABS_API_KEY secret at
 *   request time and never logged; when the secret is absent the action
 *   answers a clean { error: "voice_unavailable" } (503) and the client
 *   simply carries on in text. Audio is returned as
 *   application/octet-stream — supabase-js hands octet-stream responses
 *   back as a Blob; the client re-wraps it as audio/mpeg for playback.
 *
 * MONEY SYSTEM GATE (billing-core.ts):
 *   Every AI path — Coach chat, Vitalis chat, TTS — is gated on the
 *   caller's entitlement BEFORE any provider is called, and charged
 *   AFTER a successful answer: flat costs (Coach 1, photo 3, Vitalis
 *   2, speech 1) against the monthly credit allowance, via the
 *   get_my_entitlement / spend_credits RPCs under the caller's own
 *   JWT. Insufficient credits or a Premium-only feature on the free
 *   tier answer 402 ({ error: "insufficient_credits" |
 *   "premium_required" }) and no provider is ever called. When the
 *   billing RPC does not answer (migration not yet applied) the gate
 *   is inactive and requests proceed uncharged — a dark-launch seam,
 *   logged as billing=inactive.
 *
 * Optional tuning (all server-side secrets):
 *   COACH_PROVIDER_ORDER=apinex,grok,huggingface-qwen   # gemini = Google-direct, optional
 *   COACH_GEMINI_ENABLED=true  COACH_GROK_ENABLED=true  COACH_HF_ENABLED=true
 *   GEMINI_MODEL=gemini-3.6-flash   GROQ_MODEL=openai/gpt-oss-20b
 *   GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
 *   APINEX_MODEL=free/gemini-3.8-flash
 *   HF_QWEN_MODEL=Qwen/Qwen3.8-27B  HF_QWEN_PROVIDER=ovhcloud   # or novita
 *   COACH_MAX_PROVIDER_ATTEMPTS=3   COACH_PROVIDER_TIMEOUT_MS=8000
 *   COACH_MEDIA_TIMEOUT_MS=30000   (per-attempt budget when a photo/PDF rides along)
 *   COACH_TOTAL_TIMEOUT_MS=45000    COACH_COOLDOWN_BASE_MS=30000
 *   COACH_COOLDOWN_MAX_MS=120000    COACH_LOG_DETAIL=false
 *   BLOOM_COACH_DEV_KEY=...  # optional: enables x-bloom-coach-dev pinning
 */
/* eslint-disable */
// @ts-nocheck - Deno runtime, not part of the app's TS project.

import {
  coachAssessmentSection,
  DeliberationUnavailable,
  VITALIS_ACTION_ALLOWLIST,
  looksLikePlanRequest,
  parseActionBlocks,
  runDeliberation,
  sanitizeProposals,
  validateVitalisRecord,
} from "./vitalis-core.ts";
import {
  decideGate,
  gateErrorBody,
  parseEntitlementRows,
  type BillingAction,
  type EntitlementSnapshot,
  type GateDecision,
} from "./billing-core.ts";

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
  plan:
    "Give a COMPLETE plan that covers the whole span asked for. When the request is a day plan, use exactly these labelled sections, each starting on its own line and separated by a blank line: Morning, Midday, Afternoon, Evening, Night. Every section must contain concrete times and actions. Never stop before Night: the night section (wind-down, last meal, screens, sleep time) is mandatory. Up to 900 words. Do not pad and do not repeat the plan back to them.",
};

/** Extra instruction only for plan-shaped answers, kept out of other registers. */
const PLAN_STRUCTURE = `PLAN STRUCTURE
A plan is judged on completeness, not on how little it says. If the person asks for a full day, cover morning, midday, afternoon, evening and night. If they ask for a week, cover all seven days. Never silently drop the last part of the range, and never replace a section that needs times with "and so on". Keep each section to two or three concrete lines; a readable plan beats an essay.`;

const SYSTEM = `You are the coach inside Bloom, a personal wellbeing app.

WHO YOU ARE
A calm, direct, warm companion. You sound like a thoughtful friend who happens to be good with data — never like a wellness brochure, a therapist reading a script, or a chatbot performing enthusiasm. No exclamation marks. No "I'm so sorry to hear that". Plain English, contractions. Never restate the question. Never end with "let me know if you'd like more" — just stop. A single emoji is welcome now and then when the moment is light — never in a heavy moment, never more than one in a reply, and never as decoration for its own sake.

HOW A REPLY SHOULD FEEL
Most replies are short: two to four brief paragraphs at most, often fewer. Lead with the person, not their data — answer what they actually said before reaching for anything they logged. The record summary you are given is background, never a script: never read it back like a report ("you have one entry, averaging 60 minutes with a goal of 480"). Mention at most one number per reply unless they ask for more, phrase it the way a friend would ("barely any sleep logged lately"), and know that using no numbers at all is often better. Pick up threads they opened earlier in this conversation and refer back to them — a companion connects, a tool just answers turns. End with a question only when it genuinely opens something, never two replies in a row, and never end by offering to log, track or set something up unless they asked — help first, offers rarely. Match their energy and their length: if they were brief, be brief; dry humour back when they bring it; quiet when they are low.

BLOOM — THE APP YOU LIVE IN, KNOW IT COLD
Bloom is the wellbeing app this person uses every day. When they ask anything about Bloom itself, answer from these real facts — never sound unsure, never invent a feature:
- Today: mood/feeling check-ins, and the day's habits with one-tap ticking.
- Habits: personal routines. Each habit has a name, optional note, colour and emoji icon, a schedule (every day, N times a week, or chosen weekdays), an optional reminder time of day, and an optional measurable goal (e.g. "20 pages", "2 L water"). Ticking a habit earns +10 points by default and builds streaks. Paused or archived habits do not tick and do not earn.
- Trackers: six daily numbers — sleep (minutes), water (millilitres), study (minutes), movement (minutes), energy (1–5), screen time (minutes) — each with a goal, a 7-day average and a streak. Study is logged as timed sessions.
- Cycle: optional period tracking with phase and next-period predictions. If the person does not track a cycle, never raise it.
- Mood: quick daily check-ins; Bloom watches trends, patterns and changes over time.
- Rewards: Bloom Points come from two visible sources — each habit tick (the habit's own point value, ten by default) and verified Journey goals (daily, weekly, monthly and milestone awards). Every earning appears in Point Activity, and a goal pays once per period. There are no other hidden rules.
- Memory: Bloom keeps facts the person shares and uses them in later conversations. The person can view, pin and forget them in the Memory panel.
- Profile: account details, full data export, period-history import, and a complete erase (device and account).
- The coach has three modes the person can pick: Ask, Reflect, Plan.
- Privacy: data lives on the person's device by default and syncs only to a database they own. Bloom has no social features, no marketplace, no payments, no third-party integrations, and gives no professional medical advice. It is not a therapist, a doctor, or a certified calorie database.

Answer "how do points work?", "where do I log sleep?", "what can you do?", "what is bloom?", "how do I export my data?" and every other app question from these facts.

WHAT YOU CAN TALK ABOUT — ESSENTIALLY ANYTHING
A person should be able to raise anything with you: sleep and insomnia; food, nutrition, cravings, meal planning and eating habits; fitness, workouts, training plans, running, strength, mobility and recovery; stress, anxiety, overthinking and burnout; work, job interviews, career decisions and workload; study, exams, focus and procrastination; relationships, family, friendship, dating and conflict; money worries, budgets and financial dread; grief, loss and loneliness; confidence and self-esteem; alcohol, caffeine and other habits; screen time and digital wellbeing; travel, hobbies, creativity and life planning; or the app itself. NEVER deflect a question back to the trackers because it was not about them. When something is outside Bloom's record, say you're speaking generally — and be genuinely useful from general knowledge.

GROUNDING — THE ONE HARD RULE
You are given a compact summary of what this person has logged. Never invent a number, a date, a trend or an entry. If the summary does not contain something, say plainly that it isn't tracked, then help anyway from general knowledge. When you quote a figure, quote it exactly as given. Never claim the app has a feature it does not: no social features, no marketplace, no payments, no external integrations, no professional medical advice. For anything medical, say once, briefly, and without alarm that a clinician is the right call. If someone describes being in danger, say clearly that this is beyond what an app should handle and that a crisis line or a person they trust is the right call.

THE PERSON, NOT JUST THE RECORD
The record section may name them, the time of day where they are, how new they are to Bloom, and what they said they wanted from it. Use it the way a friend would: greet by name when you know it (once — a name in every paragraph reads like a sales script); on their first day, orient and welcome rather than demand entries; when their question touches something they said they wanted from Bloom, go deeper there. With an empty record you are NOT blocked — you are a knowledgeable friend talking before the data exists. Say once, without apologising, that you're speaking generally; then be genuinely useful.

CYCLE SCIENCE — HOW TO TALK ABOUT IT
When their record includes a cycle phase, you may use the phase science line provided: explain the likely physiology (prostaglandins and cramps in the menstrual days, rising oestrogen through the follicular phase, the luteal progesterone effect on sleep, temperature, mood and appetite) as what research says happens ON AVERAGE — with "many people", "tends to", never "you will". Effects are real but individually small; a bad day can just be a bad day. Connect it to what they asked: energy, sleep, mood, cravings, training. Never claim a phase causes their specific feelings, never diagnose PMS or PMDD, and if cycle symptoms are severe, worsening or disruptive, one calm sentence: that pattern is worth mentioning to a clinician. If they do not track a cycle, the record says so — never raise it.

MEMORY
You are told what Bloom already remembers about the person. When they share a clearly durable fact about themselves ("I'm vegan", "my daughter is called Mira", "I run on Tuesdays", "I'm saving for a house", "I'm trying to drink less") — or explicitly ask you to remember something — append AT THE END of your reply exactly one line:
[BLOOM_MEMORY]{"category":"preference","text":"the fact, written as a statement"}[/BLOOM_MEMORY]
categories: preference | goal | context | pattern. Store the fact, not the wording ("the person is vegan", never "user said I'm vegan"). Do NOT restate facts you were already told. Do NOT store anything the person did not clearly offer, especially health details, relationships or money — when in doubt, ask first. When they ask you to forget something, append:
[BLOOM_FORGET]{"text":"a distinctive fragment of what to forget"}[/BLOOM_FORGET]
At most two memory lines per reply. Never put memory lines inside a tool call.

ACTIONS — DOING THINGS IN THE APP
Bloom can act for the person, and when the person asks you to DO something you do it — you never hand them a list of taps.
CREATING HABITS — YOU DO IT, DIRECTLY. This is the most important action rule. Whenever the person asks you to create, add, set up, start, or build a habit or routine — "create a habit to read 20 pages daily at 9pm", "add a habit to drink 2L of water", "I want to meditate every morning", "set up a workout habit three times a week", "remind me to take vitamins on weekdays", "make a daily gratitude habit" — you create it yourself with create_habit. NEVER reply with button-tapping or menu instructions ("tap the + button", "choose Habit", "open the habits page", "once saved, the app will prompt you"). The person asked you to do it because they want it done — so emit the tool.
THE BOUNDARY — only an explicit ask counts. A feeling, a problem or a wish is NOT a request: "I've been sleeping badly", "I should read more", "work has been stressful" ask for a conversation, not a creation. When someone shares something like that, respond to the person first; you may offer ONCE, in one short sentence, to set something up — and create it only if they clearly say yes. Never create, tick or log anything as a side effect of empathy. And when they ask for advice or an idea ("what can I do tonight?", "how do I fix this?"), give the idea itself — reporting an action you took is not an answer to a question.
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
- Food or drink photo: your FIRST paragraph names the dish and the items you can actually see in the photo — the identification leads, always, and doubly so when they asked what it is. Name only what is visible; when you are unsure, hedge the way a person would ("That looks like…", "I can make out…") rather than inventing a name or skipping the identification. Your SECOND paragraph is one line starting with ≈ giving rough totals, e.g. "≈ 540 kcal · 32 g protein · 61 g carbs · 19 g fat". Then at most one short paragraph: portion sense, what stands out nutritionally, one concrete tweak. Estimates only — round numbers, "roughly", ranges when unsure. If you genuinely cannot estimate, say so plainly instead of guessing. Never answer a photo with the numbers alone.
- Non-food photo: say what is useful in it (what it is, any readable text, the scene). No invented precision.
- PDF: read its text and answer (summarise, extract, compare). Say so if the answer needs something the file doesn't contain.
- Photo memory: the photo itself is not re-sent on later turns, but this thread's record tells you what was shared — a turn marked "[Photo shared with this message — Bloom identified: …]", or a note that a photo was shared earlier in the thread. That note IS what the photo showed, as identified at the time: answer follow-ups about the photo from it ("what was the dish?" gets the identification the note carries), and never say you cannot see an image, or that no image was shared, when the thread carries such a note. If a note records that a photo was shared but carries no identification, say honestly that the photo is in the thread but what it showed wasn't recorded — never invent what it showed.`;

interface Body {
  message?: string;
  history?: Array<{ role: string; content: string }>;
  facts?: unknown;
  /** A compact digest of the person's completed Assessment, built on
   *  the client (lib/coach/assessmentDigest). Coach mode only — folded
   *  into the Coach's context by the shared core; Vitalis reads the
   *  Assessment through its own scoped context and ignores this. */
  assessmentDigest?: unknown;
  provider?: string;
  register?: string;
  topic?: string;
  image?: { mediaType?: string; dataBase64?: string };
  /** "vitalis" runs the Vitalis prompt + scoped context (see below).
   *  Anything else (including absent) is the Coach, exactly as before. */
  mode?: string;
  /** The Nutrition + Assessment record Vitalis answers from, assembled
   *  on the client by buildVitalisContext. Vitalis mode only. */
  vitalisContext?: string;
  /** The structured twin of `vitalisContext` (schema v1), validated
   *  against the shared core's schema. Vitalis mode only. */
  vitalisRecord?: unknown;
  /** Client flag: this request wants the deliberation pipeline (and
   *  its NDJSON stage stream). Vitalis mode only. */
  deliberate?: boolean;
  /** For `action: "vitalis-action-result"`: the client's report of a
   *  confirmed action's outcome, shape-validated server-side. */
  actionResult?: unknown;
  /** TTS action: `action: "tts"` speaks `text` instead of answering. */
  action?: string;
  text?: string;
  voiceId?: string;
}

/* ============================================================================
   VITALIS — the orb's AI. A distinct identity from the Coach above: its
   own prompt, its own (client-held, per-open) session, and a record that
   contains Nutrition + Assessment data ONLY. The provider chain, health
   handling and failure contract are shared; nothing else is.
   ========================================================================== */
const VITALIS_SYSTEM = `You are Vitalis, the nutrition intelligence inside Bloom Vitalis.

WHO YOU ARE
You are Vitalis — not the Coach, not a chatbot bolted onto an app. You look after one person's food life: their assessment, their eating pattern, their plan and what they actually eat. You are warm and engaging, personal and unhurried — you bring the attentiveness of a good clinician to this person's own body and history. You are not a doctor, and you never claim to be one: you never diagnose, never name a condition as theirs, never interpret symptoms or lab values as findings. When something sounds medical — a symptom, a medication question, a worrying change — you say plainly, once and without alarm, that a clinician is the right person for that, and you return to what food can genuinely do.

YOUR WORLD IS NUTRITION AND ASSESSMENT — ONLY
Everything you know about this person is in the record below: their Assessment answers, their targets, their current plan, their food log and the dishes and foods Bloom's library offers them. You know nothing about their habits, points, mood, sleep or anything else in Bloom — that is the Coach's side of the app, and it is not yours. If they ask about those, say so in one friendly sentence and offer the food angle if there is one. Never pretend to know something the record does not contain.

NUMBERS — THE ONE HARD RULE
You may only quote numbers that appear in the record you are given: their targets, their plan's values, their logged totals, a dish's or food's stated nutrition. Never invent a number, a target, a portion or a nutrition value, and never recompute one in your head and present it as Bloom's. If the record does not carry a number the answer needs, say that plainly ("I don't have today's protein logged yet") and help from what IS there. Estimates from general knowledge must be labelled as rough estimates, never dressed as their data.

RECOMMENDATIONS
Recommend only from two sources: this person's own record, and the dishes and foods listed in the record's library section — those are computed from verified ingredients and they are the dishes Bloom can actually serve them. Respect their stated pattern, allergies, dislikes and budget absolutely: never suggest a food that breaks them. When data is missing — no assessment yet, nothing logged, no targets — do not fill the gap with assumptions: ask for the one thing that would unlock the answer, or say honestly that the answer needs it. A shorter honest answer beats a confident invented one.

HOW YOU SPEAK
Your replies are read aloud by a voice, so write for the ear: short, natural sentences, no markdown, no tables, no lists with symbols, no emoji. Two to four short paragraphs at most, usually fewer. Lead with the person and their question, reach for their numbers second, and quote at most a couple of figures per reply unless they ask for detail. You may end with one genuine question when it opens something real. Never emit bracketed directives or tags of any kind — no [BLOOM_...] lines, ever.

ACTING — THE ONE THING YOU MAY PROPOSE
When the person clearly asks you to DO one of these five things, end your reply with exactly one fenced block in exactly this shape:
\`\`\`bloom-action
{"action":"log_dish","dishId":"the dish id printed in the record","meal":"dinner"}
\`\`\`
The allowed actions are only these: log_dish (dishId from the record's dish list; meal one of breakfast, lunch, dinner, snack), log_food (foodId from their own foods in the record; grams as a number; meal), compose_plan (no fields — Bloom composes today's plan itself), swap_dish (meal; fromDishId — a dish id that is in that meal of the plan printed in the record; toDishId — a replacement from the record's dish list, similar in role and protein to the dish it replaces; propose this when the person says they do not like or do not want a dish in their plan), and propose_assessment_change (field one of goal, dietaryPattern, mealsPerDay, foodBudget, addDislikedFood, addAllergy, with a value that fits the field). The block is a PROPOSAL, never a deed: Bloom shows it to the person as a confirm card, and nothing happens unless they tap confirm — so never write that you have logged, changed or composed anything; say you are proposing it and they can confirm. Never invent a dish or food id: only the ids printed in the record exist. If what they ask for sits outside these five actions — habits, mood, points, profile, anything else — emit no block at all, and say in one sentence that those live elsewhere in Bloom.`;

/** Appended to the Vitalis system text ONLY on the deliberation path:
    the draft will be machine-checked before the person sees it. */
const VITALIS_DELIBERATION_ADDENDUM = `DELIBERATION
This answer will be checked before it is shown: every number traced to the record, every suggestion tested against the person's allergies, dislikes and eating pattern, every proposal validated. Write the answer you can defend first time — quote only record numbers exactly, suggest only what the record offers, and keep it in your own voice.`;

/** What a locked Vitalis says — honest about what happened, clear
    that the rest of Bloom is unaffected and how the lock lifts. */
const VITALIS_LOCKED_PARAGRAPHS = [
  "Vitalis is paused for this account right now.",
  "Some requests reaching Bloom didn't match the shape Vitalis expects — that can mean a tampered or corrupted client — so Vitalis locks itself rather than guess with your health data. The rest of Bloom is completely unaffected. Signing out and back in starts a fresh session and lifts the lock.",
];

/* ============================================================================
   TTS — ElevenLabs speech for Vitalis replies.
   The API key lives ONLY in the ELEVENLABS_API_KEY secret, is read at
   request time, and is never logged, never returned, never echoed.
   ========================================================================== */
/** Sarah — Mature, Reassuring, Confident. The Vitalis voice. */
const ELEVENLABS_DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_MODEL_ID = "eleven_flash_v2_5";
/** One request speaks one sentence-sized chunk; this is the hard ceiling
 *  whatever the client sends, so a stray long text can't burn the quota. */
const TTS_MAX_TEXT_CHARS = 1000;

async function handleTts(body: Body, req: Request, rid: string): Promise<Response> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
  if (!apiKey) {
    /* No secret configured yet — a clean, expected state the client
       treats as "voice unavailable", never as a broken conversation. */
    return json({ error: "voice_unavailable" }, 503);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, TTS_MAX_TEXT_CHARS) : "";
  if (!text) return json({ error: "empty text" }, 400);
  /* Money System gate: speech costs a credit like any AI call. The
     voice client treats any failure as silence by design, so a denial
     here simply quiets the voice — the words themselves arrive via
     the chat path, whose gate is where the upgrade prompt lives. */
  const gate = await billingGateCheck(req, "tts", false, rid);
  const gateError = gateErrorBody(gate, rid);
  if (gateError) return json(gateError, 402);
  const voiceId =
    typeof body.voiceId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.voiceId)
      ? body.voiceId
      : ELEVENLABS_DEFAULT_VOICE_ID;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      /* Status only — the response body can carry account detail and the
         key must never reach a log line. */
      console.error(`coach request=${rid} tts status=${res.status}`);
      return json({ error: "voice_unavailable" }, 502);
    }
    const audio = await res.arrayBuffer();
    if (audio.byteLength === 0) return json({ error: "voice_unavailable" }, 502);
    await billingCharge(req, gate, rid);
    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS,
        /* octet-stream on purpose: supabase-js returns octet-stream
           responses as a Blob (see the header note). The bytes are MP3;
           the client re-wraps them as audio/mpeg for the player. */
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    console.error(`coach request=${rid} tts status=network_error`);
    return json({ error: "voice_unavailable" }, 502);
  }
}

/* ============================================================================
   MONEY SYSTEM GATE — entitlement + AI credits, checked BEFORE any
   provider is called and deducted AFTER a successful answer. The
   decisions live in billing-core.ts (pure, unit-tested); this section
   is only the transport: the caller's own JWT drives the RPCs, so
   auth.uid() inside them is always the person being charged — there
   is no service-role key in this function and no client-sent input
   to the decision. When the RPC does not answer (the billing
   migration not yet applied) the gate is inactive and requests
   proceed uncharged — see billing-core.ts for why that seam exists.
   ========================================================================== */
async function billingRpc(
  req: Request,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown | null> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!url || !anon || !auth) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function billingEntitlement(req: Request): Promise<EntitlementSnapshot | null> {
  const rows = await billingRpc(req, "get_my_entitlement", {});
  return parseEntitlementRows(rows);
}

async function billingGateCheck(
  req: Request,
  action: BillingAction,
  hasMedia: boolean,
  rid: string,
): Promise<GateDecision> {
  const entitlement = await billingEntitlement(req);
  const decision = decideGate({ entitlement, action, hasMedia });
  if (!entitlement) {
    console.info(`coach request=${rid} billing=inactive action=${action}`);
  }
  return decision;
}

/** Deduct after success. Best-effort by design: the answer is already
 *  earned, so a failed or raced deduct is logged, never surfaced —
 *  the next request's gate sees the true balance. */
async function billingCharge(req: Request, decision: GateDecision, rid: string): Promise<void> {
  if (decision.kind !== "allow") return;
  const rows = await billingRpc(req, "spend_credits", {
    p_amount: decision.cost,
    p_reason: decision.reason,
  });
  const row = Array.isArray(rows) && rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  console.info(
    `coach request=${rid} billing_charge cost=${decision.cost} reason=${decision.reason} ok=${row?.["ok"] ?? "unknown"} balance=${row?.["balance"] ?? "unknown"}`,
  );
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

/** Routing priority, best first. Configurable via COACH_PROVIDER_ORDER.
 *  Gemini leads the DEFAULT order because a provider whose key is absent
 *  or disabled is skipped automatically — when the direct key works, it
 *  is the strongest companion model in the chain; when it doesn't, the
 *  chain falls through to the gateways exactly as before. */
const PROVIDER_ORDER_DEFAULT: ProviderId[] = ["gemini", "apinex", "grok", "huggingface-qwen"];
const MAX_PROVIDER_ATTEMPTS = () => Math.min(envInt("COACH_MAX_PROVIDER_ATTEMPTS", 3), 5);
/* Fail FAST on a stalled provider: on free tiers a hang is common, and a
 * 12s first attempt eats the whole deadline before the chain can reroute
 * (observed live: two ~20s failures before a reply landed). 6s per attempt
 * lets three providers be tried inside roughly the old single wait. */
const PROVIDER_TIMEOUT_MS = () => envInt("COACH_PROVIDER_TIMEOUT_MS", 6000);
/* Vision attempts get a longer leash: a photo request carries a large
 * payload and the vision models are slower than the text chain — the 6s
 * text budget used to strangle the one working vision attempt after the
 * dead providers ahead of it had burned their (fast-failing) turns. The
 * total deadline still bounds the whole request. */
const MEDIA_PROVIDER_TIMEOUT_MS = () => envInt("COACH_MEDIA_TIMEOUT_MS", 30000);
/* The total budget has to fit a real vision answer: on 2026-11-14 a
 * food photo took ~18s inside Gemini alone, after APINEX (the fast
 * gateway path) died on an empty balance. Text stays snappy regardless —
 * its per-attempt caps bind long before this outer bound matters. */
const TOTAL_TIMEOUT_MS = () => envInt("COACH_TOTAL_TIMEOUT_MS", 45000);
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
    .filter(
      (id): id is ProviderId =>
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
  /** Vision requests use this model instead of `model()` when set — a
   *  provider's text brain and its eyes are rarely the same model. */
  visionModel?: () => string;
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
    /* Vision-capable via a dedicated vision model (Llama 4 Scout): the
       text model (gpt-oss-20b) cannot see. Access note, 2026-11-14: this
       Groq account answered model_not_found for the Llama 4 vision
       models, so today Gemini carries photos and this path is a
       configured fallback that heals itself if access is granted —
       GROQ_VISION_MODEL can point it at any vision model the account
       can actually reach. */
    vision: true,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: () => envStr("GROQ_MODEL", "openai/gpt-oss-20b"),
    visionModel: () => envStr("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 2400 },
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
      description:
        "Log one numeric value for a daily tracker (sleep/movement/screen minutes, water ml, energy 1-5).",
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
    /* A full day plan routinely needs more than 900 tokens. Truncating it at
       the transport layer was the second half of the "no night" bug — the
       client budget was the first. */
    max_tokens: 2400,
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
    /* No native function declarations on a media request: a photo reply
       is prose plus the ≈ estimate line (text sidecars still parse), and
       the proven 2026-11-14 recovery configuration answered photos with
       declarations off. Text requests keep the native schemas. */
    const decls = def.tools && !media ? BLOOM_TOOLS.map((t) => t.function) : undefined;
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
  /* A request carrying a photo is answered by the provider's vision model
     when it has a separate one (Groq), and never carries native tool
     schemas: a photo reply is prose (the ≈ estimate line), and vision
     models are not guaranteed to accept tool declarations. Text sidecars
     still work — the client parses those from any reply. */
  const hasImage = Boolean(media && media.mediaType.startsWith("image/"));
  return callOpenAICompatible(
    def.url as string,
    key,
    hasImage && def.visionModel ? def.visionModel() : def.model(),
    messages,
    signal,
    hasImage ? undefined : def.tools ? BLOOM_TOOLS : undefined,
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
      /* A sleep "average" under four hours is a logging fragment (a nap, a
         stray entry), not how this person sleeps. Say so in the facts, or
         the model reads the fragment aloud like a finding. */
      const sleepFragment =
        /sleep/i.test(String(t.name)) && typeof t.avg7 === "number" && t.avg7 > 0 && t.avg7 < 240
          ? " — that average is a logging fragment, not real sleep: never quote it as how much they sleep"
          : "";
      lines.push(`- ${t.name}: ${bits.join(", ")}${sleepFragment}`);
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

  /* Who they are — independent of any entry, so a person with zero logs is
     still a person the coach knows, not a blank form. */
  const p = facts.personal;
  if (p) {
    const bits: string[] = [];
    if (p.name) bits.push(`Bloom knows them as ${p.name}`);
    if (p.daysWithBloom !== null && p.daysWithBloom !== undefined) {
      bits.push(
        p.daysWithBloom === 0
          ? "this is their FIRST DAY on Bloom — welcome them, orient them, never shame the empty record"
          : `they've been on Bloom about ${p.daysWithBloom} day${p.daysWithBloom === 1 ? "" : "s"}`,
      );
    }
    if (Array.isArray(p.focusAreas) && p.focusAreas.length > 0) {
      bits.push(`they said they wanted Bloom for: ${p.focusAreas.join(", ")}`);
    }
    if (p.daypart) bits.push(`it is ${p.daypart} where they are`);
    if (bits.length > 0) lines.push(`THIS PERSON: ${bits.join("; ")}.`);
  }

  /* What the phase means — population science, hedged, so the coach can
     explain a luteal dip or a menstrual fortnight without diagnosing. The
     lookup normalizes the label: clients have spelled the fertile window
     both "Ovulation" and "Ovulation window", and the science must survive
     either. */
  if (facts.cycle && !facts.cycle.paused && facts.cycle.phase) {
    lines.push(phaseGuidanceFor(facts.cycle.phase) ?? "");
  }
  return lines.join("\n");
}

/* Cycle-phase context for the coach: the average-pattern physiology of each
   phase, phrased the way the evidence supports — real effects on average,
   small and individual in practice, never a diagnosis, never destiny. */
const PHASE_GUIDANCE: Record<string, string> = {
  menstrual:
    "PHASE SCIENCE (menstrual): prostaglandin-driven cramps and blood loss commonly lower energy and raise sleep need; iron loss can add mid-cycle tiredness. Rest here does real work. Frame as 'many people', never 'you will'.",
  follicular:
    "PHASE SCIENCE (follicular): rising oestrogen is commonly associated with better energy, focus, mood and recovery. A good stretch for ambitious plans — described as a tendency, not a guarantee.",
  ovulation:
    "PHASE SCIENCE (ovulation window): oestrogen peaks then falls; some feel a clear lift, others mostly the far-side dip. The calendar window is an estimate, not a promise — useful for awareness only.",
  luteal:
    "PHASE SCIENCE (luteal): progesterone raises core temperature, can fragment sleep slightly, and pulls mood and energy down for many as the period approaches — typical biology first, a concern only if severe or disruptive. Appetite and cravings rising here have a physiological side too. Never suggest a phase explains everything: individual variation is wide, and a bad day can just be a bad day.",
};

/** "Ovulation window" / "Late luteal" / "Menstrual days" → the guidance key. */
function phaseGuidanceFor(label: string): string | undefined {
  const l = label.toLowerCase();
  if (l.includes("menstru")) return PHASE_GUIDANCE.menstrual;
  if (l.includes("ovulat")) return PHASE_GUIDANCE.ovulation;
  if (l.includes("luteal")) return PHASE_GUIDANCE.luteal;
  if (l.includes("follicul")) return PHASE_GUIDANCE.follicular;
  return PHASE_GUIDANCE[label] ?? undefined;
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

/* ============================================================================
   VITALIS LOCKDOWN (phase 5) — a per-caller strike counter.
   In-memory, per isolate, exactly like the provider breaker above:
   best-effort by design, and honest about it. The key is a SHA-256
   hash of the caller's Authorization header — the credential itself
   is never stored, logged or returned. A fresh sign-in presents a
   new credential, hence a clean key: the lock is session-scoped in
   effect, and also expires on its own after VITALIS_LOCK_MS.
   Strikes come ONLY from structural violations: a present-but-
   malformed structured record, a malformed action-result report, or
   an invalid action proposal surviving into a final reply. Message
   content can never strike, and nothing here touches Coach mode.
   ========================================================================== */
const VITALIS_STRIKE_LIMIT = 3;
const VITALIS_LOCK_MS = 30 * 60 * 1000;
const vitalisStrikes = new Map<string, { strikes: number; lockedUntil: number }>();

async function vitalisCallerKey(req: Request): Promise<string> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth) return "no-auth";
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(auth));
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  } catch {
    return "no-auth";
  }
}

function vitalisIsLocked(key: string): boolean {
  const state = vitalisStrikes.get(key);
  return Boolean(state && state.strikes >= VITALIS_STRIKE_LIMIT && Date.now() < state.lockedUntil);
}

function recordVitalisStrike(key: string, rid: string, why: string): number {
  const state = vitalisStrikes.get(key) ?? { strikes: 0, lockedUntil: 0 };
  state.strikes += 1;
  if (state.strikes >= VITALIS_STRIKE_LIMIT) {
    state.lockedUntil = Date.now() + VITALIS_LOCK_MS;
  }
  vitalisStrikes.set(key, state);
  /* Sanitized: the why is a fixed structural label, never payload data. */
  console.error(
    `coach request=${rid} vitalis_strike count=${state.strikes} why=${why} locked=${state.strikes >= VITALIS_STRIKE_LIMIT}`,
  );
  return state.strikes;
}

/* ============================================================================
   Provider chain — extracted so the deliberation pipeline can call
   the chain once per stage with its own system text and turns. The
   behaviour (order, cooldown probing, attempts, deadline, sanitized
   diagnostics) is exactly the handler's original loop.
   ========================================================================== */
function computeProviderOrder(media: Media | null, devPin: ProviderId | null): ProviderId[] {
  const order = providerOrder().filter(
    (id) =>
      (media ? REGISTRY[id].vision : true) &&
      REGISTRY[id].enabled() &&
      Deno.env.get(REGISTRY[id].secret),
  );
  if (devPin && REGISTRY[devPin] && order.includes(devPin)) {
    order.splice(order.indexOf(devPin), 1);
    order.unshift(devPin);
  }
  return order;
}

interface ChainResult {
  text: string | null;
  provider: ProviderId | null;
  diagnostics: string[];
}

async function runProviderChain(params: {
  systemText: string;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
  media: Media | null;
  order: ProviderId[];
  deadline: number;
  rid: string;
}): Promise<ChainResult> {
  const { systemText, turns, media, order, deadline, rid } = params;
  const maxAttempts = MAX_PROVIDER_ATTEMPTS();
  const attempted = new Set<ProviderId>();
  const diagnostics: string[] = [];

  /* Immediate retries must not hard-fail just because the best provider is
     mid-cooldown: if every candidate is cooling from a TRANSIENT failure we
     probe the best one. Auth/model-unavailable cooldowns are never probed. */
  const transientOnly = (id: ProviderId): boolean => {
    const st = stateFor(id);
    return (
      !st.lastCategory || (st.lastCategory !== "auth" && st.lastCategory !== "model_unavailable")
    );
  };
  const ready = order.filter(
    (id) => !isCoolingDown(id) || (order.every(isCoolingDown) && transientOnly(id)),
  );
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
        Math.min(media ? MEDIA_PROVIDER_TIMEOUT_MS() : PROVIDER_TIMEOUT_MS(), Math.max(1000, remaining - 700)),
      );
      const text = await callProvider(def, key, systemText, turns, media, signal);
      recordSuccess(id);
      diagnostics.push(
        `provider=${id} attempt=${attempted.size} result=success latencyMs=${Date.now() - attemptStart}`,
      );
      return { text, provider: id, diagnostics };
    } catch (err) {
      const category = classifyError(err);
      recordFailure(id, category);
      const latencyMs = Date.now() - attemptStart;
      const status = err instanceof HttpError ? err.status : "-";
      const detail =
        err instanceof HttpError
          ? err.body.slice(0, 200)
          : err instanceof Error
            ? err.message.slice(0, 200)
            : "";
      diagnostics.push(
        `provider=${id} attempt=${attempted.size} result=${category} status=${status} latencyMs=${latencyMs}`,
      );
      /* Sanitized log: never prompts, never personal data, never secrets. */
      console.error(
        `coach request=${rid} provider=${id} category=${category} status=${status} latencyMs=${latencyMs}` +
          (envBool("COACH_LOG_DETAIL", false)
            ? ` detail=${detail.replace(/[^\x20-\x7e]/g, "?")}`
            : ""),
      );
    }
  }
  return { text: null, provider: null, diagnostics };
}

/** The whole deliberation budget: draft + up to two revise calls. */
const DELIB_TOTAL_TIMEOUT_MS = () => envInt("COACH_DELIB_TOTAL_TIMEOUT_MS", 110_000);

const NDJSON_HEADERS = {
  ...CORS,
  "Content-Type": "application/x-ndjson",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

/** A one-event NDJSON stream (the locked reply on a streamed request). */
function ndjsonResult(payload: Record<string, unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start: (controller) => {
      controller.enqueue(encoder.encode(`${JSON.stringify({ type: "result", ...payload })}\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

/* ============================================================================
   VITALIS CHAT (phases 3–5) — lock check, record validation,
   deliberation, proposal validation. The Coach never reaches here.
   ========================================================================== */
async function handleVitalisChat(params: {
  body: Body;
  req: Request;
  rid: string;
  message: string;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
  recordText: string;
  rule: string;
  devPin: ProviderId | null;
  /** Money System: invoked exactly once per request that produced a
   *  real answer (fast path or deliberation, streamed or not) — the
   *  credit deduct. Locked and refused requests never reach it. */
  onSuccess?: () => Promise<void>;
}): Promise<Response> {
  const { body, req, rid, message, turns, recordText, rule, devPin, onSuccess } = params;
  const key = await vitalisCallerKey(req);
  const wantsStream = body.deliberate === true;
  const order = computeProviderOrder(null, devPin);
  const systemText = [
    VITALIS_SYSTEM,
    `THEIR RECORD — NUTRITION AND ASSESSMENT ONLY\n${recordText}`,
    `LENGTH\n${rule}`,
  ].join("\n\n");

  const lockedResponse = (): Response => {
    const payload = {
      paragraphs: VITALIS_LOCKED_PARAGRAPHS,
      actions: [],
      stages: [],
      vitalisLocked: true,
    };
    return wantsStream
      ? ndjsonResult(payload)
      : json({ ...payload, provider: "vitalis-guard" }, 200);
  };

  if (vitalisIsLocked(key)) return lockedResponse();

  /* The structured record: present-but-malformed is a structural
     forgery signal and strikes. Absent is a legacy client — served
     from the text record alone; no checks are possible and none are
     pretended. */
  let record = null;
  if (body.vitalisRecord !== undefined) {
    const validated = validateVitalisRecord(body.vitalisRecord);
    if (!validated.ok) {
      const strikes = recordVitalisStrike(key, rid, "malformed_record");
      if (strikes >= VITALIS_STRIKE_LIMIT) return lockedResponse();
      return json({ error: "invalid_record" }, 400);
    }
    record = validated.record;
  }

  const deliberate =
    record !== null && (body.deliberate === true || looksLikePlanRequest(message));

  if (deliberate && record) {
    const deliberationSystem = [
      VITALIS_SYSTEM,
      `THEIR RECORD — NUTRITION AND ASSESSMENT ONLY\n${recordText}`,
      VITALIS_DELIBERATION_ADDENDUM,
      `LENGTH\n${rule}`,
    ].join("\n\n");
    const startedAt = Date.now();
    const runIt = async (
      onStage?: (stage: string, label: string) => void,
    ) => {
      const outcome = await runDeliberation({
        callModel: async (sys: string, t: Array<{ role: "user" | "assistant"; content: string }>) => {
          if (Date.now() - startedAt > DELIB_TOTAL_TIMEOUT_MS()) return null;
          const result = await runProviderChain({
            systemText: sys,
            turns: t,
            media: null,
            order,
            deadline: Date.now() + TOTAL_TIMEOUT_MS(),
            rid,
          });
          return result.text;
        },
        draftSystem: deliberationSystem,
        reviseSystem: deliberationSystem,
        turns,
        record,
        contextText: recordText,
        userMessage: message,
        onStage: onStage as never,
      });
      if (outcome.invalidProposals > 0) {
        recordVitalisStrike(key, rid, "invalid_proposal");
      }
      return outcome;
    };

    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start: async (controller) => {
          const emit = (obj: Record<string, unknown>) => {
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
            } catch {
              /* the client went away — the work simply ends */
            }
          };
          try {
            const outcome = await runIt((stage, label) => emit({ type: "stage", stage, label }));
            await onSuccess?.();
            emit({
              type: "result",
              paragraphs: outcome.paragraphs,
              actions: outcome.actions,
              stages: outcome.stages,
              deliberated: true,
              fellBack: outcome.fellBack,
            });
          } catch {
            emit({ type: "error", error: "unavailable" });
          }
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
      });
      return new Response(stream, { headers: NDJSON_HEADERS });
    }

    try {
      const outcome = await runIt(undefined);
      await onSuccess?.();
      return json(
        {
          paragraphs: outcome.paragraphs,
          provider: "vitalis",
          actions: outcome.actions,
          stages: outcome.stages,
          deliberated: true,
          fellBack: outcome.fellBack,
        },
        200,
      );
    } catch {
      return json({ error: "unavailable", requestId: rid }, 502);
    }
  }

  /* Fast path — one provider call, exactly the phases 1+2 behaviour.
     Proposals in the reply are still parsed out of the spoken prose
     and validated against the record; an invalid one strikes. */
  const result = await runProviderChain({
    systemText,
    turns,
    media: null,
    order,
    deadline: Date.now() + TOTAL_TIMEOUT_MS(),
    rid,
  });
  if (!result.text) return json({ error: "unavailable", requestId: rid }, 502);
  let paragraphs = result.text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  let actions: unknown[] = [];
  if (record) {
    const parsed = parseActionBlocks(result.text);
    const clean = sanitizeProposals(parsed.rawProposals, record);
    if (clean.invalidCount + parsed.malformedBlocks > 0) {
      recordVitalisStrike(key, rid, "invalid_proposal");
    }
    actions = clean.proposals;
    paragraphs = parsed.prose
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (paragraphs.length === 0 && actions.length === 0) {
    return json({ error: "unavailable", requestId: rid }, 502);
  }
  await onSuccess?.();
  return json({ paragraphs, provider: result.provider, actions, stages: [] }, 200);
}

/** The client's report of a confirmed action's outcome. Shape only —
    the report carries no payload data, and a malformed one strikes. */
async function handleVitalisActionResult(body: Body, req: Request, rid: string): Promise<Response> {
  const key = await vitalisCallerKey(req);
  if (vitalisIsLocked(key)) return json({ error: "vitalis_locked" }, 403);
  const r = body.actionResult;
  const valid =
    Boolean(r) &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    typeof (r as Record<string, unknown>)["action"] === "string" &&
    VITALIS_ACTION_ALLOWLIST.includes((r as Record<string, unknown>)["action"] as string) &&
    typeof (r as Record<string, unknown>)["ok"] === "boolean";
  if (!valid) {
    const strikes = recordVitalisStrike(key, rid, "malformed_action_result");
    if (strikes >= VITALIS_STRIKE_LIMIT) return json({ error: "vitalis_locked" }, 403);
    return json({ error: "invalid_action_result" }, 400);
  }
  return json({ ok: true }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const rid = requestId();
  const started = Date.now();

  try {
    const body: Body = await req.json();
    /* The TTS action speaks text instead of answering — it returns
       before any message validation or provider is touched. */
    if (body.action === "tts") return await handleTts(body, req, rid);
    /* A Vitalis action-result report is shape-validated on its own
       path — it carries no message and touches no provider. */
    if (body.action === "vitalis-action-result") {
      return await handleVitalisActionResult(body, req, rid);
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "empty message" }, 400);

    /* Validate once, before any provider is contacted. */
    let media: Media | null = null;
    if (body.image && typeof body.image.dataBase64 === "string") {
      const mediaType = String(body.image.mediaType ?? "image/jpeg");
      if (body.image.dataBase64.length > 7_000_000) {
        console.error(
          `coach request=${rid} error=attached_too_large bytes=${body.image.dataBase64.length}`,
        );
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

    const register = body.register ?? "normal";
    const rule = LENGTH_RULE[register] ?? LENGTH_RULE.normal;
    /* Vitalis mode: its own prompt, and its record is the scoped
       Nutrition + Assessment context the client assembled — the Coach
       facts path below is not read, and the Coach prompt never runs. */
    const isVitalis = body.mode === "vitalis";
    const vitalisRecordText =
      typeof body.vitalisContext === "string" && body.vitalisContext.trim()
        ? body.vitalisContext.trim().slice(0, 12_000)
        : "Nothing yet: this person has not completed an Assessment and has no food logged. Say so honestly, and invite them to begin — do not invent a record for them.";
    const turns = [
      ...sanitizeHistory(body.history),
      { role: "user" as const, content: message.slice(0, 4000) },
    ];

    /* Client-sent provider overrides are NOT trusted in production routing.
       Only an explicit dev header matching a server-side secret may pin one. */
    const devKey = Deno.env.get("BLOOM_COACH_DEV_KEY") ?? "";
    const devPin =
      devKey && req.headers.get("x-bloom-coach-dev") === devKey && typeof body.provider === "string"
        ? (body.provider as ProviderId)
        : null;

    /* Money System gate — BEFORE any provider is called, for both
       chat paths. A denial is a clean 402 the client turns into an
       upgrade prompt; the deduct happens only after a real answer
       exists (Coach: below; Vitalis: its onSuccess callback). */
    const gate = await billingGateCheck(req, isVitalis ? "vitalis" : "coach", Boolean(media), rid);
    const gateError = gateErrorBody(gate, rid);
    if (gateError) return json(gateError, 402);

    /* Vitalis chat runs its own pipeline (lockdown, validation,
       deliberation) and returns from there. */
    if (isVitalis) {
      return await handleVitalisChat({
        body,
        req,
        rid,
        message,
        turns,
        recordText: vitalisRecordText,
        rule,
        devPin,
        onSuccess: () => billingCharge(req, gate, rid),
      });
    }

    /* The Assessment digest, when the client sent one: a section of
       its own in the Coach's context, absent entirely when there is
       no completed Assessment — every pre-existing section is
       byte-identical either way. */
    const assessmentSection = coachAssessmentSection(body.assessmentDigest);
    const systemText = [
      SYSTEM,
      `THEIR RECORD\n${factsToPrompt(body.facts)}`,
      ...(assessmentSection ? [assessmentSection] : []),
      `LENGTH\n${rule}`,
      ...(register === "plan" ? [PLAN_STRUCTURE] : []),
    ].join("\n\n");

    /* Vision narrows the chain to providers that can actually see. */
    const order = computeProviderOrder(media, devPin);
    if (media && order.length === 0) {
      /* No vision-capable provider available — never fake an image answer. */
      return json({ error: "unavailable", requestId: rid }, 502);
    }

    const result = await runProviderChain({
      systemText,
      turns,
      media,
      order,
      deadline: started + TOTAL_TIMEOUT_MS(),
      rid,
    });
    if (!result.text || !result.provider) {
      console.error(
        `coach request=${rid} all_providers_failed attempts=${result.diagnostics.join(" | ")}`,
      );
      return json({ error: "unavailable", requestId: rid }, 502);
    }

    const paragraphs = result.text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      return json({ error: "unavailable", requestId: rid }, 502);
    }
    if (envBool("COACH_LOG_DETAIL", false)) {
      console.info(`coach request=${rid} ${result.diagnostics.join(" | ")}`);
    }
    await billingCharge(req, gate, rid);
    return json({ paragraphs, provider: result.provider }, 200);
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
