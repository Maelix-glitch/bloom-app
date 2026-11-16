// @vitest-environment jsdom
/**
 * The Coach orb — a door to the same Coach, pinned end to end:
 *
 *   · it renders on the app tabs and is gone on /coach;
 *   · its popup opens and closes by button, backdrop and Escape, with
 *     focus moved in on open and returned to the orb on close;
 *   · the popup and the shared store are ONE conversation — a seeded
 *     thread shows in both, and a message sent from the popup lands in
 *     the store (the surface the Coach tab reads) through the real
 *     pipeline, with the edge responder faked at the engine seam;
 *   · voice is offered only when the platform has it: no
 *     speechSynthesis → no Listen button; with it, Listen speaks the
 *     reply's own words and Stop cancels;
 *   · dictation is offered only when a recognition constructor exists,
 *     and reduced motion is mirrored onto the orb for the stylesheet.
 */
import { createElement, forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

/* The store runs as a signed-in profile (device-first, as in the app):
   watchAuth answers immediately, and the account tables resolve empty.
   The chainable stub covers the selects, inserts and updates the hook
   and the pipeline make; nothing here leaves the test. */
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

vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({
    entries: [],
    analytics: { periodEntries: [], avg: null, avgEnergy: null, avgStress: null },
    range: { label: "30 days" },
  }),
}));

/* The edge responder, faked at the engine seam: the real store and the
   real send pipeline run; only the network answer is canned. */
const hoisted = vi.hoisted(() => ({ ask: vi.fn() }));
vi.mock("@/lib/coach/engine", () => ({
  ask: hoisted.ask,
  answerLocally: () => ({ paragraphs: ["From my own knowledge."], sources: [], blocks: [] }),
  CoachUnavailable: class CoachUnavailable extends Error {},
}));

import { CoachOrbGate } from "./CoachOrb";
import { CoachSystemProvider, useCoachSystemContext } from "./CoachSystemProvider";

/* A stand-in for every other store consumer (the Coach tab, the Today
   panel): whatever it shows is what those surfaces show, because all of
   them read this one context. */
function StoreProbe() {
  const coach = useCoachSystemContext();
  return (
    <output data-testid="coach-store-probe">
      {(coach?.messages ?? []).map((m) => `${m.role}:${m.paragraphs.join(" ")}`).join(" | ")}
    </output>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <CoachSystemProvider>
      <StoreProbe />
      <CoachOrbGate />
      <Outlet />
    </CoachSystemProvider>
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

const STORE_KEY = "bloom.coach.conversations.v1.profile-test";

function seedConversation() {
  window.localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      v: 1,
      activeId: "conv-seed",
      conversations: [
        {
          id: "conv-seed",
          title: "How did I sleep?",
          mode: "ask",
          createdAt: "2026-11-16T05:00:00.000Z",
          updatedAt: "2026-11-16T05:01:00.000Z",
          messages: [
            {
              id: "seed-user",
              role: "user",
              time: "2026-11-16T05:00:00.000Z",
              paragraphs: ["How did I sleep?"],
              sources: [],
              blocks: [],
              status: "sent",
            },
            {
              id: "seed-coach",
              role: "coach",
              time: "2026-11-16T05:01:00.000Z",
              paragraphs: ["Seeded reply from Bloom."],
              sources: [],
              blocks: [],
              status: "sent",
            },
          ],
        },
      ],
    }),
  );
}

class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function installSpeechSynthesis() {
  const speak = vi.fn();
  const cancel = vi.fn();
  Object.defineProperty(window, "speechSynthesis", {
    value: { speak, cancel },
    configurable: true,
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: FakeUtterance,
    configurable: true,
  });
  return { speak, cancel };
}

let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  hoisted.ask.mockReset();
  hoisted.ask.mockResolvedValue({
    paragraphs: ["Canned reply from Bloom."],
    sources: [],
    blocks: [],
    source: "edge",
  });
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
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

const orbButton = () => screen.getByRole("button", { name: "Ask Bloom" });

async function openPopup() {
  fireEvent.click(orbButton());
  const dialog = await screen.findByRole("dialog");
  return dialog;
}

describe("CoachOrb — placement", () => {
  it("renders the orb on a main tab", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    expect(orbButton()).toBeTruthy();
  });

  it("renders the orb on Trackers too", async () => {
    renderApp("/trackers");
    await screen.findByText("Trackers page");
    expect(orbButton()).toBeTruthy();
  });

  it("is hidden on /coach, where the conversation already fills the screen", async () => {
    renderApp("/coach");
    await screen.findByText("Coach page");
    expect(screen.queryByRole("button", { name: "Ask Bloom" })).toBeNull();
  });

  it("mirrors reduced motion onto the orb so the stylesheet can stand the breath down", async () => {
    reducedMotion = true;
    renderApp("/");
    await screen.findByText("Today page");
    expect(orbButton().getAttribute("data-reduced-motion")).toBe("true");
  });

  it("carries no reduced-motion marker when motion is welcome", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    expect(orbButton().getAttribute("data-reduced-motion")).toBeNull();
  });
});

describe("CoachOrb — the popup", () => {
  it("opens on tap, takes focus, and closes by its close button, returning focus to the orb", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    const textarea = screen.getByLabelText("Message Bloom");
    expect(document.activeElement).toBe(textarea);

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(orbButton());
  });

  it("closes on Escape", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes when the backdrop is tapped", async () => {
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    const backdrop = document.querySelector(".coach-orb-backdrop");
    if (!backdrop) throw new Error("backdrop missing");
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("CoachOrb — one conversation, shared with the Coach tab", () => {
  it("shows the stored thread in the popup and in the store alike", async () => {
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    /* The store (what the Coach tab reads) already holds the thread… */
    await waitFor(() =>
      expect(screen.getByTestId("coach-store-probe").textContent).toContain(
        "Seeded reply from Bloom.",
      ),
    );
    /* …and the popup shows the very same thread. */
    await openPopup();
    expect(await screen.findByText("Seeded reply from Bloom.")).toBeTruthy();
    expect(screen.getByText("How did I sleep?")).toBeTruthy();
  });

  it("sends through the shared pipeline: the reply lands in the store and the popup", async () => {
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();

    const textarea = screen.getByLabelText("Message Bloom") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "A question from the orb" } });
    const form = document.querySelector(".coach-orb-composer");
    if (!form) throw new Error("orb composer missing");
    fireEvent.submit(form);

    /* The composer's copy clears the moment the send is accepted… */
    await waitFor(() => expect(textarea.value).toBe(""));
    /* …the question and the answer join the one shared store… */
    await waitFor(() => {
      const probe = screen.getByTestId("coach-store-probe").textContent ?? "";
      expect(probe).toContain("user:A question from the orb");
      expect(probe).toContain("coach:Canned reply from Bloom.");
    });
    /* …and the popup thread shows the same exchange. */
    expect(await screen.findByText("Canned reply from Bloom.")).toBeTruthy();
    expect(hoisted.ask).toHaveBeenCalledTimes(1);
  });
});

describe("CoachOrb — voice", () => {
  it("offers no Listen button when the platform has no speech synthesis", async () => {
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    expect(await screen.findByText("Seeded reply from Bloom.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Listen to this reply" })).toBeNull();
  });

  it("speaks the reply's own words on Listen, and Stop cancels", async () => {
    const { speak, cancel } = installSpeechSynthesis();
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();

    fireEvent.click(await screen.findByRole("button", { name: "Listen to this reply" }));
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toContain("Seeded reply from Bloom.");

    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Listen to this reply" })).toBeTruthy();
  });

  it("closing the popup stops the playback", async () => {
    const { cancel } = installSpeechSynthesis();
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    fireEvent.click(await screen.findByRole("button", { name: "Listen to this reply" }));
    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(cancel).toHaveBeenCalled();
  });

  it("offers dictation only when a recognition constructor exists — and never auto-sends", async () => {
    seedConversation();
    renderApp("/");
    await screen.findByText("Today page");
    await openPopup();
    expect(screen.queryByRole("button", { name: "Dictate your message" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult = null;
      onend = null;
      onerror = null;
      start() {}
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: FakeRecognition,
      configurable: true,
    });
    await openPopup();
    expect(screen.getByRole("button", { name: "Dictate your message" })).toBeTruthy();
    /* Nothing was sent by merely offering the microphone. */
    expect(hoisted.ask).not.toHaveBeenCalled();
  });
});
