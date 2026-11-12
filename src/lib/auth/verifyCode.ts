/**
 * The one sign-in code checker.
 *
 * The companion to `requestMagicLink`. The same Supabase email carries both a
 * link and a code; the link opens wherever the mail app sends it — usually a
 * fresh tab — while the code is typed into the tab the person is already on,
 * so verification finishes where it started. This is the call that does that:
 * `verifyOtp` with the address the code was sent to and the token from the
 * email. On success Supabase creates the session in this tab, and the app's
 * ordinary session handling (watchAuth → useSession → AccessControl) takes
 * over from there — nothing here navigates anywhere.
 *
 * The discipline mirrors the sender, for the same reasons:
 *
 *   · an unconfigured build says so plainly instead of hanging;
 *   · the email is normalised once (trim + lowercase) and the code is trimmed
 *     of the spaces a paste from an email can carry;
 *   · every failure is reported under the caller's scope and worded by
 *     `messageFor` — a wrong or expired code reads like a person wrote it.
 */

import { messageFor } from "@/lib/auth/flow";
import { report } from "@/lib/profile/errors";
import { hasSupabaseConfig, supabase, supabaseConfigProblem } from "@/lib/supabase";

export type VerifyCodeResult = { ok: true } | { ok: false; message: string };

export async function verifyEmailCode(
  email: string,
  token: string,
  opts: { scope: string },
): Promise<VerifyCodeResult> {
  if (!hasSupabaseConfig) {
    return {
      ok: false,
      message:
        supabaseConfigProblem() ??
        "This copy of Bloom has no account system connected, so there's no code to check.",
    };
  }
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    if (error) {
      report(opts.scope, error);
      return { ok: false, message: messageFor(error) };
    }
    return { ok: true };
  } catch (e) {
    report(opts.scope, e);
    /* The throwing client proxy's "not connected" failure deserves its own
       sentence; everything else goes through the shared wording. */
    if (e instanceof Error && /not connected/i.test(e.message)) {
      return {
        ok: false,
        message: "Bloom isn't connected to a database here, so there's no account to sign in to.",
      };
    }
    return { ok: false, message: messageFor(e) };
  }
}
