// @vitest-environment jsdom
/**
 * Trainer referral guards (M-171, 2026-11-21).
 *
 * The owner's rules for this feature are visibility rules, so they are
 * pinned as rendering rules:
 *
 *   · Trainer status is admin-granted and server-held. The Profile
 *     section renders ONLY on a positive server answer — a regular
 *     account sees no trace of it, and a failed read shows nothing
 *     rather than inventing a code.
 *   · A trainer sees their one code (copyable) and their clients —
 *     name and joined date, nothing else exists to show.
 *   · The Welcome field is optional in every direction: empty is
 *     skipped silently, a wrong code earns one gentle line and the
 *     flow still finishes, and a typed code makes exactly ONE link
 *     attempt (blur and finish share the attempt, never two).
 *
 * The components and the real lib run against a mocked Supabase
 * transport; the migration itself is pinned statically, in the house
 * migration-test style, because there is no Postgres in CI.
 */

import { createElement, forwardRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

/* The Supabase transport, mocked at the module seam. trySupabase keeps
   its real contract (never throws, { ok } union) so the lib's failure
   mapping is exercised honestly. */
const sb = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  supabaseConfigProblem: () => null,
  supabase: {
    auth: {
      getUser: sb.getUser,
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: sb.from,
    rpc: sb.rpc,
  },
  watchAuth: (onUser: (userId: string | null) => void) => {
    queueMicrotask(() => onUser(null));
    return () => {};
  },
  trySupabase: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true as const, value: await fn() };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof Error ? e.message : "That didn't go through.",
        offline: false,
      };
    }
  },
}));

import { TrainerReferralSection } from "./TrainerReferralSection";
import { Welcome } from "@/components/welcome/Welcome";
import { fetchMyTrainer, linkTrainerCode, parseTrainerClients } from "@/lib/trainer/referralServer";

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

const CODE = "K7X2P9QD";

type RpcResult = { data: unknown; error: unknown };

function trainerChain(code: string | null, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: code ? { code } : null, error }),
  };
  return chain;
}

/** Configure the whole fake server for one scenario. */
function setServer(opts: {
  trainerCode: string | null;
  clients?: unknown;
  linkResult?: RpcResult;
  rowError?: unknown;
}) {
  sb.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  sb.from.mockImplementation(() => trainerChain(opts.trainerCode, opts.rowError ?? null));
  sb.rpc.mockImplementation(async (fn: string) => {
    if (fn === "my_trainer_clients") return { data: opts.clients ?? [], error: null };
    if (fn === "link_trainer_code") return opts.linkResult ?? { data: "linked", error: null };
    /* The admin-door RPCs: this account is not an admin. */
    return { data: false, error: null };
  });
}

function linkCalls(): unknown[][] {
  return sb.rpc.mock.calls.filter((c) => c[0] === "link_trainer_code");
}

beforeEach(() => {
  sb.getUser.mockReset();
  sb.from.mockReset();
  sb.rpc.mockReset();
  window.localStorage.clear();
});

/* ------------------------------------------------------------------ */
/*  Profile: the section exists only for trainers                      */
/* ------------------------------------------------------------------ */

describe("TrainerReferralSection", () => {
  it("renders nothing at all for a regular account — no heading, no code, no list", async () => {
    setServer({ trainerCode: null });
    const { container } = render(<TrainerReferralSection />);

    await waitFor(() => expect(sb.from).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));

    expect(container.innerHTML).toBe("");
    expect(screen.queryByText("Your trainer code")).toBeNull();
    expect(screen.queryByText("My clients")).toBeNull();
    expect(screen.queryByText(/BLOOM-/)).toBeNull();
  });

  it("renders nothing when the server cannot be read — never an invented code", async () => {
    setServer({ trainerCode: null, rowError: new Error("table missing") });
    const { container } = render(<TrainerReferralSection />);

    await waitFor(() => expect(sb.from).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));

    expect(container.innerHTML).toBe("");
  });

  it("shows the trainer their code and their clients — name and joined date only", async () => {
    setServer({
      trainerCode: CODE,
      clients: [
        { display_name: "Ada Lovelace", joined_at: "2026-11-03T10:00:00.000Z" },
        { display_name: "Grace Hopper", joined_at: "2026-11-20T09:30:00.000Z" },
      ],
    });
    render(<TrainerReferralSection />);

    expect(await screen.findByText(`BLOOM-${CODE}`)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Your trainer code" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "My clients" })).toBeTruthy();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText(/Joined 3 Nov 2026/)).toBeTruthy();
    expect(screen.getByText("Grace Hopper")).toBeTruthy();
    expect(screen.getByText(/Joined 20 Nov 2026/)).toBeTruthy();
  });

  it("gives a trainer with no clients the honest empty line", async () => {
    setServer({ trainerCode: CODE, clients: [] });
    render(<TrainerReferralSection />);

    expect(await screen.findByText(`BLOOM-${CODE}`)).toBeTruthy();
    expect(screen.getByText(/Nobody has joined with your code yet/)).toBeTruthy();
  });

  it("copies the displayed code, prefix included, and confirms with 'Copied'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    setServer({ trainerCode: CODE, clients: [] });
    render(<TrainerReferralSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(`BLOOM-${CODE}`);
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
  });
});

/* ------------------------------------------------------------------ */
/*  Welcome: the optional code field                                   */
/* ------------------------------------------------------------------ */

function tap(text: RegExp) {
  const el = screen
    .getAllByRole("button")
    .find((b) => text.test((b.textContent ?? "").replace(/\s+/g, " ")));
  if (!el) throw new Error(`no button matching ${text}`);
  fireEvent.click(el);
}

/** Walk to the name/recap screen, having answered Female. */
function toLastScreen() {
  const onFinish = vi.fn();
  render(<Welcome onFinish={onFinish} onAdmin={() => {}} />);
  tap(/get started/i);
  tap(/Female/);
  tap(/continue/i);
  tap(/continue/i);
  return { onFinish };
}

describe("Welcome trainer code", () => {
  it("is offered with the honest line: the trainer sees you've joined, nothing else", () => {
    setServer({ trainerCode: null });
    toLastScreen();

    expect(screen.getByLabelText(/trainer code, optional/i)).toBeTruthy();
    expect(screen.getByText(/will see that you.ve joined Bloom with their code/)).toBeTruthy();
    expect(screen.getByText(/Nothing else about you is shared/)).toBeTruthy();
  });

  it("finishes silently with the field empty — no link attempt at all", () => {
    setServer({ trainerCode: null });
    const { onFinish } = toLastScreen();

    tap(/enter bloom/i);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(linkCalls()).toEqual([]);
  });

  it("a well-formed but unknown code earns one gentle line, and finishing still works", async () => {
    setServer({
      trainerCode: null,
      linkResult: {
        data: null,
        error: { code: "P0002", message: "Trainer code not recognised." },
      },
    });
    const { onFinish } = toLastScreen();

    const input = screen.getByLabelText(/trainer code, optional/i);
    fireEvent.change(input, { target: { value: "ZZZZZZZZ" } });
    /* Re-queried after the change: the house motion mock remounts the
       step subtree on every render, so a captured node goes stale —
       the same reason Welcome.test.tsx re-queries after every tap. */
    fireEvent.focusOut(screen.getByLabelText(/trainer code, optional/i));

    expect(await screen.findByText(/doesn't match a trainer/)).toBeTruthy();
    expect(linkCalls().length).toBe(1);

    tap(/enter bloom/i);
    expect(onFinish).toHaveBeenCalledTimes(1);
    /* Finish did not spend a second attempt on the same code. */
    expect(linkCalls().length).toBe(1);
  });

  it("a malformed code is answered locally — gentle line, no RPC spent", async () => {
    setServer({ trainerCode: null });
    toLastScreen();

    const input = screen.getByLabelText(/trainer code, optional/i);
    fireEvent.change(input, { target: { value: "ABC" } });
    fireEvent.focusOut(screen.getByLabelText(/trainer code, optional/i));

    expect(await screen.findByText(/doesn't match a trainer/)).toBeTruthy();
    expect(linkCalls()).toEqual([]);
  });

  it("a typed code is linked exactly once when finishing, with the normalised code", async () => {
    setServer({ trainerCode: null, linkResult: { data: "linked", error: null } });
    const { onFinish } = toLastScreen();

    const input = screen.getByLabelText(/trainer code, optional/i);
    fireEvent.change(input, { target: { value: `bloom-${CODE.toLowerCase()}` } });
    tap(/enter bloom/i);

    expect(onFinish).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(linkCalls().length).toBe(1));
    expect(linkCalls()[0]?.[1]).toEqual({ p_code: CODE });
  });
});

/* ------------------------------------------------------------------ */
/*  The lib contract against the transport                             */
/* ------------------------------------------------------------------ */

describe("referralServer", () => {
  it("maps the RPC's outcomes to the named results the UI speaks", async () => {
    setServer({ trainerCode: null, linkResult: { data: "linked", error: null } });
    await expect(linkTrainerCode(CODE)).resolves.toEqual({ kind: "linked" });

    setServer({ trainerCode: null, linkResult: { data: "already_linked", error: null } });
    await expect(linkTrainerCode(CODE)).resolves.toEqual({ kind: "already-linked" });

    setServer({
      trainerCode: null,
      linkResult: { data: null, error: { code: "P0002", message: "Trainer code not recognised." } },
    });
    await expect(linkTrainerCode(CODE)).resolves.toEqual({ kind: "unknown-code" });

    setServer({
      trainerCode: null,
      linkResult: {
        data: null,
        error: { code: "22023", message: "That is your own trainer code." },
      },
    });
    await expect(linkTrainerCode(CODE)).resolves.toEqual({ kind: "own-code" });

    setServer({ trainerCode: null });
    const before = linkCalls().length;
    await expect(linkTrainerCode("not a code")).resolves.toEqual({ kind: "malformed" });
    /* Malformed is answered locally — the RPC count does not move. */
    expect(linkCalls().length).toBe(before);
  });

  it("reads trainer standing from the server: row → trainer, no row → not-trainer", async () => {
    setServer({
      trainerCode: CODE,
      clients: [{ display_name: "Ada Lovelace", joined_at: "2026-11-03T10:00:00.000Z" }],
    });
    await expect(fetchMyTrainer()).resolves.toEqual({
      kind: "trainer",
      code: CODE,
      clients: [{ name: "Ada Lovelace", joinedAt: "2026-11-03T10:00:00.000Z" }],
    });

    setServer({ trainerCode: null });
    await expect(fetchMyTrainer()).resolves.toEqual({ kind: "not-trainer" });
  });

  it("parseTrainerClients drops malformed rows instead of repairing them", () => {
    expect(
      parseTrainerClients([
        { display_name: "Ada Lovelace", joined_at: "2026-11-03T10:00:00.000Z" },
        { display_name: "", joined_at: "2026-11-03T10:00:00.000Z" },
        { display_name: "No Date" },
        { joined_at: "2026-11-03T10:00:00.000Z" },
        "nonsense",
        null,
      ]),
    ).toEqual([{ name: "Ada Lovelace", joinedAt: "2026-11-03T10:00:00.000Z" }]);
    expect(parseTrainerClients(undefined)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  The migration, pinned statically                                   */
/* ------------------------------------------------------------------ */

describe("migration 20261121_trainer_referral", () => {
  /* process.cwd(), not import.meta.url: under the jsdom environment the
     module URL is not a file URL (the supabase.guard precedent). */
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261121_trainer_referral.sql"),
    "utf8",
  );

  it("creates the two tables, with the first-link rule as a primary key", () => {
    expect(sql).toContain("create table if not exists public.trainer_profiles");
    expect(sql).toContain("create table if not exists public.trainer_links");
    expect(sql).toMatch(/client_user_id uuid primary key/);
    /* The code format is the client's unambiguous alphabet, enforced. */
    expect(sql).toContain("'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'");
  });

  it("keeps writes behind the definer functions — RLS reads are own-row only", () => {
    expect(sql).toContain("alter table public.trainer_profiles enable row level security");
    expect(sql).toContain("alter table public.trainer_links enable row level security");
    expect(sql).toMatch(
      /create policy "trainer_profiles self select"[\s\S]*?user_id = auth\.uid\(\)/,
    );
    expect(sql).toMatch(
      /create policy "trainer_links self select"[\s\S]*?client_user_id = auth\.uid\(\)/,
    );
    expect(sql).not.toMatch(/grant (insert|update|delete) on public\.trainer_/);
  });

  it("makes the grant service-role only — no client role can mint a trainer", () => {
    expect(sql).toContain("create or replace function public.admin_grant_trainer(p_email text)");
    expect(sql).toMatch(
      /revoke all on function public\.admin_grant_trainer\(text\) from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_grant_trainer\(text\) to service_role/,
    );
  });

  it("exposes linking and the clients list to signed-in callers only", () => {
    expect(sql).toContain("create or replace function public.link_trainer_code(p_code text)");
    expect(sql).toContain("create or replace function public.my_trainer_clients()");
    expect(sql).toMatch(
      /grant execute on function public\.link_trainer_code\(text\) to authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.my_trainer_clients\(\) to authenticated/,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.(link_trainer_code|my_trainer_clients)\([^)]*\) to anon/,
    );
    /* The first link stands, stated in the function itself. */
    expect(sql).toContain("return 'already_linked'");
  });

  it("covers both tables in erase_my_data — either side of a link", () => {
    expect(sql).toMatch(
      /delete from public\.trainer_links where client_user_id = uid or trainer_user_id = uid/,
    );
    expect(sql).toMatch(/delete from public\.trainer_profiles where user_id = uid/);
  });
});
