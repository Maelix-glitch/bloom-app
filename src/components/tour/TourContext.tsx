/**
 * TourContext — global tour state, persistence, and controls.
 *
 * - Loads completed map from localStorage/idb
 * - Provides startTour(id), next, prev, skip, close
 * - Filters steps that are not available (when() or missing data-tour)
 * - Auto-starts global tour for new users (once) unless dismissed
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => loadTourSync().completed);
  const [dismissedGlobal, setDismissedGlobal] = useState<boolean>(() => Boolean(loadTourSync().dismissedGlobal));
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

  const startTour = useCallback(
    (id: TourId) => {
      const def = getTour(id);
      if (!def) return;
      // filter first to know if any steps
      const steps = def.steps.filter((s) => {
        if (s.target === "nav-cycle" && !cycleVisible) return false;
        if (s.when && !s.when()) return false;
        return true;
      });
      if (steps.length === 0) return;
      setActiveId(id);
      setStepIndex(0);
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
      setActiveId(null);
      setStepIndex(0);
      window.dispatchEvent(new CustomEvent("bloom:tour-complete", { detail: { id: activeDef.id } }));
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [activeDef, stepIndex, totalSteps, completed, persist]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    if (!activeDef) return;
    if (activeDef.id === "global") {
      setDismissedGlobal(true);
      persist(completed, true);
    }
    setActiveId(null);
    setStepIndex(0);
    window.dispatchEvent(new CustomEvent("bloom:tour-skip", { detail: { id: activeDef?.id } }));
  }, [activeDef, completed, persist]);

  const close = useCallback(() => {
    if (activeDef?.id === "global") {
      setDismissedGlobal(true);
      persist(completed, true);
    }
    setActiveId(null);
    setStepIndex(0);
  }, [activeDef, completed, persist]);

  const resetTours = useCallback(() => {
    const cleared: Record<string, boolean> = {};
    setCompleted(cleared);
    setDismissedGlobal(false);
    persist(cleared, false);
    setActiveId(null);
    setStepIndex(0);
  }, [persist]);

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
    showPrompt: !dismissedGlobal && !completed["global"] && hydrated && !activeId,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {activeId && currentStep ? (
        <TourOverlay
          step={currentStep}
          index={stepIndex}
          total={totalSteps}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onClose={close}
        />
      ) : null}
    </TourContext.Provider>
  );
}
