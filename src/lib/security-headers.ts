/**
 * Security headers for every response the worker serves (pentest
 * 2026-11-19, finding M3: the app shipped with none — no CSP, no
 * HSTS, no frame protection, on an app that holds session tokens in
 * browser storage and health data behind them).
 *
 * The CSP is tuned to the app's REAL runtime sources, inventoried
 * from the code — not a boilerplate policy:
 *
 *   · scripts/styles/fonts: 'self' — the bundle is self-hosted,
 *     including all fonts (@font-face, no Google Fonts at runtime).
 *     script-src/style-src keep 'unsafe-inline' because TanStack
 *     Start's SSR hydration emits inline scripts and React emits
 *     inline style attributes; removing it is a nonce migration,
 *     tracked separately. Even with it, the policy still blocks
 *     every EXTERNAL script origin, all plugins (object-src 'none')
 *     and all framing (frame-ancestors 'none').
 *   · images: 'self' (dish/food photos are bundled assets), data:
 *     and blob: (canvas/upload previews), Supabase storage (profile
 *     and story media), Giphy (story GIFs), iTunes artwork
 *     (*.mzstatic.com) and Deezer artwork (*.dzcdn.net).
 *   · media: 'self', blob: (TTS audio returns as a Blob), Supabase
 *     storage (story video), Giphy, Deezer previews (*.dzcdn.net).
 *   · connect: 'self', the Supabase project (REST/auth/storage/
 *     functions over https, realtime over wss), iTunes search and
 *     the Deezer API. ElevenLabs is NOT here — the client never
 *     calls it; speech goes through the coach edge function.
 *
 * No Permissions-Policy: Bloom legitimately uses camera and
 * microphone (Coach photo capture, voice input, Stories camera),
 * and a wrong guess here breaks features silently.
 *
 * Applied in src/server.ts, the worker entry, so document, asset
 * and error responses all carry the same set.
 */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.giphy.com https://*.mzstatic.com https://*.dzcdn.net",
  "media-src 'self' blob: https://*.supabase.co https://*.giphy.com https://*.dzcdn.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://itunes.apple.com https://api.deezer.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  /* frame-ancestors above is the modern control; X-Frame-Options is
     kept for older browsers that do not honour it. */
  "X-Frame-Options": "DENY",
};

/** Return a response with the security headers set (existing headers
 *  on the response are preserved; security headers win on conflict). */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
