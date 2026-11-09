/**
 * Error telemetry — the sink behind report().
 *
 * report() (lib/profile/errors) used to end at the console: a failure on
 * a user's phone left no trace anywhere. Now every report() call also
 * lands here, alongside uncaught window errors and unhandled promise
 * rejections (installed once from the root component).
 *
 * Shape of the thing:
 *   · events are normalised (message/stack truncated, URL query strings
 *     stripped — a stack frame must never carry a token or an email),
 *   · duplicates within the buffer collapse into an occurrence count,
 *   · the buffer persists in localStorage, so an error that kills the
 *     page still ships on the next launch,
 *   · flushes are batched (10 events, 25 s, or the page hiding),
 *   · and the send path NEVER calls report() — a telemetry failure is a
 *     console.warn and a dropped batch, never a loop.
 *
 * The table (public.client_errors) is insert-only for clients; nobody
 * reads it through the API.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export interface ErrorEvent {
  scope: string;
  message: string;
  stack: string | null;
  route: string | null;
  occurrences: number;
  at: string;
}

const STORAGE_KEY = "bloom:error-log:v1";
const MAX_BUFFER = 50;
const FLUSH_AT = 10;
const FLUSH_MS = 25_000;

let buffer: ErrorEvent[] = [];
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let installed = false;

const inBrowser = () => typeof window !== "undefined";

/** Strip query strings (and hash) from anything URL-shaped in the text. */
function scrub(text: string): string {
  return text.replace(/(https?:\/\/[^\s?#]+)\?[^\s]*/g, "$1").replace(/([?&])(token|code|email)=[^\s&]*/gi, "$1$2=…");
}

/**
 * A readable message for anything a caller can throw or hand us. PostgREST /
 * Supabase errors are PLAIN objects ({ message, code, details, hint }), not
 * Error instances — String() on one is the useless "[object Object]" that
 * hid the profile:load failures in the first telemetry catch. Compose from
 * the parts instead, keeping the code: it is usually the diagnosis.
 */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message) parts.push(e.message);
    if (typeof e.code === "string" && e.code) parts.push(`[${e.code}]`);
    else if (typeof e.code === "number") parts.push(`[${e.code}]`);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(`hint: ${e.hint}`);
    if (parts.length > 0) return parts.join(" — ");
    try {
      return JSON.stringify(error) ?? "unknown";
    } catch {
      return "unknown"; // circular structure
    }
  }
  if (error == null) return "unknown";
  return String(error);
}

function normalise(scope: string, error: unknown): ErrorEvent {
  const err = error instanceof Error ? error : null;
  const rawMessage = messageOf(error);
  return {
    scope: scope.slice(0, 80),
    message: scrub(rawMessage).slice(0, 500) || "unknown",
    stack: err?.stack ? scrub(err.stack).slice(0, 2000) : null,
    route: inBrowser() ? window.location.pathname : null,
    occurrences: 1,
    at: new Date().toISOString(),
  };
}

function persist() {
  if (!inBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_BUFFER)));
  } catch {
    /* storage full/blocked — the in-memory buffer still flushes */
  }
}

function load() {
  if (loaded || !inBrowser()) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) buffer = [...(JSON.parse(raw) as ErrorEvent[]), ...buffer].slice(-MAX_BUFFER);
  } catch {
    /* a corrupt buffer is not worth an error of its own */
  }
}

function schedule() {
  if (timer || !inBrowser()) return;
  timer = setTimeout(() => {
    timer = null;
    void flushErrors();
  }, FLUSH_MS);
}

/** Queue one report. Safe anywhere, including during render and on the server (a no-op there). */
export function enqueueError(scope: string, error: unknown): void {
  if (!inBrowser()) return;
  try {
    load();
    const event = normalise(scope, error);
    const dupe = buffer.find((e) => e.scope === event.scope && e.message === event.message);
    if (dupe) {
      dupe.occurrences += 1;
      dupe.at = event.at;
    } else {
      buffer.push(event);
      if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
    }
    persist();
    if (buffer.length >= FLUSH_AT) void flushErrors();
    else schedule();
  } catch {
    /* telemetry must never throw into the app */
  }
}

export async function flushErrors(): Promise<void> {
  if (!inBrowser() || flushing || !hasSupabaseConfig) return;
  load();
  if (buffer.length === 0) return;
  flushing = true;
  const batch = buffer;
  buffer = [];
  persist();
  try {
    let profileId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      profileId = data.session?.user.id ?? null;
    } catch {
      profileId = null;
    }
    const rows = batch.map((e) => ({
      profile_id: profileId,
      scope: e.scope,
      message: e.message,
      stack: e.stack,
      route: e.route,
      user_agent: window.navigator.userAgent.slice(0, 300),
      occurrences: e.occurrences,
      created_at: e.at,
    }));
    const { error } = await supabase.from("client_errors").insert(rows);
    if (error) {
      /* A stale session can point at a profile that no longer exists —
         retry once anonymously before giving up on the batch. */
      const { error: retryError } = await supabase
        .from("client_errors")
        .insert(rows.map((r) => ({ ...r, profile_id: null })));
      if (retryError) console.warn("[bloom:telemetry] dropped error batch", retryError.message);
    }
  } catch (e) {
    console.warn("[bloom:telemetry] flush failed", e instanceof Error ? e.message : e);
  } finally {
    flushing = false;
    if (buffer.length > 0) schedule();
  }
}

/** Install the global handlers once. Called from the root component. */
export function installErrorTelemetry(): void {
  if (!inBrowser() || installed) return;
  installed = true;
  load();
  window.addEventListener("error", (event) => {
    enqueueError("window:error", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    enqueueError("window:unhandledrejection", event.reason);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushErrors();
  });
  window.addEventListener("pagehide", () => {
    void flushErrors();
  });
  /* Whatever a previous session left behind ships now. */
  if (buffer.length > 0) schedule();
}

/** Test seam: the current buffer, and a reset. */
export function __errorBufferForTests(): ErrorEvent[] {
  load();
  return buffer;
}
export function __resetTelemetryForTests(): void {
  buffer = [];
  loaded = false;
  installed = false;
  if (timer) clearTimeout(timer);
  timer = null;
  if (inBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
