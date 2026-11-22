/**
 * The worker's security headers (pentest 2026-11-19, M3), pinned at
 * the pure module src/server.ts applies to every response. The CSP
 * must name the app's REAL external sources — and only those: if a
 * future feature needs a new origin it should fail here first and
 * be added deliberately, with the reason, rather than the policy
 * silently widening.
 */
import { describe, expect, it } from "vitest";

import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  withSecurityHeaders,
} from "./security-headers";

describe("the standard set is present", () => {
  it("carries CSP, HSTS, nosniff, referrer policy and frame denial", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toBe(CONTENT_SECURITY_POLICY);
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });

  it("never sends a Permissions-Policy (camera/mic are real Bloom features)", () => {
    expect(Object.keys(SECURITY_HEADERS)).not.toContain("Permissions-Policy");
  });
});

describe("the CSP fits the app's real sources", () => {
  it("locks the dangerous directives down", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
  });

  it("allows exactly the external origins the app loads", () => {
    /* Supabase (REST/auth/storage + realtime), the Stories providers
       (Giphy, iTunes, Deezer), Razorpay checkout (M-213) — and
       nothing else. */
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY).toContain("wss://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.giphy.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://itunes.apple.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.mzstatic.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://api.deezer.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.dzcdn.net");
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.razorpay.com");
  });

  it("puts Razorpay in exactly the directives checkout needs (M-213)", () => {
    /* checkout.js is a script, the modal is an iframe, the modal
       calls and form-posts back to Razorpay, and bank/method marks
       are images. Each Razorpay origin must sit in its own
       directive — anywhere else in the string proves nothing. */
    const directives = new Map(
      CONTENT_SECURITY_POLICY.split("; ").map((d) => {
        const [name, ...sources] = d.split(" ");
        return [name, sources] as const;
      }),
    );
    for (const name of ["script-src", "frame-src", "connect-src", "img-src", "form-action"]) {
      expect(directives.get(name), name).toContain("https://*.razorpay.com");
    }
    for (const name of ["style-src", "font-src", "media-src", "worker-src", "default-src"]) {
      expect(directives.get(name), name).not.toContain("https://*.razorpay.com");
    }
  });

  it("does NOT allow the origins the app never loads from the client", () => {
    /* ElevenLabs is reached only through the coach edge function;
       fonts are self-hosted, so no Google Fonts either. */
    expect(CONTENT_SECURITY_POLICY).not.toContain("elevenlabs");
    expect(CONTENT_SECURITY_POLICY).not.toContain("googleapis");
    expect(CONTENT_SECURITY_POLICY).not.toContain("gstatic");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
    /* No directive may fall back to a bare wildcard source. */
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/-src \*(;|$| )/);
  });
});

describe("withSecurityHeaders", () => {
  it("sets every header and preserves status and existing headers", () => {
    const res = withSecurityHeaders(
      new Response("ok", { status: 201, headers: { "x-bloom-test": "1" } }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("x-bloom-test")).toBe("1");
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(name)).toBe(value);
    }
  });
});
