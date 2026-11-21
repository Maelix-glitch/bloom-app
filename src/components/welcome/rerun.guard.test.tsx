// @vitest-environment jsdom
/**
 * Welcome re-run guards (M-182, 2026-11-21).
 *
 * The owner asked for the new (glass) Welcome to run once more for
 * people who finished an older one — they never saw it, because the
 * gate only ever asked "done?". The pins below hold the shape of that:
 *
 *   (a) the version gate — a record stamped behind `WELCOME_VERSION`
 *       is owed a re-run; a current one is not; a first run and the
 *       admin door are never "re-runs";
 *   (b) "Not now" — stamps the version as seen and writes NOTHING else:
 *       the stored answers and the time they were given stand verbatim;
 *   (c) the manual replay — Profile's "See the welcome again" row
 *       exists and asks over the bus, and the gate is wired to answer;
 *   (d) the re-run's dress — answers pre-filled from the record, a
 *       click-through that changes nothing (including a capability
 *       Settings changed after the answer was given), and no exit on
 *       a first run (Welcome.test.tsx, unmodified, pins the rest).
 */

import { createElement, forwardRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";

afterEach(cleanup);

/* motion/react is mocked out, exactly as in Welcome.test.tsx: jsdom
   never runs the exit frames AnimatePresence waits on. */
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

import { Welcome } from "./Welcome";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getPref, PREFS_KEY } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import {
  DEFAULT_ONBOARDING,
  ONBOARDING_PREF,
  WELCOME_VERSION,
  parseOnboarding,
  welcomeInitialName,
  welcomeRerunDue,
  type OnboardingState,
} from "@/lib/onboarding/profileKind";
import { onWelcomeReplayRequest, requestWelcomeReplay } from "@/lib/welcome/replayRequest";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
  ...DEFAULT_ONBOARDING,
  ...over,
});

/* --------------------------- (a) the version gate --------------------------- */

describe("welcome re-run: the version gate", () => {
  it("the shipped Welcome is version 1 — the glass one (M-170)", () => {
    expect(WELCOME_VERSION).toBe(1);
  });

  it("a legacy record — finished, no version field — parses as 0 and is owed a re-run", () => {
    const parsed = parseOnboarding({ done: true, kind: "cycle", sex: "female", focus: [], name: null });
    expect(parsed?.welcomeVersion).toBe(0);
    expect(parsed && welcomeRerunDue(parsed)).toBe(true);
  });

  it("a record stamped with the current version is not owed one", () => {
    expect(welcomeRerunDue(state({ done: true, welcomeVersion: WELCOME_VERSION }))).toBe(false);
  });

  it("a record stamped behind is owed one; ahead is not", () => {
    expect(welcomeRerunDue(state({ done: true, welcomeVersion: WELCOME_VERSION - 1 }))).toBe(true);
    expect(welcomeRerunDue(state({ done: true, welcomeVersion: WELCOME_VERSION + 1 }))).toBe(false);
  });

  it("a first run is never a re-run, and neither is the admin door", () => {
    expect(welcomeRerunDue(state({ done: false, welcomeVersion: 0 }))).toBe(false);
    expect(welcomeRerunDue(state({ done: true, admin: true, welcomeVersion: 0 }))).toBe(false);
  });

  it("a junk version on disk falls back to 0 rather than throwing or trusting it", () => {
    expect(parseOnboarding({ welcomeVersion: "1" })?.welcomeVersion).toBe(0);
    expect(parseOnboarding({ welcomeVersion: -4 })?.welcomeVersion).toBe(0);
    expect(parseOnboarding({ welcomeVersion: 1.9 })?.welcomeVersion).toBe(1);
  });
});

/* --------------------- (b) the hook: seen, and finish --------------------- */

const LEGACY: OnboardingState = {
  done: true,
  kind: "no-cycle",
  sex: "female",
  focus: ["sleep"],
  name: "Ada",
  at: "2026-09-08T00:00:00.000Z",
  admin: false,
  welcomeVersion: 0,
};

function seedPrefs(value: unknown) {
  window.localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ [ONBOARDING_PREF]: { value, updatedAt: new Date().toISOString() } }),
  );
  resetPrefCache();
}

const storedRecord = () => getPref(ONBOARDING_PREF, parseOnboarding, DEFAULT_ONBOARDING);

describe("welcome re-run: the hook", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPrefCache();
  });

  it("a finished legacy user is owed the re-run, and is not asked the first-run question", () => {
    seedPrefs(LEGACY);
    const view = renderHook(() => useOnboarding());
    expect(view.result.current.needsWelcome).toBe(false);
    expect(view.result.current.needsWelcomeRerun).toBe(true);
  });

  it("'Not now' stamps the version and writes nothing else — answers and their time stand", () => {
    seedPrefs(LEGACY);
    const view = renderHook(() => useOnboarding());
    act(() => view.result.current.markWelcomeSeen());
    const after = storedRecord();
    expect(after.welcomeVersion).toBe(WELCOME_VERSION);
    /* Everything else is the record the person already had, verbatim. */
    expect(after.done).toBe(LEGACY.done);
    expect(after.kind).toBe(LEGACY.kind);
    expect(after.sex).toBe(LEGACY.sex);
    expect(after.focus).toEqual(LEGACY.focus);
    expect(after.name).toBe(LEGACY.name);
    expect(after.at).toBe(LEGACY.at);
    expect(after.admin).toBe(LEGACY.admin);
    expect(view.result.current.needsWelcomeRerun).toBe(false);
  });

  it("completing the re-run stamps the current version", () => {
    seedPrefs(LEGACY);
    const view = renderHook(() => useOnboarding());
    act(() =>
      view.result.current.finish({ kind: "no-cycle", sex: "female", focus: ["sleep"], name: "Ada" }),
    );
    expect(storedRecord().welcomeVersion).toBe(WELCOME_VERSION);
    expect(view.result.current.needsWelcomeRerun).toBe(false);
  });

  it("a brand-new user gets the first run, never the re-run", () => {
    const view = renderHook(() => useOnboarding());
    expect(view.result.current.needsWelcome).toBe(true);
    expect(view.result.current.needsWelcomeRerun).toBe(false);
  });
});

/* --------------------- (d) the re-run's dress: the flow -------------------- */

function tap(text: RegExp) {
  const el = screen
    .getAllByRole("button")
    .find((b) => text.test((b.textContent ?? "").replace(/\s+/g, " ")));
  if (!el) {
    throw new Error(
      `no button matching ${text} — found: ${screen
        .getAllByRole("button")
        .map((b) => `"${(b.textContent ?? "").replace(/\s+/g, " ").slice(0, 28)}"`)
        .join(", ")}`,
    );
  }
  fireEvent.click(el);
  return el;
}

function hasButton(text: RegExp) {
  return screen
    .getAllByRole("button")
    .some((b) => text.test((b.textContent ?? "").replace(/\s+/g, " ")));
}

function setupRerun(initial: NonNullable<React.ComponentProps<typeof Welcome>["initial"]>) {
  const onFinish = vi.fn();
  const onExit = vi.fn();
  render(<Welcome onFinish={onFinish} onAdmin={() => {}} initial={initial} onExit={onExit} />);
  return { onFinish, onExit };
}

describe("welcome re-run: the flow, pre-filled", () => {
  it("a first run has no exit — the door belongs to re-runs only", () => {
    render(<Welcome onFinish={() => {}} onAdmin={() => {}} />);
    expect(hasButton(/not now/i)).toBe(false);
  });

  it("the re-run offers 'Not now' on every screen, and it finishes nothing", () => {
    const { onFinish, onExit } = setupRerun({
      sex: "female",
      kind: "cycle",
      focus: [],
      name: null,
    });
    expect(hasButton(/not now/i)).toBe(true);
    tap(/get started/i);
    expect(hasButton(/not now/i)).toBe(true);
    tap(/not now/i);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("opens with the stored answers in it — sex chosen, focus on, name filled", () => {
    setupRerun({ sex: "female", kind: "cycle", focus: ["cycle"], name: "Ada" });
    tap(/get started/i);
    const female = screen
      .getAllByRole("button")
      .find((b) => /^Female/.test(b.textContent ?? ""));
    expect(female?.getAttribute("aria-pressed")).toBe("true");
    /* Pre-filled means Continue is live without touching anything. */
    const cont = screen
      .getAllByRole("button")
      .find((b) => /continue/i.test(b.textContent ?? "")) as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
    tap(/continue/i);
    const cycle = screen
      .getAllByRole("button")
      .find((b) => /track my cycle/i.test(b.textContent ?? ""));
    expect(cycle?.getAttribute("aria-pressed")).toBe("true");
    tap(/continue/i);
    const input = screen.getByLabelText(/your name, optional/i) as HTMLInputElement;
    expect(input.value).toBe("Ada");
  });

  it("a straight click-through hands back the record — including a capability Settings changed", () => {
    /* Answered Female at setup (kind derived: cycle), then turned the
       cycle OFF in Settings: the record is sex female, kind no-cycle.
       Deriving the capability from the answer at finish would silently
       turn the cycle back on — the click-through must not. */
    const { onFinish } = setupRerun({ sex: "female", kind: "no-cycle", focus: [], name: null });
    tap(/get started/i);
    tap(/continue/i);
    tap(/continue/i);
    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as { kind: string; sex: string };
    expect(arg.sex).toBe("female");
    expect(arg.kind).toBe("no-cycle");
  });

  it("changing the answer re-derives the capability, exactly as a first run does", () => {
    const { onFinish } = setupRerun({ sex: "female", kind: "no-cycle", focus: [], name: null });
    tap(/get started/i);
    tap(/prefer not to say/i);
    tap(/continue/i);
    tap(/continue/i);
    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as { kind: string; sex: string };
    expect(arg.sex).toBe("unspecified");
    expect(arg.kind).toBe("unspecified");
  });
});

/* --------------------- (c) the replay: Profile and the bus ----------------- */

describe("welcome re-run: the manual replay", () => {
  it("the bus carries a request from a page to the gate", () => {
    const handler = vi.fn();
    const off = onWelcomeReplayRequest(handler);
    requestWelcomeReplay();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    requestWelcomeReplay();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("Profile carries the entry, wired to the bus", () => {
    const account = read("components/profile/AccountRow.tsx");
    expect(account).toContain("See the welcome again");
    expect(account).toContain('testId="pf-row-welcome-replay"');
    expect(account).toContain("requestWelcomeReplay()");
  });

  it("the gate answers all three runs, and re-applies setup on the first only", () => {
    const gate = read("components/welcome/WelcomeGate.tsx");
    expect(gate).toContain("needsWelcomeRerun");
    expect(gate).toContain("onWelcomeReplayRequest");
    expect(gate).toContain("markWelcomeSeen");
    /* The starting-tracker application sits inside the first-run branch —
       a re-run must never re-apply setup over a shaped Bloom. */
    expect(gate).toMatch(/if \(mode === "first"\) \{\s*const suggested = suggestedTrackers/);
  });
});

/* ----------------- (e) the name pre-fill fallback (M-185) ----------------- */

describe("welcome re-run: the name pre-fill fallback", () => {
  it("a name stored on the record always wins over the profile name", () => {
    expect(welcomeInitialName("Ada", "Maelix")).toBe("Ada");
  });

  it("with no name on the record, the profile display name fills in", () => {
    expect(welcomeInitialName(null, "Maelix")).toBe("Maelix");
    expect(welcomeInitialName("", "Maelix")).toBe("Maelix");
    expect(welcomeInitialName("  ", "Maelix")).toBe("Maelix");
  });

  it("with neither, the field opens empty — and the placeholder is not a name", () => {
    expect(welcomeInitialName(null, null)).toBeNull();
    expect(welcomeInitialName(null, "")).toBeNull();
    expect(welcomeInitialName(null, "Bloom User")).toBeNull();
  });

  it("only the name falls back — the rule takes no other answer as input", () => {
    /* The function's whole surface is two names. There is no parameter
       through which a sex, kind or focus fallback could ever sneak in. */
    expect(welcomeInitialName.length).toBe(2);
  });

  it("the gate wires the fallback to the rail identity, the profile name's own source", () => {
    const gate = read("components/welcome/WelcomeGate.tsx");
    expect(gate).toContain("useRailIdentity");
    expect(gate).toContain("welcomeInitialName(state.name");
    /* A first run still opens with no initial at all — unchanged. */
    expect(gate).toMatch(/mode === "first"\s*\? undefined/);
  });

  it("a re-run whose record predates the name question opens with the profile name filled", () => {
    /* The owner's own shape: nothing on the record (sex unanswered too,
       exactly as his Settings shows), and a profile that has a name.
       The fallback product — record null, profile "Maelix" — is what
       the gate hands the flow. */
    setupRerun({
      sex: null,
      kind: "unspecified",
      focus: [],
      name: welcomeInitialName(null, "Maelix"),
    });
    tap(/get started/i);
    tap(/prefer not to say/i);
    tap(/continue/i);
    tap(/continue/i);
    const input = screen.getByLabelText(/your name, optional/i) as HTMLInputElement;
    expect(input.value).toBe("Maelix");
  });
});
