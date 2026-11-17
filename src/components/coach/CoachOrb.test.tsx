// @vitest-environment jsdom
/**
 * The Vitalis window (the orb), pinned end to end:
 *
 *   · it renders on the app tabs and is gone on /coach;
 *   · its popup opens and closes by button, backdrop and Escape, with
 *     focus moved in on open and returned to the orb on close;
 *   · SESSION ISOLATION: a Coach thread seeded under the Coach store's
 *     own keys never appears in the window, is never sent as history,
 *     and is byte-identical after a Vitalis conversation — and the
 *     component source names none of the Coach thread machinery;
 *   · the conversation is fresh per open: close and reopen and the
 *     previous exchange is gone, and the next send's history is empty;
 *   · replies arrive through `askVitalis` (mode "vitalis") with a
 *     Nutrition + Assessment context, render as Vitalis, and are
 *     SPOKEN automatically — there is no Listen button anywhere, only
 *     the header's mute toggle;
 *   · reduced motion is mirrored onto the orb for the stylesheet.
 */
import { readFileSync } from "node:fs";
import { createElement, forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

/* motion/react stubbed as in CoachPage.test.tsx — jsdom runs no frames. */
vi.mock("motion/react", () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        forwardRef(function MotionStub(props: Record<string, unknown>, ref) {
          const {
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            variants: _variants,
            whileHover: _whileHover,
            whileTap: _whileTap,
            ...rest
          } = props;
          return createElement(tag, { ...rest, ref });
        }),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: unknown }) => children,
    useReducedMotion: () => true,
  };
});

/* The account layer, stubbed as elsewhere in the suite: watchAuth
   answers immediately and the account tables resolve empty, so the
   data hooks (Assessment, Nutrition, Plan) run on empty stores. */
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    select: self,
    eq: self,
    in: self,
    order: self,
    limit: self,
    update: self,
    delete: self,
    insert: async () => ({ error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  });
  return {
    hasSupabaseConfig: true,
    supabaseConfigProblem: () => null,
    supabase: { from: () => chain },
    watchAuth: (cb: (uid: string | null) => void) => {
      cb("profile-test");
      return () => {};
    },
  };
});

/* The Vitalis seams, faked: the edge call and the speaker. Everything
   else — context assembly, the window, the session — runs for real. */
const hoisted = vi.hoisted(() => ({
  askVitalis: vi.fn(),
  speak: vi.fn(),
  setMuted: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@/lib/vitalis-ai/client", () => ({
  askVitalis: hoisted.askVitalis,
  VitalisUnavailable: class VitalisUnavailable extends Error {},
}));
vi.mock("@/lib/vitalis-ai/voice", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/vitalis-ai/voice")>("@/lib/vitalis-ai/voice");
  class FakeVitalisSpeaker {
    speak(text: string) {
      hoisted.speak(text);
    }
    setMuted(muted: boolean) {
      hoisted.setMuted(muted);
    }
    stop() {
      hoisted.stop();
    }
  }
  return { ...actual, VitalisSpeaker: FakeVitalisSpeaker };
});

import { CoachOrbGate } from "./CoachOrb";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <CoachOrbGate />
      <Outlet />
    </>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <div>Today page</div>,
});
const trackersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trackers",
  component: () => <div>Trackers page</div>,
});
const coachRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/coach",
  component: () => <div>Coach page</div>,
});

function renderApp(path = "/") {
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, trackersRoute, coachRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

/* The Coach thread's own storage keys (useCoachSystem) — seeded with
   marker text Vitalis must never show, send, or disturb. */
const COACH_STORE_KEY = "bloom.coach.conversations.v1.profile-test";
const COACH_LEGACY_KEY = "bloom.coach.thread.profile-test";
const COACH_MARKER = "Coach thread marker — never Vitalis's";

function seedCoachThread() {
  const value = JSON.stringify({
    v: 1,
    activeId: "conv-seed",
    conversations: [
      {
        id: "conv-seed",
        title: COACH_MARKER,
        mode: "ask",
        createdAt: "2026-11-16T05:00:00.000Z",
        updatedAt: "2026-11-16T05:01:00.000Z",
        messages: [
          {
            id: "seed-user",
            role: "user",
            time: "2026-11-16T05:00:00.000Z",
            paragraphs: [COACH_MARKER],
            sources: [],
            blocks: [],
            status: "sent",
          },
        ],
      },
    ],
  });
  window.localStorage.setItem(COACH_STORE_KEY, value);
  window.localStorage.setItem(COACH_LEGACY_KEY, value);
  return value;
}

let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  hoisted.askVitalis.mockReset();
  hoisted.askVitalis.mockResolvedValue({
    paragraphs: ["Canned Vitalis reply."],
    source: "edge",
  });
  hoisted.speak.mockReset();
  hoisted.setMuted.mockReset();
  hoisted.stop.mockReset();
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  URL.createObjectURL = vi.fn(() => "blob:unused");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
});

const orbButton = () => screen.getByRole("button", { name: "Ask Vitalis" });

async function openPopup() {
  fireEvent.click(orbButton());
  return screen.findByRole("dialog", { name: "Vitalis" });
}

async function sendMessage(text: string) {
  const textarea = screen.getByLabelText("Message Vitalis") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: text } });
  const form = document.querySelector(".coach-orb-composer");
  if (!form) throw new Error("orb composer missing");
  fireEvent.submit(form);
}

describe("Vitalis orb — placement", () => {
  it("renders the orb on a main tab and on Trackers", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    expect(orbButton()).toBeTruthy();
    cleanup();
    renderApp("/trackers");
    await screen.findByText("Trackers page");
    expect(orbButton()).toBeTruthy();
  });

  it("is hidden on /coach", async () => {
    renderApp("/coach");
    await screen.findByText("Coach page");
    expect(screen.queryByRole("button", { name: "Ask Vitalis" })).toBeNull();
  });

  it("mirrors reduced motion onto the orb", async () => {
    reducedMotion = true;
    renderApp("/");
    await screen.findByText("Today page");
    expect(orbButton().getAttribute("data-reduced-motion")).toBe("true");
  });
});

describe("Vitalis window — the popup", () => {
  it("opens on tap, takes focus, and closes by its close button, returning focus to the orb", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    const textarea = screen.getByLabelText("Message Vitalis");
    expect(document.activeElement).toBe(textarea);

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(orbButton());
  });

  it("closes on Escape and on a backdrop tap", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openPopup();
    const backdrop = document.querySelector(".coach-orb-backdrop");
    if (!backdrop) throw new Error("backdrop missing");
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("greets as Vitalis, states its scope, and offers the mute toggle — never a Listen button", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    expect(screen.getByText("Vitalis", { selector: ".coach-orb-title" })).toBeTruthy();
    expect(screen.getByText(/Nutrition & assessment · fresh each time/)).toBeTruthy();
    expect(screen.getByText(/I look after the food side of Bloom/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mute Vitalis's voice" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /listen/i })).toBeNull();
  });
});

describe("Vitalis window — session isolation from the Coach thread", () => {
  it("never shows the seeded Coach thread, and leaves its storage byte-identical", async () => {
    const seeded = seedCoachThread();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    /* The welcome stands where a shared thread would have rendered. */
    expect(screen.getByText(/I look after the food side of Bloom/)).toBeTruthy();
    expect(screen.queryByText(COACH_MARKER)).toBeNull();

    await sendMessage("How is my protein today?");
    expect(await screen.findByText("Canned Vitalis reply.")).toBeTruthy();
    expect(screen.queryByText(COACH_MARKER)).toBeNull();
    /* The history Vitalis sent was its own (empty at first send)… */
    const firstCall = hoisted.askVitalis.mock.calls[0]?.[0] as { history: unknown[] };
    expect(firstCall.history).toEqual([]);
    /* …and the Coach store was never written. */
    expect(window.localStorage.getItem(COACH_STORE_KEY)).toBe(seeded);
    expect(window.localStorage.getItem(COACH_LEGACY_KEY)).toBe(seeded);
  });

  it("starts fresh on every open: close, reopen, and the exchange is gone", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("First session question");
    expect(await screen.findByText("Canned Vitalis reply.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openPopup();
    expect(screen.getByText(/I look after the food side of Bloom/)).toBeTruthy();
    expect(screen.queryByText("First session question")).toBeNull();
    expect(screen.queryByText("Canned Vitalis reply.")).toBeNull();

    /* And the next send carries no history from the closed session. */
    await sendMessage("Second session question");
    await waitFor(() => expect(hoisted.askVitalis).toHaveBeenCalledTimes(2));
    const secondCall = hoisted.askVitalis.mock.calls[1]?.[0] as { history: unknown[] };
    expect(secondCall.history).toEqual([]);
  });

  it("pins the source: the window names none of the Coach thread machinery", () => {
    const source = readFileSync("src/components/coach/CoachOrb.tsx", "utf8");
    for (const banned of [
      "bloom.coach.conversations",
      "bloom.coach.thread",
      "bloom.coach.memories",
      "useCoachSystem",
      "CoachSystemProvider",
      "useCoachChat",
    ]) {
      expect(source.includes(banned), `CoachOrb.tsx must not reference ${banned}`).toBe(false);
    }
    expect(source).toContain("buildVitalisContext");
    expect(source).toContain("askVitalis");
  });
});

describe("Vitalis window — sending and auto-voice", () => {
  it("sends with a Nutrition + Assessment context and speaks the reply automatically", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("How is my protein today?");

    expect(await screen.findByText("How is my protein today?")).toBeTruthy();
    expect(await screen.findByText("Canned Vitalis reply.")).toBeTruthy();

    expect(hoisted.askVitalis).toHaveBeenCalledTimes(1);
    const call = hoisted.askVitalis.mock.calls[0]?.[0] as {
      text: string;
      contextText: string;
    };
    expect(call.text).toBe("How is my protein today?");
    expect(call.contextText).toContain("THE PERSON — FROM THEIR ASSESSMENT");
    expect(call.contextText).toContain("TARGETS");

    /* Spoken without being asked — and there is still no Listen button. */
    expect(hoisted.speak).toHaveBeenCalledTimes(1);
    expect(hoisted.speak).toHaveBeenCalledWith("Canned Vitalis reply.");
    expect(screen.queryByRole("button", { name: /listen/i })).toBeNull();
  });

  it("the mute toggle silences the speaker for the session", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    const toggle = screen.getByRole("button", { name: "Mute Vitalis's voice" });
    fireEvent.click(toggle);
    expect(hoisted.setMuted).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Unmute Vitalis's voice" })).toBeTruthy();
  });

  it("a failed send keeps the words and offers a retry that succeeds", async () => {
    hoisted.askVitalis.mockRejectedValueOnce(new Error("offline"));
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Retry me");
    expect(await screen.findByText(/couldn’t connect right now/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Canned Vitalis reply.")).toBeTruthy();
    /* The question was not duplicated by the retry. */
    expect(screen.getAllByText("Retry me")).toHaveLength(1);
  });

  it("offers dictation only when a recognition constructor exists", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    expect(screen.queryByRole("button", { name: "Dictate your message" })).toBeNull();
  });
});

/* ------------------------- phases 3–5 ------------------------- */

import { resetPrefCache } from "@/lib/prefsStore";

describe("CoachOrb — deliberation, actions and the lock", () => {
  function seedPref(key: string, value: unknown) {
    const raw = window.localStorage.getItem("bloom.prefs.v1");
    const doc = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    doc[key] = { value, updatedAt: "2026-11-17T00:00:00.000Z" };
    window.localStorage.setItem("bloom.prefs.v1", JSON.stringify(doc));
    /* prefsStore caches per key at module level and survives across
       tests in this file — a raw storage write must drop the cache
       or the hooks keep serving the earlier (empty) value. */
    resetPrefCache();
  }

  function readPref(key: string): unknown {
    const raw = window.localStorage.getItem("bloom.prefs.v1");
    if (!raw) return undefined;
    return (JSON.parse(raw) as Record<string, { value: unknown }>)[key]?.value;
  }

  function foodLogEntries(): unknown[] {
    const value = readPref("health.foodlog.v1") as { entries?: unknown[] } | undefined;
    return value?.entries ?? [];
  }

  function seedCustomFood() {
    seedPref("health.foods.v1", {
      version: 1,
      foods: [
        {
          id: "food-shake",
          name: "My Protein Shake",
          per100g: {
            kcal: 120,
            proteinG: 20,
            carbsG: 5,
            fatG: 2,
            fiberG: 1,
            sugarG: 3,
            sodiumMg: 90,
          },
          servings: [],
          provenance: { kind: "user_entered", sourceId: "user", label: "Entered by you" },
        },
      ],
    });
  }

  it("shows the deliberation stages as the server reports them, in order", async () => {
    let resolveReply: (value: unknown) => void = () => {};
    hoisted.askVitalis.mockImplementation(
      (params: { onStage?: (stage: { stage: string; label: string }) => void }) => {
        params.onStage?.({ stage: "drafting", label: "Drafting your answer" });
        params.onStage?.({
          stage: "verifying",
          label: "Checking every number against your record",
        });
        params.onStage?.({ stage: "rules", label: "Checking allergies, pattern and safety" });
        return new Promise((resolve) => {
          resolveReply = resolve;
        });
      },
    );
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Build me a plan for today");
    const panel = await screen.findByLabelText("Vitalis is working");
    const items = [...panel.querySelectorAll(".coach-orb-stage")].map((li) => li.textContent);
    expect(items).toEqual([
      "Drafting your answer",
      "Checking every number against your record",
      "Checking allergies, pattern and safety",
    ]);
    await act(async () => {
      resolveReply({ paragraphs: ["Your plan checks out."] });
    });
    expect(await screen.findByText("Your plan checks out.")).toBeTruthy();
    expect(screen.queryByLabelText("Vitalis is working")).toBeNull();
  }, 20_000);

  it("logs a dish only after the confirm tap — never on arrival", async () => {
    hoisted.askVitalis.mockImplementation(
      (params: { record?: { dishes: { id: string }[] } }) => {
        const dish = params.record?.dishes[0];
        return Promise.resolve({
          paragraphs: ["Shall I log it for dinner?"],
          actions: dish ? [{ action: "log_dish", dishId: dish.id, meal: "dinner" }] : [],
        });
      },
    );
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("What should I have for dinner?");
    expect(await screen.findByText("Shall I log it for dinner?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log it" })).toBeTruthy();
    expect(foodLogEntries()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(foodLogEntries()).toHaveLength(1);
    expect(await screen.findByText(/is in today's food log/)).toBeTruthy();
  });

  it("logs a custom food only after the confirm tap", async () => {
    seedCustomFood();
    hoisted.askVitalis.mockResolvedValue({
      paragraphs: ["Your shake fits as a snack."],
      actions: [{ action: "log_food", foodId: "food-shake", grams: 250, meal: "snack" }],
    });
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Can I have my shake?");
    expect(await screen.findByText("Log My Protein Shake", undefined, { timeout: 5000 })).toBeTruthy();
    expect(foodLogEntries()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(foodLogEntries()).toHaveLength(1);
    expect(await screen.findByText(/My Protein Shake is in today's food log/, undefined, { timeout: 5000 })).toBeTruthy();
  }, 20_000);

  it("dismissing a card writes nothing", async () => {
    hoisted.askVitalis.mockImplementation(
      (params: { record?: { dishes: { id: string }[] } }) => {
        const dish = params.record?.dishes[0];
        return Promise.resolve({
          paragraphs: ["Shall I log it?"],
          actions: dish ? [{ action: "log_dish", dishId: dish.id, meal: "lunch" }] : [],
        });
      },
    );
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("What should I have for lunch?");
    expect(await screen.findByText("Shall I log it?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(await screen.findByText("Dismissed — nothing changed.")).toBeTruthy();
    expect(foodLogEntries()).toHaveLength(0);
  });

  it("never renders a forged non-allowlisted action as a card", async () => {
    hoisted.askVitalis.mockImplementation(
      (params: { record?: { dishes: { id: string }[] } }) => {
        const dish = params.record?.dishes[0];
        return Promise.resolve({
          paragraphs: ["Here you go."],
          actions: [
            { action: "create_habit", name: "Morning run" },
            { action: "award_points", points: 900 },
            ...(dish ? [{ action: "log_dish", dishId: dish.id, meal: "lunch" }] : []),
          ],
        });
      },
    );
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("What should I have for lunch?");
    expect(await screen.findByText("Here you go.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Log it" })).toHaveLength(1);
    expect(screen.queryByText(/Morning run/)).toBeNull();
    expect(foodLogEntries()).toHaveLength(0);
  });

  it("composes today's plan only after the confirm tap", async () => {
    seedPref("health.body.v1", {
      units: "metric",
      heightCm: 178,
      weightKg: 80,
      targetWeightKg: null,
      age: 30,
      sex: "male",
      activity: "moderate",
      goal: "maintain",
      rateKgPerWeek: 0,
      updatedAt: "2026-11-17T00:00:00.000Z",
    });
    hoisted.askVitalis.mockResolvedValue({
      paragraphs: ["I can compose today's plan."],
      actions: [{ action: "compose_plan" }],
    });
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Make me a plan for today");
    expect(await screen.findByText("Compose today's plan", undefined, { timeout: 5000 })).toBeTruthy();
    expect(readPref("health.plan.v1")).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Compose plan" }));
    expect(await screen.findByText(/today's plan is composed/, undefined, { timeout: 5000 })).toBeTruthy();
    expect(readPref("health.plan.v1")).toBeDefined();
  }, 20_000);

  it("swaps a plan dish only after the confirm tap", async () => {
    seedPref("health.body.v1", {
      units: "metric",
      heightCm: 178,
      weightKg: 80,
      targetWeightKg: null,
      age: 30,
      sex: "male",
      activity: "moderate",
      goal: "maintain",
      rateKgPerWeek: 0,
      updatedAt: "2026-11-17T00:00:00.000Z",
    });
    let phase = 0;
    hoisted.askVitalis.mockImplementation(
      (params: {
        record?: {
          dishes: { id: string }[];
          plan: { meals: { meal: string; dishIds: string[] }[] } | null;
        };
      }) => {
        phase += 1;
        if (phase === 1) {
          return Promise.resolve({
            paragraphs: ["I can compose today's plan."],
            actions: [{ action: "compose_plan" }],
          });
        }
        const meal = params.record?.plan?.meals.find((m) => m.dishIds.length > 0);
        const fromDishId = meal?.dishIds[0];
        const toDish = params.record?.dishes.find((d) => !meal?.dishIds.includes(d.id));
        return Promise.resolve({
          paragraphs: ["I can swap that dish."],
          actions:
            meal && fromDishId && toDish
              ? [{ action: "swap_dish", meal: meal.meal, fromDishId, toDishId: toDish.id }]
              : [],
        });
      },
    );
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Make me a plan for today");
    expect(await screen.findByText("Compose today's plan", undefined, { timeout: 5000 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Compose plan" }));
    expect(await screen.findByText(/today's plan is composed/, undefined, { timeout: 5000 })).toBeTruthy();
    const before = readPref("health.plan.v1") as { plan: { meals: { dishes: { dishId: string }[] }[] } };
    const beforeIds = before.plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId));
    expect(beforeIds.length).toBeGreaterThan(0);
    await sendMessage("I don't like one of those dishes");
    expect(await screen.findByText(/Swap .+ for .+/, undefined, { timeout: 5000 })).toBeTruthy();
    /* Nothing has moved yet — the card is a proposal, not a deed. */
    expect(readPref("health.plan.v1")).toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "Swap dish" }));
    expect(await screen.findByText(/Swapped —/, undefined, { timeout: 5000 })).toBeTruthy();
    const after = readPref("health.plan.v1") as { plan: { meals: { dishes: { dishId: string }[] }[] } };
    const afterIds = after.plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId));
    expect(afterIds).not.toEqual(beforeIds);
    expect(afterIds.length).toBe(beforeIds.length);
  }, 30_000);

  it("shows the locked notice and closes the composer when the server reports the lock", async () => {
    hoisted.askVitalis.mockResolvedValue({
      paragraphs: [
        "Vitalis is paused for now.",
        "Sign in again and Vitalis will be back. The rest of Bloom is unaffected.",
      ],
      locked: true,
    });
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    await sendMessage("Hello?");
    expect(await screen.findByText("Vitalis is paused for now.")).toBeTruthy();
    const textarea = document.querySelector<HTMLTextAreaElement>("#coach-orb-input");
    expect(textarea?.disabled).toBe(true);
    expect(textarea?.placeholder).toContain("Vitalis is paused");
  });
});
