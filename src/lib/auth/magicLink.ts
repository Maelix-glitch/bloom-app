/**
 * The one magic-link sender.
 *
 * Two surfaces used to grow their own copy of this: the access gate and the
 * profile's "sign in to sync" resend. They had drifted — the gate showed raw
 * backend error text while the profile mapped its own friendly wording, and
 * only the profile guarded against an unconfigured build (the gate's version
 * of that failure was a button stuck on "sending"). Now both call this:
 *
 *   · an unconfigured build says so plainly instead of hanging;
 *   · the email is normalised once (trim + lowercase);
 *   · the redirect target stays the caller's choice (the gate lands on the
 *     root, the profile resend lands back on /profile);
 *   · every failure is reported under the caller's scope and worded by
 *     `messageFor` — written for the person, not for whoever debugs at 2am.
 */

import { messageFor } from "@/lib/auth/flow";
import { report } from "@/lib/profile/errors";
import { hasSupabaseConfig, supabase, supabaseConfigProblem } from "@/lib/supabase";

export type MagicLinkResult = { ok: true } | { ok: false; message: string };

export async function requestMagicLink(
  email: string,
  opts: { redirectTo?: string | undefined; scope: string },
): Promise<MagicLinkResult> {
  if (!hasSupabaseConfig) {
    return {
      ok: false,
      message:
        supabaseConfigProblem() ??
        "This copy of Bloom has no account system connected, so there's no link to send.",
    };
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      ...(opts.redirectTo ? { options: { emailRedirectTo: opts.redirectTo } } : {}),
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
