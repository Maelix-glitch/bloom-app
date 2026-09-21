// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

/**
 * The tour's *manners*, which the overlay can't prove on its own:
 *
 *   · it doesn't offer a tour before it has read storage (no flash of prompt);
 *   · every ending — finished, skipped, dismissed — fades out before unmounting,
 *     so the spotlight never pops away in one frame;
 *   · finishing says so, and remembers it;
 *   · and once you've taken any tour, the "New to Bloom?" prompt stays quiet.
 *     Closing the Mood tour used to put it straight back on screen.
 */

import { TourProvider, useTour } from "./TourContext";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/hooks/useCycleVisible", () => ({
  useCycleVisible: () => ({ visible: true, optedOut: false, trackingOff: false }),
}));
vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => ({ hydrated: true, needsWelcome: false, cycle: true }),
}));
/* The overlay has its own suite; here it is a probe for what the context hands
   it — which step, which way it travelled, and whether it's on its way out. */
vi.mock("./TourOverlay", () => ({
  TourOverlay: (props: { step: { id: string } | null; direction: 1 | -1; leaving?: boolean }) => (
    <div
      data-testid="overlay"
      data-leaving={String(Boolean(props.leaving))}
      data-direction={String(props.direction)}
    >
      {props.step?.id ?? ""}
    </div>
  ),
}));

type Tour = ReturnType<typeof useTour>;

let latest: Tour | null = null;

function Probe() {
  latest = useTour();
  return (
    <div data-testid="probe">
      {JSON.stringify({
        prompt: latest.showPrompt,
        active: latest.isActive,
        step: latest.currentStep?.id ?? null,
        index: latest.stepIndex,
        total: latest.totalSteps,
      })}
    </div>
  );
}

const state = () =>
  JSON.parse(screen.getByTestId("probe").textContent ?? "{}") as {
    prompt: boolean;
    active: boolean;
    step: string | null;
    index: number;
    total: number;
  };
const overlay = () => screen.getByTestId("overlay");
const persisted = () =>
  JSON.parse(localStorage.getItem("bloom:tour:v1") ?? "null") as {
    completed: Record<string, boolean>;
    dismissedGlobal?: boolean;
  } | null;
/** The fade in tour.css is 260ms; the context matches it. */
const finishLeaving = () => act(() => void vi.advanceTimersByTime(300));
const controls = () => {
  if (!latest) throw new Error("probe never rendered");
  return latest;
};

async function mount() {
  render(
    <TourProvider>
      <Probe />
    </TourProvider>,
  );
  /* Storage is read async, and the prompt is gated on it. */
  await act(async () => {});
}

describe("TourContext", () => {
  beforeEach(() => {
    latest = null;
    localStorage.clear();
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("offers a tour only once it knows you", async () => {
    render(
      <TourProvider>
        <Probe />
      </TourProvider>,
    );
    expect(state().prompt).toBe(false); // storage unread: stay quiet
    await act(async () => {});
    expect(state().prompt).toBe(true);
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("opens on the first step of the tour you asked for", async () => {
    await mount();
    act(() => controls().startTour("mood"));
    expect(overlay().textContent).toBe("m-compose");
    expect(state()).toMatchObject({ prompt: false, active: true, index: 0, total: 4 });
  });

  it("steps forward and back, and tells the card which way it went", async () => {
    await mount();
    act(() => controls().startTour("mood"));

    act(() => controls().next());
    expect(overlay().textContent).toBe("m-timeline");
    expect(overlay().dataset["direction"]).toBe("1");

    act(() => controls().prev());
    expect(overlay().textContent).toBe("m-compose");
    expect(overlay().dataset["direction"]).toBe("-1");

    act(() => controls().prev()); // already at the top: hold still
    expect(state().index).toBe(0);
  });

  it("finishes with a word, a memory, and a fade instead of a pop", async () => {
    await mount();
    act(() => controls().startTour("mood"));
    for (let i = 0; i < 3; i += 1) act(() => controls().next());
    expect(state().index).toBe(3);

    act(() => controls().next()); // past the last step: that's the end
    expect(vi.mocked(toast)).toHaveBeenCalledOnce();
    expect(persisted()?.completed["mood"]).toBe(true);
    /* Still on screen, but leaving — the fade has started. */
    expect(overlay().dataset["leaving"]).toBe("true");
    expect(state().active).toBe(true);

    finishLeaving();
    expect(screen.queryByTestId("overlay")).toBeNull();
    expect(state().active).toBe(false);
  });

  it("never puts the prompt back once you've taken a tour", async () => {
    await mount();
    act(() => controls().startTour("mood"));
    act(() => controls().close());
    expect(overlay().dataset["leaving"]).toBe("true");

    finishLeaving();
    /* Dismissing a page tour is not a request to be asked again. */
    expect(state().prompt).toBe(false);
    expect(persisted()).toBeNull(); // and it wrote nothing to disk
  });

  it("records a skipped intro tour as dismissed", async () => {
    await mount();
    act(() => controls().startTour("global"));
    expect(overlay().textContent).toBe("g-nav-today");

    act(() => controls().skip());
    expect(persisted()?.dismissedGlobal).toBe(true);
    expect(overlay().dataset["leaving"]).toBe("true");

    finishLeaving();
    expect(state().prompt).toBe(false);
  });

  it("stays quiet for someone who already finished the intro", async () => {
    localStorage.setItem("bloom:tour:v1", JSON.stringify({ completed: { global: true } }));
    await mount();
    expect(state().prompt).toBe(false);

    document.body.insertAdjacentHTML("beforeend", '<div data-tour="nav-today"></div>');
    act(() => void vi.advanceTimersByTime(1_500));
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("starts the intro by itself for a newcomer with the nav on screen", async () => {
    await mount();
    expect(screen.queryByTestId("overlay")).toBeNull();

    document.body.insertAdjacentHTML("beforeend", '<div data-tour="nav-today"></div>');
    act(() => void vi.advanceTimersByTime(1_500));
    expect(overlay().textContent).toBe("g-nav-today");
    /* The prompt goes away while the tour is up, and doesn't come back. */
    expect(state().prompt).toBe(false);
    act(() => controls().close());
    finishLeaving();
    expect(state().prompt).toBe(false);
  });
});
