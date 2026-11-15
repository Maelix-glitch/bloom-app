// @vitest-environment jsdom
/**
 * The Coach page's half of the submit contract.
 *
 * The Composer tests pin what the composer does WITH the accepted
 * signal; these pin that the page actually sends it at the right
 * moment — the instant the user message is appended to the thread in
 * requestAnswer, not when the reply lands. The coach hook is faked
 * (stateful messages, a controllable requestResponse) and the heavy
 * presentational siblings are stubbed, so what runs for real is the
 * page's request pipeline plus the real Composer:
 *   · while a reply is still in flight, the user message is already in
 *     the thread AND the composer is already clear;
 *   · when the reply then fails, the composer stays clear — the failed
 *     message sits in the thread with its Try again, and the notice
 *     points at it.
 */
import { createElement, forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/* motion/react stubbed as in Welcome.test.tsx — jsdom runs no frames. */
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

/* The presentational siblings are not under test; the thread stub just
   shows what the page's message state holds. */
vi.mock("./CoachSidebar", () => ({
  CoachSidebar: () => null,
  CoachSidebarContent: () => null,
}));
vi.mock("./CoachHeader", () => ({ CoachHeader: () => null }));
vi.mock("./CoachThread", () => ({
  CoachThread: ({
    messages,
  }: {
    messages: Array<{
      id: string;
      paragraphs: string[];
      attachment?: { name: string };
    }>;
  }) => (
    <div>
      {messages.map((m) => (
        <div key={m.id} data-testid="thread-message">
          {m.paragraphs.join(" ")}
          {m.attachment ? ` [${m.attachment.name}]` : ""}
        </div>
      ))}
    </div>
  ),
}));
vi.mock("./ContextPanel", () => ({ CoachContextPanel: () => null }));
vi.mock("./CoachSheet", () => ({ CoachSheet: () => null }));
vi.mock("./QuickPalette", () => ({ QuickPalette: () => null }));
vi.mock("./CoachCamera", () => ({ CoachCamera: () => null }));

vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({
    entries: [],
    analytics: { periodEntries: [], avg: null, avgEnergy: null, avgStress: null },
    range: { label: "30 days" },
  }),
}));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({}),
  isSignedIn: () => true,
}));

/* A stateful fake of the coach hook: messages live in `state`, and
   requestResponse is the test's to command. Everything else the page
   reads is inert. The module's pure helpers (readCoachRecord,
   coachErrorMessage) stay real via importActual. */
const hoisted = vi.hoisted(() => {
  type Msg = { id: string; paragraphs: string[]; attachment?: { name: string } };
  const state = { messages: [] as Msg[] };
  const requestResponse = vi.fn();
  const conversation = () => ({ id: "conv-1", mode: "ask", messages: state.messages });
  const coach = {
    profileId: "profile-1",
    loading: false,
    memories: [],
    habitData: { available: false, habits: [], logs: [] },
    storageError: null,
    get messages() {
      return state.messages;
    },
    get activeConversation() {
      return conversation();
    },
    get conversations() {
      return [conversation()];
    },
    setMessages: (updater: unknown) => {
      state.messages =
        typeof updater === "function"
          ? (updater as (current: Msg[]) => Msg[])(state.messages)
          : (updater as Msg[]);
    },
    requestResponse,
    setConversationMode: vi.fn(),
    openConversation: vi.fn(),
    removeConversation: vi.fn(),
    renameConversation: vi.fn(),
    rememberMemory: vi.fn(async () => {}),
    forgetMemoryText: vi.fn(async () => {}),
    updateMemory: vi.fn(async () => {}),
    forgetMemory: vi.fn(async () => {}),
    saveMessage: vi.fn(async () => true),
  };
  return { state, coach, requestResponse };
});

vi.mock("@/hooks/useCoachSystem", async () => {
  const actual =
    await vi.importActual<typeof import("@/hooks/useCoachSystem")>("@/hooks/useCoachSystem");
  return { ...actual, useCoachSystem: () => hoisted.coach };
});

import { CoachPage } from "./CoachPage";

afterEach(cleanup);

beforeEach(() => {
  hoisted.state.messages = [];
  hoisted.requestResponse.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
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

const textbox = () => screen.getByLabelText("Message Bloom") as HTMLTextAreaElement;

function send(text: string, container: HTMLElement) {
  fireEvent.change(textbox(), { target: { value: text } });
  const form = container.querySelector("form");
  if (!form) throw new Error("composer form missing");
  fireEvent.submit(form);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("CoachPage — the accepted signal fires at append, not at reply", () => {
  it("puts the message in the thread and clears the composer while the reply is in flight", async () => {
    const flight = deferred<unknown>();
    hoisted.requestResponse.mockImplementation(() => flight.promise);
    const { container } = render(<CoachPage />);

    send("Hello Bloom", container);

    /* The reply has not landed, yet both halves of the promise hold:
       the words are in the thread, and the composer has let go. */
    await waitFor(() =>
      expect(screen.getByTestId("thread-message").textContent).toContain("Hello Bloom"),
    );
    expect(textbox().value).toBe("");

    flight.resolve({ paragraphs: ["A reply."], sources: [], blocks: [], source: "online" });
    await waitFor(() => expect(screen.getAllByTestId("thread-message")).toHaveLength(2));
    expect(screen.getAllByTestId("thread-message")[1]?.textContent).toContain("A reply.");
    expect(textbox().value).toBe("");
  });

  it("keeps the composer clear when an accepted send fails, with the error in the thread", async () => {
    const flight = deferred<unknown>();
    hoisted.requestResponse.mockImplementation(() => flight.promise);
    const { container } = render(<CoachPage />);

    send("Will this fail?", container);
    await waitFor(() =>
      expect(screen.getByTestId("thread-message").textContent).toContain("Will this fail?"),
    );
    expect(textbox().value).toBe("");

    flight.reject(new Error("network down"));
    /* The error message joins the thread (carrying the Try again), the
       composer's notice points at it, and the composer stays clear. */
    await waitFor(() => expect(screen.getAllByTestId("thread-message")).toHaveLength(2));
    await waitFor(() =>
      expect(
        screen.getByText("That reply didn't make it — tap Try again on your message above."),
      ).toBeTruthy(),
    );
    expect(textbox().value).toBe("");
  });
});
