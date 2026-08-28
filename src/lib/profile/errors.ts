/**
 * Consumer-facing error normalization. Raw provider errors go to the console
 * only; the UI gets calm human sentences.
 */

const FRIENDLY: Record<string, string> = {
  network: "You're offline.",
  failedtofetch: "You're offline.",
  timeout: "That took too long. Try again.",
};

export function friendlyError(error: unknown, fallback = "Something went wrong."): string {
  if (error && typeof error === "object" && "message" in error) {
    const raw = String((error as { message: unknown }).message ?? "");
    const key = raw.toLowerCase().replace(/[^a-z]/g, "");
    for (const [needle, friendly] of Object.entries(FRIENDLY)) {
      if (key.includes(needle)) return friendly;
    }
  }
  if (error instanceof TypeError && /fetch/i.test(error.message)) return FRIENDLY["network"]!;
  return fallback;
}

/** Log for developers, return the calm message for the screen. */
export function report(scope: string, error: unknown): string {
  console.error(`[bloom:${scope}]`, error);
  return friendlyError(error);
}
