/**
 * The Vitalis orb — a floating Bloom mark, bottom-right, that opens
 * the Vitalis window. Vitalis is NOT the Coach:
 *
 *   · its conversation is its OWN, held in this component's state —
 *     it never reads or writes the Coach thread (the shared store the
 *     Coach tab uses), never shows Coach history, and starts fresh
 *     every time the window opens: closing the window ends the
 *     session, and nothing of it is persisted anywhere;
 *   · its memory is data, not transcript: every send assembles a
 *     fresh record from Nutrition + Assessment ONLY
 *     (`buildVitalisContext`) — the Assessment, the engine's targets,
 *     the current plan, the food log and the dishes that suit the
 *     person. Habits, points, mood and the rest of Bloom are not in
 *     its world;
 *   · sends go to the coach edge function in `mode: "vitalis"`
 *     (`askVitalis`), which runs the Vitalis system prompt — a
 *     distinct identity with its own rules (never a doctor, numbers
 *     only from the record, recommendations only from the person's
 *     data and the library);
 *   · replies are SPOKEN automatically with the ElevenLabs voice
 *     (the function's TTS action) as they arrive — there is no listen
 *     button; the one voice control is a mute toggle. If voice is
 *     unavailable the conversation simply carries on in text;
 *   · dictation is the device's own SpeechRecognition, as before,
 *     and never auto-sends;
 *   · plan-shaped asks run the server's deliberation pipeline
 *     (phase 3): its real stages stream in and render inside this
 *     sheet as they happen — no timers, no invented steps;
 *   · a reply may carry validated action proposals (phase 4), shown
 *     as confirm cards and applied ONLY on the person's tap, through
 *     the same domain functions the UI itself uses;
 *   · if the server reports the phase-5 lock, this window shows the
 *     notice and its composer closes for the session — the rest of
 *     Bloom is untouched.
 *
 * Placement is unchanged from the Coach orb era: above the phone tab
 * bar, in from the right edge, below every sheet in z-order. On
 * /coach itself the orb renders nothing — that page is a full-screen
 * conversation surface already, and Vitalis keeps out of its way.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLocation } from "@tanstack/react-router";
import { Check, Lock, Mic, Send, Volume2, VolumeX } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomLogo } from "@/components/BloomLogo";
import { BackToTop } from "@/components/system/BackToTop";
import { useAssessment } from "@/hooks/useAssessment";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { routeShowsAppNav } from "@/lib/appNav";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { ASSESSMENT_KEY, parseAssessmentState } from "@/lib/assessment/state";
import { messageTime } from "@/lib/coach/ui-helpers";
import {
  DISH_CATEGORY_LABEL,
  DISH_LIBRARY,
  NO_DISH_FILTERS,
  browseDishes,
  groupByDay,
  logDish,
  planPatternOf,
  type DailyPlan,
} from "@/lib/nutrition";
import { getPref, setPref } from "@/lib/prefs";
import {
  assessmentStateWithChange,
  describeProposal,
  reportActionResult,
} from "@/lib/vitalis-ai/actions";
import { askVitalis, VitalisUnavailable } from "@/lib/vitalis-ai/client";
import { requestPaywall } from "@/lib/billing/paywall";
import { buildVitalisContext, type VitalisPlanSlice } from "@/lib/vitalis-ai/context";
import { VitalisSpeaker } from "@/lib/vitalis-ai/voice";
import {
  looksLikePlanRequest,
  sanitizeProposals,
  type VitalisActionProposal,
} from "../../../supabase/functions/coach/vitalis-core";
import {
  createRecognition,
  speechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice/speech";

import { CoachGlyph } from "./bloom-mark";

import "@/styles/coach.css";
import "@/styles/orb.css";

/* ------------------------------------------------------------------ */
/*  The session — Vitalis's own turns, held here and nowhere else      */
/* ------------------------------------------------------------------ */

/** A validated action proposal riding on a Vitalis turn, with its
 *  confirm-card words pre-computed against the record at arrival.
 *  `pending` is the only state with buttons: nothing applies without
 *  the person's tap, and a settled card can never fire twice. */
interface ProposalView {
  proposal: VitalisActionProposal;
  title: string;
  detail: string;
  confirmLabel: string;
  status: "pending" | "done" | "dismissed" | "failed";
  resultLine?: string;
}

interface VitalisTurn {
  id: string;
  role: "user" | "vitalis";
  time: string;
  paragraphs: string[];
  status: "sent" | "error";
  /** Validated proposals this reply carried (phase 4). */
  actions?: ProposalView[];
  /** This turn is the lockdown notice (phase 5), not a reply. */
  lockedNotice?: boolean;
  /** This turn is the Money System's pause (out of AI credits) — it
   *  offers Premium instead of a retry. */
  paywall?: boolean;
}

function newTurnId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function planSlice(plan: DailyPlan, stale: boolean): VitalisPlanSlice {
  return {
    day: plan.day,
    stale,
    goalLabel: GOAL_LABEL[plan.goal],
    targets: plan.targets,
    meals: plan.meals.map((meal) => ({
      meal: meal.meal,
      kcal: meal.kcal,
      proteinG: meal.proteinG,
      items: [
        ...meal.dishes.map((d) => `${d.name} (dish)`),
        ...meal.suggestions.map((s) => `${s.name} (${Math.round(s.grams)} g)`),
      ],
      dishIds: meal.dishes.map((d) => d.dishId),
      note: meal.note,
    })),
    notes: [...plan.cautions, ...plan.notes],
  };
}

/**
 * The root layout's orb switch: the orb rides the same routes as the
 * app chrome (see `routeShowsAppNav`) and no others — the public pages,
 * the access gate and the 404 stand without it.
 */
export function CoachOrbGate() {
  const { pathname } = useLocation();
  if (!routeShowsAppNav(pathname)) return null;
  return <CoachOrb />;
}

export function CoachOrb() {
  const { pathname } = useLocation();
  const assessment = useAssessment();
  const nutrition = useNutrition();
  const plan = usePlan();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<VitalisTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  /* Deliberation progress (phase 3): the stage ids in first-arrival
     order, their server-sent labels, and the stage running now —
     rendered only from what the server actually reported. */
  const [stageTrail, setStageTrail] = useState<string[]>([]);
  const [stageLabels, setStageLabels] = useState<Record<string, string>>({});
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  /* Lockdown (phase 5): once the server reports the lock, the
     composer closes for this window session. */
  const [locked, setLocked] = useState(false);
  const [responseSlow, setResponseSlow] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [errorTurnId, setErrorTurnId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* The speaker lives for the component's life; mute is session state. */
  const [speaker] = useState(() => new VitalisSpeaker());

  const orbRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftRef = useRef("");
  draftRef.current = draft;
  const dictationBaseRef = useRef("");
  const turnsRef = useRef<VitalisTurn[]>([]);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const lastFailedRef = useRef<string | null>(null);

  const onCoachPage = pathname === "/coach" || pathname.startsWith("/coach/");
  const micAvailable = speechRecognitionSupported();

  const applyTurns = useCallback((next: VitalisTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  /* ------------------------------ lifecycle ------------------------------ */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const stopDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  /* Closing the window ENDS the session: speech stops, any in-flight
     reply is abandoned, and the turns are dropped — the next open is
     a fresh conversation, by design. */
  const close = useCallback(() => {
    setOpen(false);
    speaker.stop();
    stopDictation();
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setThinking(false);
    setResponseSlow(false);
    setStageTrail([]);
    setStageLabels({});
    setCurrentStage(null);
    setLocked(false);
    setErrorTurnId(null);
    lastFailedRef.current = null;
    applyTurns([]);
  }, [speaker, stopDictation, applyTurns]);

  /* Navigation closes the window (and its session) too. */
  useEffect(() => {
    close();
  }, [pathname, close]);

  /* Leaving the app surface entirely: no orphan playback or dictation. */
  useEffect(
    () => () => {
      speaker.stop();
      stopDictation();
    },
    [speaker, stopDictation],
  );

  /* Keep the newest turn in view while the window is open. */
  useEffect(() => {
    if (!open) return;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [open, turns.length, thinking, stageTrail.length, currentStage]);

  /* Auto-grow the composer, capped — the same recipe as before. */
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [draft, open]);

  /* -------------------------------- voice -------------------------------- */
  const toggleMute = useCallback(() => {
    setMuted((current) => {
      speaker.setMuted(!current);
      return !current;
    });
  }, [speaker]);

  const toggleDictation = useCallback(() => {
    if (listening) {
      stopDictation();
      return;
    }
    const recognition = createRecognition();
    if (!recognition) return;
    const base = draftRef.current.trim();
    dictationBaseRef.current = base ? `${base} ` : "";
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const alternative = event.results[i]?.[0];
        if (alternative) transcript += alternative.transcript;
      }
      setDraft(dictationBaseRef.current + transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }, [listening, stopDictation]);

  /* --------------------------- the scoped record -------------------------- */
  /* Assembled fresh at every send from the two domains' own hooks —
     the same sources the Nutrition tab reads, so Vitalis can never
     quote a number the tab wouldn't show. */
  const buildContext = useCallback(() => {
    const state = assessment.state;
    const targets =
      nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;
    const planValue =
      plan.state.kind === "ready"
        ? planSlice(plan.state.plan, plan.state.staleness.stale)
        : plan.state.kind === "outdated"
          ? planSlice(plan.state.plan, true)
          : null;
    const todayLog = nutrition.dayLog(nutrition.today);
    const recentDays = groupByDay(nutrition.entries)
      .filter((d) => d.day < nutrition.today)
      .slice(-7)
      .reverse()
      .map((d) => ({
        day: d.day,
        entriesCount: d.entries.length,
        totals: d.totals,
        names: d.entries.map((e) => e.name),
      }));
    const pattern = planPatternOf(state.answers.dietaryPattern);
    const dishes = browseDishes({ ...NO_DISH_FILTERS, pattern })
      .filter(
        (row) =>
          state.answers.foodBudget === null || row.dish.budgetTier <= state.answers.foodBudget,
      )
      .sort((x, y) => y.labelled.nutrients.proteinG - x.labelled.nutrients.proteinG)
      .slice(0, 40)
      .map((row) => ({
        id: row.dish.id,
        name: row.dish.name.en,
        category: DISH_CATEGORY_LABEL[row.dish.category],
        kcal: row.labelled.nutrients.kcal,
        proteinG: row.labelled.nutrients.proteinG,
      }));
    return buildVitalisContext({
      today: nutrition.today,
      assessment: { status: state.status, completedAt: state.completedAt, answers: state.answers },
      targets,
      targetsBlocked: nutrition.targetState.kind === "blocked",
      plan: planValue,
      todayLog: {
        day: todayLog.day,
        entries: todayLog.entries.map((e) => ({
          name: e.name,
          meal: e.meal,
          kcal: e.nutrients.kcal,
          proteinG: e.nutrients.proteinG,
        })),
        totals: todayLog.totals,
      },
      recentDays,
      customFoods: nutrition.foods
        .slice(0, 30)
        .map((f) => ({ id: f.id, name: f.name, kcal: f.per100g.kcal, proteinG: f.per100g.proteinG })),
      dishes,
    });
  }, [assessment.state, nutrition, plan.state]);

  /* -------------------------------- sending ------------------------------- */
  const runSend = useCallback(
    async (text: string, appendUser: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setThinking(true);
      setResponseSlow(false);
      setErrorTurnId(null);
      slowTimerRef.current = window.setTimeout(() => setResponseSlow(true), 12_000);
      const controller = new AbortController();
      abortRef.current = controller;

      /* History is THIS session's turns only — the window's own state,
         never any stored thread. */
      const history = turnsRef.current
        .filter((t) => t.status === "sent")
        .map((t) => ({
          role: (t.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: t.paragraphs.join("\n\n"),
        }));

      if (appendUser) {
        applyTurns([
          ...turnsRef.current,
          {
            id: newTurnId("user"),
            role: "user",
            time: new Date().toISOString(),
            paragraphs: [text],
            status: "sent",
          },
        ]);
        /* The send is accepted — the composer lets go of its copy. */
        setDraft("");
      }

      /* Plan/recommendation-shaped asks run the deliberation
         pipeline: its stages stream in and the panel shows each as
         it really happens. Ordinary questions keep the fast path. */
      const deliberate = looksLikePlanRequest(text);
      const context = buildContext();
      setStageTrail([]);
      setStageLabels({});
      setCurrentStage(null);

      try {
        const reply = await askVitalis({
          text,
          history,
          contextText: context.text,
          record: context.record,
          deliberate,
          onStage: (event) => {
            if (controller.signal.aborted) return;
            setStageLabels((current) => ({ ...current, [event.stage]: event.label }));
            setStageTrail((current) =>
              current.includes(event.stage) ? current : [...current, event.stage],
            );
            setCurrentStage(event.stage);
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const isLocked = reply.locked ?? false;
        if (isLocked) setLocked(true);
        /* Defence in depth: whatever arrived is re-validated against
           this window's own record before a card can exist — a forged
           or out-of-scope action is dropped here and never renders. */
        const safeActions = isLocked
          ? []
          : sanitizeProposals(reply.actions ?? [], context.record).proposals;
        const turn: VitalisTurn = {
          id: newTurnId("vitalis"),
          role: "vitalis",
          time: new Date().toISOString(),
          paragraphs: reply.paragraphs,
          status: "sent",
          ...(isLocked ? { lockedNotice: true } : {}),
          ...(safeActions.length > 0
            ? {
                actions: safeActions.map((proposal) => {
                  const words = describeProposal(proposal, context.record);
                  return {
                    proposal,
                    title: words.title,
                    detail: words.detail,
                    confirmLabel: words.confirmLabel,
                    status: "pending" as const,
                  };
                }),
              }
            : {}),
        };
        applyTurns([...turnsRef.current, turn]);
        setFreshId(turn.id);
        lastFailedRef.current = null;
        /* The reply is spoken as it arrives — automatically, unless
           the person has muted Vitalis for this session. Proposals
           are never part of the spoken paragraphs. */
        speaker.speak(reply.paragraphs.join(" "));
      } catch (err) {
        if (controller.signal.aborted) return;
        /* Money System: an out-of-credits refusal is a pause, not a
           connection failure — its own turn, a Premium button, and
           no retry (the same words would meet the same balance). */
        const billingRefusal =
          err instanceof VitalisUnavailable &&
          (err.reason === "insufficient_credits" || err.reason === "premium_required");
        if (billingRefusal) {
          const turn: VitalisTurn = {
            id: newTurnId("vitalis-paywall"),
            role: "vitalis",
            time: new Date().toISOString(),
            paragraphs: [
              "You've used this month's AI credits, so I pause here. Premium refills the allowance every month — your record, plans and trackers keep working either way.",
            ],
            status: "error",
            paywall: true,
          };
          applyTurns([...turnsRef.current, turn]);
          lastFailedRef.current = null;
          return;
        }
        const turn: VitalisTurn = {
          id: newTurnId("vitalis-error"),
          role: "vitalis",
          time: new Date().toISOString(),
          paragraphs: ["Check the connection and try again — your words are kept."],
          status: "error",
        };
        applyTurns([...turnsRef.current, turn]);
        setErrorTurnId(turn.id);
        lastFailedRef.current = text;
      } finally {
        if (slowTimerRef.current) {
          window.clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        if (abortRef.current === controller) abortRef.current = null;
        inFlightRef.current = false;
        setThinking(false);
        setResponseSlow(false);
        setCurrentStage(null);
      }
    },
    [applyTurns, buildContext, speaker],
  );

  const submit = useCallback(() => {
    const text = draftRef.current.trim();
    if (!text || inFlightRef.current) return;
    stopDictation();
    speaker.stop();
    void runSend(text, true);
  }, [runSend, speaker, stopDictation]);

  const retry = useCallback(() => {
    const text = lastFailedRef.current;
    if (!text || inFlightRef.current) return;
    applyTurns(turnsRef.current.filter((t) => t.id !== errorTurnId));
    setErrorTurnId(null);
    void runSend(text, false);
  }, [applyTurns, errorTurnId, runSend]);

  /* ------------------------- proposal confirm ------------------------- */

  const settleProposal = useCallback(
    (turnId: string, index: number, status: ProposalView["status"], resultLine?: string) => {
      applyTurns(
        turnsRef.current.map((turn) =>
          turn.id !== turnId || !turn.actions
            ? turn
            : {
                ...turn,
                actions: turn.actions.map((view, i) =>
                  i === index ? { ...view, status, ...(resultLine ? { resultLine } : {}) } : view,
                ),
              },
        ),
      );
    },
    [applyTurns],
  );

  const dismissProposal = useCallback(
    (turnId: string, index: number) => settleProposal(turnId, index, "dismissed"),
    [settleProposal],
  );

  /**
   * THE confirm tap — the only route from a proposal to a write.
   * Every branch applies through the same domain function the UI
   * itself uses (the dish log, the food log, the plan composer, the
   * assessment pref), and the outcome is reported back to the
   * function in the shape phase 5 validates.
   */
  const confirmProposal = useCallback(
    (turnId: string, index: number) => {
      const turn = turnsRef.current.find((t) => t.id === turnId);
      const view = turn?.actions?.[index];
      if (!view || view.status !== "pending") return;
      const proposal = view.proposal;
      let ok = false;
      let line = "";
      switch (proposal.action) {
        case "log_dish": {
          const dish = DISH_LIBRARY.find((d) => d.id === proposal.dishId);
          if (!dish) {
            line = "That dish is no longer in the library — nothing was logged.";
            break;
          }
          const entry = logDish(dish, proposal.meal, nutrition.today);
          ok = entry !== null;
          line = ok
            ? `Logged — ${dish.name.en} is in today's food log.`
            : "That could not be logged just now.";
          break;
        }
        case "log_food": {
          const food = nutrition.foodById(proposal.foodId);
          if (!food) {
            line = "That food is no longer available — nothing was logged.";
            break;
          }
          const isCustom = nutrition.foods.some((f) => f.id === food.id);
          const entry = nutrition.logFood(
            food,
            { grams: proposal.grams },
            proposal.meal,
            nutrition.today,
            isCustom ? "custom" : "search",
          );
          ok = entry !== null;
          line = ok
            ? `Logged — ${food.name} is in today's food log.`
            : "That could not be logged just now.";
          break;
        }
        case "compose_plan": {
          const outcome = plan.generate();
          ok = outcome.ok;
          line = outcome.ok
            ? "Done — today's plan is composed and waiting in the Nutrition tab."
            : "Bloom could not compose a plan just now — the Nutrition tab shows what is missing.";
          break;
        }
        case "swap_dish": {
          const from = DISH_LIBRARY.find((d) => d.id === proposal.fromDishId);
          const to = DISH_LIBRARY.find((d) => d.id === proposal.toDishId);
          ok = plan.swapPlanDish(proposal.meal, proposal.fromDishId, proposal.toDishId);
          line = ok
            ? `Swapped — ${to?.name.en ?? "the new dish"} replaces ${from?.name.en ?? "the old dish"} in your ${proposal.meal} plan.`
            : "That swap could not be applied — your plan is unchanged.";
          break;
        }
        case "propose_assessment_change": {
          const current = getPref(ASSESSMENT_KEY, parseAssessmentState, null);
          const next = current
            ? assessmentStateWithChange(current, proposal, new Date().toISOString())
            : null;
          if (next) {
            setPref(ASSESSMENT_KEY, next);
            ok = true;
            line = "Applied — your assessment is updated.";
          } else {
            line = "That change could not be applied — nothing was altered.";
          }
          break;
        }
      }
      settleProposal(turnId, index, ok ? "done" : "failed", line);
      reportActionResult(proposal.action, ok);
    },
    [nutrition, plan, settleProposal],
  );

  const starters = useMemo(
    () =>
      assessment.state.status === "complete"
        ? [
            "How is my protein looking today?",
            "What should I have for dinner?",
            "Is my plan right for my goal?",
          ]
        : [
            "What do you need to know about me?",
            "How will my plan be built?",
            "What can you help with?",
          ],
    [assessment.state.status],
  );

  /* --------------------------------- view --------------------------------- */
  if (onCoachPage) return null;

  return (
    <>
      {/* The floating dock (brief v4 Part 4; rulebook §21): one fixed
          container holds the back-to-top fab and this orb — same 48px
          chrome, same x. The dock owns placement (orb.css styles the
          button only); the panel and backdrop below are portalled and
          keep their own stacking. */}
      <div className="dock">
        <BackToTop />
        <button
          ref={orbRef}
          type="button"
          className="coach-orb"
          data-reduced-motion={reducedMotion ? "true" : undefined}
          aria-label="Ask Vitalis"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="coach-orb-halo" aria-hidden="true" />
          <BloomLogo size={22} />
        </button>
      </div>

      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="coach-orb-backdrop" onClick={close} />
          <DialogPrimitive.Content
            className="coach-orb-panel coach-overlay-scope"
            data-reduced-motion={reducedMotion ? "true" : undefined}
            aria-label="Vitalis"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              textareaRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              orbRef.current?.focus();
            }}
          >
            <DialogPrimitive.Title className="sr-only">Vitalis</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Chat with Vitalis, Bloom&rsquo;s nutrition intelligence. A fresh conversation each
              time — nothing here is the Coach thread.
            </DialogPrimitive.Description>

            <div className="coach-orb-head">
              <CoachGlyph size={18} />
              <div className="coach-orb-head-copy">
                <p className="coach-orb-title">Vitalis</p>
                <p className="coach-orb-sub">Nutrition &amp; assessment · fresh each time</p>
              </div>
              <button
                type="button"
                className="coach-orb-icon-btn"
                data-muted={muted ? "true" : undefined}
                onClick={toggleMute}
                aria-label={muted ? "Unmute Vitalis's voice" : "Mute Vitalis's voice"}
                aria-pressed={muted}
                title={muted ? "Unmute my voice" : "Mute my voice"}
              >
                {muted ? (
                  <VolumeX className="size-[18px]" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-[18px]" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="coach-orb-icon-btn"
                onClick={close}
                aria-label="Close chat"
                title="Close"
              >
                <BloomIcon name="close" size={15} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="coach-orb-thread"
              role="log"
              aria-live="polite"
              aria-busy={thinking}
            >
              {turns.length === 0 && !thinking ? (
                <div className="coach-orb-welcome">
                  <CoachGlyph size={30} />
                  <p className="coach-orb-welcome-greeting">I&rsquo;m Vitalis.</p>
                  <p className="coach-orb-welcome-line">
                    I look after the food side of Bloom — your assessment, your plan and what you
                    eat. I answer only from your real numbers, and I&rsquo;ll read my replies
                    aloud unless you mute me.
                  </p>
                  <div className="coach-orb-starters">
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="coach-orb-starter"
                        onClick={() => void runSend(starter, true)}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="coach-orb-list">
                  {turns.map((turn) =>
                    turn.role === "user" ? (
                      <div key={turn.id} className="coach-msg coach-msg-user">
                        <div className="coach-user-stack">
                          <div className="coach-user-bubble">
                            <p>{turn.paragraphs.join("\n")}</p>
                          </div>
                          <time className="coach-msg-time coach-user-time" dateTime={turn.time}>
                            {messageTime(turn.time, "now")}
                          </time>
                        </div>
                      </div>
                    ) : turn.status === "error" ? (
                      <div key={turn.id} className="coach-orb-error" role="alert">
                        <CoachGlyph size={14} />
                        <div className="coach-orb-error-copy">
                          <p className="coach-orb-error-title">
                            {turn.paywall
                              ? "Vitalis is paused for now."
                              : "Vitalis couldn\u2019t connect right now."}
                          </p>
                          <p>{turn.paragraphs[0]}</p>
                        </div>
                        {turn.paywall ? (
                          <button
                            type="button"
                            className="coach-orb-retry"
                            onClick={() => requestPaywall("vitalis_credits")}
                          >
                            See Premium
                          </button>
                        ) : turn.id === errorTurnId ? (
                          <button type="button" className="coach-orb-retry" onClick={retry}>
                            Try again
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <article
                        key={turn.id}
                        className="coach-orb-reply"
                        data-fresh={turn.id === freshId ? "true" : undefined}
                        data-locked={turn.lockedNotice ? "true" : undefined}
                        aria-label="Vitalis message"
                      >
                        <div className="coach-orb-reply-head">
                          {turn.lockedNotice ? (
                            <Lock className="size-[15px]" aria-hidden="true" />
                          ) : (
                            <CoachGlyph size={15} />
                          )}
                          <span className="coach-orb-reply-author">Vitalis</span>
                          <time className="coach-msg-time" dateTime={turn.time}>
                            {messageTime(turn.time)}
                          </time>
                        </div>
                        {turn.paragraphs.map((paragraph, i) => (
                          <p key={i} className="coach-orb-reply-p">
                            {paragraph}
                          </p>
                        ))}
                        {turn.actions?.map((view, i) => (
                          <div
                            key={i}
                            className="coach-orb-action-card"
                            data-status={view.status}
                          >
                            <p className="coach-orb-action-title">{view.title}</p>
                            <p className="coach-orb-action-detail">{view.detail}</p>
                            {view.status === "pending" ? (
                              <div className="coach-orb-action-btns">
                                <button
                                  type="button"
                                  className="coach-orb-action-confirm"
                                  onClick={() => confirmProposal(turn.id, i)}
                                >
                                  {view.confirmLabel}
                                </button>
                                <button
                                  type="button"
                                  className="coach-orb-action-dismiss"
                                  onClick={() => dismissProposal(turn.id, i)}
                                >
                                  Not now
                                </button>
                              </div>
                            ) : view.status === "dismissed" ? (
                              <p className="coach-orb-action-result">Dismissed — nothing changed.</p>
                            ) : (
                              <p className="coach-orb-action-result">
                                {view.status === "done" ? (
                                  <Check className="size-[13px]" aria-hidden="true" />
                                ) : null}{" "}
                                {view.resultLine ?? ""}
                              </p>
                            )}
                          </div>
                        ))}
                      </article>
                    ),
                  )}
                  {thinking && stageTrail.length > 0 ? (
                    <div className="coach-orb-stages" role="status" aria-label="Vitalis is working">
                      <div className="coach-orb-stages-head">
                        <CoachGlyph size={15} active />
                        <span>
                          Vitalis is checking this one properly — the careful path takes a little
                          longer.
                        </span>
                      </div>
                      <ul className="coach-orb-stages-list">
                        {stageTrail.map((stage) => {
                          const isCurrent = stage === currentStage;
                          return (
                            <li
                              key={stage}
                              className="coach-orb-stage"
                              data-current={isCurrent ? "true" : undefined}
                            >
                              <span className="coach-orb-stage-mark" aria-hidden="true">
                                {isCurrent ? (
                                  <span className="coach-orb-stage-pulse" />
                                ) : (
                                  <Check className="size-[12px]" />
                                )}
                              </span>
                              <span>{stageLabels[stage] ?? stage}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : thinking ? (
                    <div className="coach-orb-thinking" role="status">
                      <CoachGlyph size={15} active />
                      <span>
                        {responseSlow
                          ? "Vitalis is taking a little longer…"
                          : "Vitalis is thinking…"}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <form
              className="coach-orb-composer"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label className="sr-only" htmlFor="coach-orb-input">
                Message Vitalis
              </label>
              <textarea
                id="coach-orb-input"
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  locked
                    ? "Vitalis is paused — sign in again to continue"
                    : "Ask Vitalis about your food or plan…"
                }
                disabled={locked}
                className="coach-orb-input"
              />
              {micAvailable ? (
                <button
                  type="button"
                  className="coach-orb-icon-btn coach-orb-mic"
                  data-listening={listening ? "true" : undefined}
                  onClick={toggleDictation}
                  aria-label={listening ? "Stop dictating" : "Dictate your message"}
                  aria-pressed={listening}
                  title={listening ? "Stop dictating" : "Dictate your message"}
                >
                  <Mic className="size-[18px]" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="submit"
                className="coach-orb-send"
                disabled={!draft.trim() || thinking || locked}
                aria-label="Send message"
                title="Send message"
              >
                {thinking ? (
                  <CoachGlyph size={15} active />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
