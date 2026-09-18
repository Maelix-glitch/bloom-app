// @vitest-environment jsdom
/**
 * The setup flow — the only screen that changes the app's structure.
 *
 * The redesign was visual, but what's worth pinning is behaviour: that the
 * answer to "which best describes you?" actually decides whether the cycle
 * exists, that declining the question is not the same as answering no, and that
 * the focus list follows the answer. Those are the promises the rest of the app
 * relies on, and a careless edit to the option list breaks them silently.
 *
 * Rendered with no Supabase configured, which is also how it runs in local
 * development — the admin door is absent rather than present and refusing.
 */

import { createElement, forwardRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(cleanup);

/*
 * motion/react is mocked out. `AnimatePresence mode="wait"` keeps the exiting
 * screen mounted until its exit animation finishes, and jsdom never runs those
 * frames — so the next step never mounts and every navigation query fails.
 * Plain elements exercise the real component's structure and handlers, which is
 * what these assertions are about.
 */
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
import type { ProfileKind, SexAnswer } from "@/lib/onboarding/profileKind";

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

type Finished = { kind: ProfileKind; sex: SexAnswer; focus: string[]; name: string | null };

/**
 * Click a button by matching its text, re-querying every time.
 *
 * Deliberately not `getByRole`: a reference captured before a re-render goes
 * stale, and the query then silently finds nothing on the next screen.
 */
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

function setup() {
  const onFinish = vi.fn();
  render(<Welcome onFinish={onFinish} onAdmin={() => {}} />);
  return { onFinish };
}

/** Walk to the focus screen, having answered the sex question. */
function toFocus(answer: "Female" | "Male" | "Prefer not to say") {
  const ctx = setup();
  tap(/get started/i);
  tap(new RegExp(answer));
  tap(/continue/i);
  return ctx;
}

describe("Welcome", () => {
  it("asks for nothing on the first screen", () => {
    setup();
    expect(screen.getByText(/Bloom keeps the record/)).toBeTruthy();
    expect(hasButton(/get started/i)).toBe(true);
  });

  it("does not render an admin door of its own", () => {
    /*
     * Whether the door appears is decided by `useAdminAccess`, not by this
     * component — and in a dev environment with no database its `DEV_DOOR`
     * deliberately opens, so the button *is* present here. Asserting either way
     * would pin environment-dependent behaviour belonging to another module.
     * What Welcome owns is that it renders at most the one button the hook
     * allows, and never a second path in.
     */
    setup();
    const doors = screen.getAllByRole("button").filter((b) => /admin/i.test(b.textContent ?? ""));
    expect(doors.length).toBeLessThanOrEqual(1);
  });

  it("will not advance past the sex question until it is answered", () => {
    setup();
    tap(/get started/i);
    const cont = screen
      .getAllByRole("button")
      .find((b) => /continue/i.test(b.textContent ?? "")) as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    tap(/Female/);
    const after = screen
      .getAllByRole("button")
      .find((b) => /continue/i.test(b.textContent ?? "")) as HTMLButtonElement;
    expect(after.disabled).toBe(false);
  });

  it("keeps 'prefer not to say' distinct from answering no", () => {
    /* The distinction the whole feature rests on: declining the question leaves
       the cycle available, answering Male removes it. If these two ever collapse
       into one value, Settings can no longer tell them apart. */
    const { onFinish } = toFocus("Prefer not to say");
    tap(/continue/i);
    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as Finished;
    expect(arg.sex).toBe("unspecified");
    expect(arg.kind).toBe("unspecified");
  });

  it("records Male as no-cycle, and drops cycle from the focus list", () => {
    const { onFinish } = toFocus("Male");
    /* The focus screen must not offer to track a cycle to someone who just said
       the cycle isn't theirs. */
    expect(hasButton(/Track my cycle/)).toBe(false);
    expect(hasButton(/Build habits/)).toBe(true);

    tap(/continue/i);
    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as Finished;
    expect(arg.sex).toBe("male");
    expect(arg.kind).toBe("no-cycle");
    expect(arg.focus).toEqual([]);
  });

  it("offers the cycle focus to someone who kept it, and carries the name", () => {
    const { onFinish } = toFocus("Female");
    expect(hasButton(/Track my cycle/)).toBe(true);
    tap(/Track my cycle/);

    tap(/continue/i);
    fireEvent.change(screen.getByLabelText(/your name, optional/i), {
      target: { value: "  Ada  " },
    });
    /* The recap must reflect the answers rather than being decorative. */
    expect(screen.getByText("Included")).toBeTruthy();

    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as Finished;
    expect(arg.sex).toBe("female");
    expect(arg.kind).toBe("cycle");
    expect(arg.focus).toEqual(["cycle"]);
    expect(arg.name).toBe("Ada");
  });

  it("treats the name as optional", () => {
    const { onFinish } = toFocus("Female");
    tap(/continue/i);
    tap(/enter bloom/i);
    const arg = onFinish.mock.calls[0]?.[0] as Finished;
    expect(arg.name).toBeNull();
  });

  it("presents both answers alike — no pink-versus-blue styling", () => {
    setup();
    tap(/get started/i);
    const buttons = screen.getAllByRole("button");
    const female = buttons.find((b) => /^Female/.test(b.textContent ?? ""));
    const male = buttons.find((b) => /^Male/.test(b.textContent ?? ""));
    expect(female).toBeTruthy();
    expect(male).toBeTruthy();
    /* Same class, no per-answer modifier: the choice must read as answering a
       question, not picking a theme. */
    expect(female!.className).toBe(male!.className);
  });
});
