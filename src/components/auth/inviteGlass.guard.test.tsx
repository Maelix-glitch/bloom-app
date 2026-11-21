// @vitest-environment jsdom
/**
 * Invitation glass guards (M-172, 2026-11-21).
 *
 * The owner approved the "Bloom Invitation — Glass Preview" and the
 * real gate now wears it: the mesh scene, the words on the scene with
 * NO panel, the glass flower, one glass field, the solid gold CTA.
 * These pins hold that structure — and, just as much, that the frozen
 * flow underneath it still behaves: an invalid address is answered
 * locally, an uninvited one gets the gate's own rejection and no link
 * is sent, an invited one reaches the sent state with the address
 * named.
 *
 * Same mechanism as the house guards: render pins where the DOM is
 * the contract, source scans where the stylesheet is. motion/react is
 * mocked out exactly as in glass.guard; the invite check and the
 * magic-link sender are mocked at their module doors, so no network
 * is touched and the reducer walks its real transitions.
 */

import { createElement, forwardRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(cleanup);

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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { askMock, magicLinkMock } = vi.hoisted(() => ({
  askMock: vi.fn(),
  magicLinkMock: vi.fn(
    async (_email: string, _opts: { redirectTo?: string | undefined; scope: string }) => ({
      ok: true as const,
    }),
  ),
}));
vi.mock("@/hooks/useInviteAccess", () => ({
  useInviteAccess: () => ({
    check: { status: "checking", reason: null },
    ask: askMock,
    reset: () => {},
  }),
}));

vi.mock("@/lib/auth/magicLink", () => ({
  requestMagicLink: magicLinkMock,
}));

import { AccessGate } from "./AccessGate";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

function blocks(text: string): { selector: string; body: string }[] {
  const clean = stripComments(text);
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}
const blockFor = (rel: string, sel: string) =>
  blocks(read(rel)).find((b) =>
    b.selector.split(",").some((part) => part.split("\n").pop()!.trim().startsWith(sel)),
  );

function setup() {
  askMock.mockReset();
  magicLinkMock.mockClear();
  return render(<AccessGate />);
}

async function submitWith(email: string) {
  const input = screen.getByLabelText(/email/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: email } });
  /* Click the submit button: jsdom's button activation submits the
     form through React's handler (a bare fireEvent.submit does not
     reach it in this setup). */
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

describe("invite glass guard: the gate wears the approved preview", () => {
  it("entry: mesh scene, flower, words on the scene — no panel — glass field, solid gold CTA", () => {
    setup();
    /* The mesh is the preview's four pools. */
    const mesh = document.querySelector(".ig-mesh");
    expect(mesh, "the mesh scene must be mounted").toBeTruthy();
    expect(mesh!.querySelectorAll("i").length).toBe(4);
    /* The hero flower rides above the words, as previewed. */
    expect(document.querySelector(".ig-flower")).toBeTruthy();
    /* No panel anywhere: the opaque panel of the old gate is gone,
       and the words sit in no glass element at all. */
    expect(document.querySelector(".ag-panel")).toBeNull();
    const title = screen.getByText(/Bloom is by invitation/);
    expect(
      title.closest(".glass-panel, .glass-pill, .glass-cap, .glass-field, .glass-cta"),
    ).toBeNull();
    expect(screen.getByText("Bloom is invite-only")).toBeTruthy();
    /* One glass field. */
    const input = screen.getByLabelText(/email/i);
    expect(input.className).toContain("glass-field");
    /* The way in is the preview's solid gold CTA. */
    const cta = document.querySelector('button[type="submit"]');
    expect(cta).toBeTruthy();
    expect(cta!.className).toContain("glass-cta");
    expect(cta!.getAttribute("data-solid")).toBe("true");
  });

  it("invite.css pins the preview's geometry, and styles.css layers it over access.css", () => {
    const invite = read("styles/invite.css");
    const scene = blockFor("styles/invite.css", ".ag-scene")!;
    expect(scene.body).toContain("max-width: 410px");
    /* The mesh pools blur at the preview's 46px. */
    expect(invite).toContain("blur(46px)");
    /* The field is the preview's: 56px, a 20px radius, 17px type. */
    const input = blockFor("styles/invite.css", ".ag-input")!;
    expect(input.body).toContain("height: 56px");
    expect(input.body).toContain("border-radius: var(--ig-radius-field)");
    expect(input.body).toContain("font-size: var(--ig-text-field)");
    expect(invite).toContain("--ig-radius-field: 20px");
    expect(invite).toContain("--ig-text-field: 17px");
    /* The CTA is pinned to the foot of the column, as previewed. */
    expect(invite).toContain("margin-top: auto");
    /* The invite sheet never resurrects the panel as a rule (its
       header prose names it only to retire it). */
    expect(stripComments(invite)).not.toContain(".ag-panel");
    /* Layered after access.css, whose guard-pinned text stays as-is. */
    const styles = read("styles.css");
    expect(styles.indexOf('@import "./styles/access.css"')).toBeLessThan(
      styles.indexOf('@import "./styles/invite.css"'),
    );
  });
});

describe("invite glass guard: the frozen flow still behaves", () => {
  it("an invalid address is answered locally — no check, no link", async () => {
    setup();
    /* "a@b" passes the field's native type=email validation but
       fails the app's own isLikelyEmail (no dot in the domain) — the
       path the reducer's invalid state exists for. */
    await submitWith("a@b");
    expect(await screen.findByText(/doesn't look like an email address/)).toBeTruthy();
    expect(askMock).not.toHaveBeenCalled();
    expect(magicLinkMock).not.toHaveBeenCalled();
  });

  it("an uninvited address gets the gate's own rejection, and no link is sent", async () => {
    setup();
    askMock.mockResolvedValue({ status: "not-invited", reason: null });
    await submitWith("stranger@example.com");
    expect(await screen.findByText(/isn't on the invite list/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try another email/i })).toBeTruthy();
    expect(magicLinkMock).not.toHaveBeenCalled();
  });

  it("an invited address reaches the sent state, named, with the seal in the flower's place", async () => {
    setup();
    askMock.mockResolvedValue({ status: "invited", reason: null });
    await submitWith("friend@example.com");
    expect(await screen.findByText(/Your Bloom link is on its way/)).toBeTruthy();
    expect(screen.getByText("friend@example.com")).toBeTruthy();
    expect(magicLinkMock).toHaveBeenCalledTimes(1);
    /* The flower gives way to the seal; the resend wears the resting
       glass CTA, not the solid. */
    expect(document.querySelector(".ig-flower")).toBeNull();
    expect(document.querySelector(".ag-done")).toBeTruthy();
    const resend = screen.getByRole("button", { name: /send it again/i });
    expect(resend.className).toContain("glass-cta");
    expect(resend.getAttribute("data-solid")).toBeNull();
  });
});
