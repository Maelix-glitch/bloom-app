/**
 * TourContext — global tour state, persistence, and controls.
 *
 * - Loads completed map from localStorage/idb
 * - Provides startTour(id), next, prev, skip, close
 * - Filters steps that are not available (when() or missing data-tour)
 * - Auto-starts global tour for new users (once) unless dismissed
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { TourDefinition, TourId, TourStep } from "@/lib/tour/types";
import { TOURS, getTour } from "./tours";
import { loadTourSync, saveTourSync, loadTourPersist, saveTourPersist } from "@/lib/tour/storage";
import { useCycleVisible } from "@/hooks/useCycleVisible";
import { useOnboarding } from "@/hooks/useOnboarding";
import { TourOverlay } from "./TourOverlay";

interface TourContextValue {
  activeId: TourId | null;
  activeDef: TourDefinition | null;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  completed: Record<string, boolean>;
  isActive: boolean;
  startTour: (id: TourId) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  close: () => void;
  resetTours: () => void;
  /** Should we show the little "Take a tour" prompt? */
  showPrompt: boolean;
}

/** Matches the fade-out in tour.css: long enough to read as motion, not wait. */
const LEAVE_MS = 260;

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { visible: cycleVisible } = useCycleVisible();
  const onboarding = useOnboarding();

  const [activeId, setActiveId] = useState<TourId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  /** Which way the last step change travelled — the card slides in from there. */
  const [direction, setDirection] = useState<1 | -1>(1);
  /**
   * True for the beat between "the tour is over" and the overlay unmounting.
   * Unmounting a full-screen dim in one frame is a pop, and a pop at the end of
   * something smooth is the part people remember — so the spotlight fades out
   * first and only then goes away.
   */
  const [leaving, setLeaving] = useState(false);
  const leavingTimer = useRef<number | null>(null);
  /**
   * Any tour started this session. Without it, closing (say) the Mood tour put
   * the "New to Bloom?" prompt straight back on screen — the one moment where
   * the tutorial undoes the tutorial.
   */
  const [startedAny, setStartedAny] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    () => loadTourSync().completed,
  );
  const [dismissedGlobal, setDismissedGlobal] = useState<boolean>(() =>
    Boolean(loadTourSync().dismissedGlobal),
  );
  const [hydrated, setHydrated] = useState(false);

  // load async persist (idb) on mount
  useEffect(() => {
    void loadTourPersist().then((p) => {
      setCompleted(p.completed ?? {});
      setDismissedGlobal(Boolean(p.dismissedGlobal));
      setHydrated(true);
    });
  }, []);

  const persist = useCallback(
    (nextCompleted: Record<string, boolean>, nextDismissed?: boolean) => {
      const data = {
        completed: nextCompleted,
        dismissedGlobal: nextDismissed ?? dismissedGlobal,
        lastSeenAt: new Date().toISOString(),
      };
      saveTourSync(data);
      void saveTourPersist(data);
    },
    [dismissedGlobal],
  );

  const activeDef = useMemo(() => (activeId ? getTour(activeId) : null), [activeId]);

  const visibleSteps = useMemo(() => {
    if (!activeDef) return [];
    return activeDef.steps.filter((s) => {
      // cycle nav filtering
      if (s.target === "nav-cycle" && !cycleVisible) return false;
      if (s.target.startsWith("home-phase") && !cycleVisible) return false;
      if (s.target.startsWith("cycle-") && !cycleVisible && activeDef.id !== "global") return false;
      // custom when
      if (s.when && !s.when()) return false;
      return true;
    });
  }, [activeDef, cycleVisible]);

  const currentStep = visibleSteps[stepIndex] ?? null;
  const totalSteps = visibleSteps.length;

  /** Fade the spotlight out, then drop it. Every ending goes through here. */
  const dismiss = useCallback(() => {
    if (leavingTimer.current !== null) window.clearTimeout(leavingTimer.current);
    setLeaving(true);
    leavingTimer.current = window.setTimeout(() => {
      leavingTimer.current = null;
      setLeaving(false);
      setActiveId(null);
      setStepIndex(0);
    }, LEAVE_MS);
  }, []);

  useEffect(
    () => () => {
      if (leavingTimer.current !== null) window.clearTimeout(leavingTimer.current);
    },
    [],
  );

  const startTour = useCallback(
    (id: TourId) => {
      const def = getTour(id);
      if (!def) return;
      /* Starting again mid-fade: cancel the exit so the new tour doesn't blink. */
      if (leavingTimer.current !== null) {
        window.clearTimeout(leavingTimer.current);
        leavingTimer.current = null;
      }
      setLeaving(false);
      // filter first to know if any steps
      const steps = def.steps.filter((s) => {
        if (s.target === "nav-cycle" && !cycleVisible) return false;
        if (s.when && !s.when()) return false;
        return true;
      });
      if (steps.length === 0) return;
      setStartedAny(true);
      setActiveId(id);
      setStepIndex(0);
      setDirection(1);
      // announce
      window.dispatchEvent(new CustomEvent("bloom:tour-start", { detail: { id } }));
    },
    [cycleVisible],
  );

  const next = useCallback(() => {
    if (!activeDef) return;
    if (stepIndex + 1 >= totalSteps) {
      // complete
      const nextCompleted = { ...completed, [activeDef.id]: true };
      setCompleted(nextCompleted);
      persist(nextCompleted);
      dismiss();
      window.dispatchEvent(
        new CustomEvent("bloom:tour-complete", { detail: { id: activeDef.id } }),
      );
      toast("That's the tour.", {
        description: "The ? button replays it any time — and each page has its own.",
      });
    } else {
      setDirection(1);
      setStepIndex((i) => i + 1);
    }
  }, [activeDef, stepIndex, totalSteps, completed, persist, dismiss]);

  const prev = useCallback(() => {
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    if (!activeDef) return;
    if (activeDef.id === "global") {
      setDismissedGlobal(true);
      persist(completed, true);
    }
    dismiss();
    window.dispatchEvent(new CustomEvent("bloom:tour-skip", { detail: { id: activeDef?.id } }));
  }, [activeDef, completed, persist, dismiss]);

  const close = useCallback(() => {
    if (activeDef?.id === "global") {
      setDismissedGlobal(true);
      persist(completed, true);
    }
    dismiss();
  }, [activeDef, completed, persist, dismiss]);

  const resetTours = useCallback(() => {
    const cleared: Record<string, boolean> = {};
    setCompleted(cleared);
    setDismissedGlobal(false);
    persist(cleared, false);
    dismiss();
  }, [persist, dismiss]);

  // auto-start global tour for first-time users (once, after onboarding)
  useEffect(() => {
    if (!hydrated) return;
    if (dismissedGlobal) return;
    if (completed["global"]) return;
    if (!onboarding.hydrated) return;
    if (onboarding.needsWelcome) return; // still in welcome
    // only if user has at least some data or is brand new — show prompt after 1.2s
    const t = window.setTimeout(() => {
      // don't auto-start if user already did any tour
      if (Object.keys(completed).length > 0) return;
      // check if nav exists
      if (typeof document !== "undefined" && document.querySelector('[data-tour="nav-today"]')) {
        setStartedAny(true);
        setActiveId("global");
        setStepIndex(0);
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [hydrated, dismissedGlobal, completed, onboarding.hydrated, onboarding.needsWelcome]);

  const value: TourContextValue = {
    activeId,
    activeDef,
    currentStep,
    stepIndex,
    totalSteps,
    completed,
    isActive: Boolean(activeId && currentStep),
    startTour,
    next,
    prev,
    skip,
    close,
    resetTours,
    showPrompt: !dismissedGlobal && !completed["global"] && hydrated && !activeId && !startedAny,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {activeId && currentStep ? (
        <TourOverlay
          step={currentStep}
          index={stepIndex}
          total={totalSteps}
          direction={direction}
          leaving={leaving}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onClose={close}
        />
      ) : null}
    </TourContext.Provider>
  );
}
