# Bloom — Deployment

## The short version

**Host it on Cloudflare. It's already wired up — one command, free.**

```bash
npx wrangler login        # once: connects your Cloudflare account (free)
npm run deploy            # builds + ships the app, gives you a https URL
```

That's it. The repo builds an SSR worker (`cloudflare-module` preset in
`vite.config.ts`) and `npm run deploy` pushes it. You get
`https://bloom-app.<you>.workers.dev` (or rename with `npm run deploy:name`).
Every later deploy is just `npm run deploy` again.

## What host is actually best? (honest comparison)

| Host | Cost | Why / why not |
|---|---|---|
| **Cloudflare Workers** ✅ | Free (100k req/day) | Already configured. Fastest globally, HTTPS + HTTP/3 free, zero config. **Use this.** |
| Vercel | Free (hobby) | Easiest dashboard, great DX — but you'd change the Nitro preset to `vercel` and it sleeps less gracefully on free tier. Fine backup. |
| Netlify | Free | Same story as Vercel, needs preset change. No advantage over Cloudflare here. |
| Shared cPanel / GoDaddy-style hosting | ~$5/mo | ❌ Can't run this app (needs Node/Workers for SSR). Only usable with the static `build:app` bundle, and you lose SSR. Don't. |
| VPS (Hetzner/DigitalOcean) | ~$5/mo | Works, but you become the DevOps team (TLS, updates, uptime). Pointless when Workers is free. |

**Verdict: Cloudflare.** It was chosen when the repo was set up, the build
already targets it, and the free tier is absurdly generous for a personal app.

## Environment variables (important nuance)

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **baked into the app at
build time** — they are public by design (the anon key is safe to expose; all
real security lives in Supabase's Row Level Security). So:

- Local: copy `.env.example` → `.env`, fill it in, restart the dev server.
- Deploy: set them in your shell **before** `npm run deploy`:
  ```bash
  export VITE_SUPABASE_URL="https://xyz.supabase.co"
  export VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
  npm run deploy
  ```
  (Windows PowerShell: `$env:VITE_SUPABASE_URL="https://..."` etc.)
- Without them the app still works 100% offline-first on the device — it just
  has no accounts/sync, and says so in the corner instead of failing silently.

## Custom domain (optional, ~5 min)

1. Buy any domain (Cloudflare Registrar sells at cost, ~$10/yr — or anywhere).
2. Cloudflare Dashboard → Workers → your worker → Settings → Domains & Routes →
   Add Custom Domain. Done — TLS is automatic.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | SSR production build → `.output/` |
| `npm run preview:prod` | Build + run the real Worker locally (needs `wrangler login`-free local mode) |
| `npm run deploy` | Build + deploy to your `*.workers.dev` subdomain |
| `npm run deploy:name` | Same, but forces the worker name to `bloom-app` |

## Next step: make it an app

Deploying gives you a fast website. To make it **look and feel like a mobile
app** (home-screen icon, splash screen, no browser chrome — or a real store
app), read **`APP_WRAPPER.md`**. The short version: install the PWA from the
deployed URL today (free, 30 seconds), and the repo already contains a full
Capacitor iOS/Android wrapper when you want the real thing.
