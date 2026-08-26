# Bloom — Shared Habit & Wellness Tracker

A personal wellness tracking app for couples with competitive features, daily challenges, cycle/mood tracking, and a points/reward system.

## Project Structure

```
bloom-app/
├── index.html              Main app entry point
├── css/
│   ├── main.css           Design system & base styles
│   └── auth.css           Authentication screen styles
├── js/
│   └── auth.js            Supabase connection & auth logic
└── assets/                (Future: images, icons)
```

## Setup Instructions

### Step 1: Get Supabase Credentials

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings → API** in your project dashboard
4. Copy:
   - **Project URL** (looks like `https://YOUR_PROJECT.supabase.co`)
   - **Public API Key (anon)** (the `public` key, NOT the `service_role` key)

### Step 2: Configure the App

Edit `js/auth.js` and replace these placeholders with your actual credentials:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
```

**Important**: Only the public anon key is safe to commit. Never hardcode the service_role key or any secret keys.

### Step 3: Customize Profile Names (Optional)

In `js/auth.js`, update the profile names:

```javascript
const PROFILES = {
  profile1: 'Alex',      // Change these to your names
  profile2: 'Jordan',    // e.g., 'Partner 1', 'Partner 2', or actual names
};
```

Update the corresponding HTML placeholders in `index.html`:
- `id="profile1-name"` → Your first profile name
- `id="profile2-name"` → Your second profile name

### Step 4: Run the App

Open `index.html` in your browser (you can use `python -m http.server` or any local server).

---

## What to Test for Step 1

### ✅ Visual Load

- [ ] Page loads with clean, dark design
- [ ] Bloom logo and heading render correctly with gradient
- [ ] "Who's using Bloom right now?" prompt is visible
- [ ] Two profile selection buttons show the correct names
- [ ] Email input field is visible
- [ ] "Send magic link" button is visible

### ✅ Supabase Connection

- [ ] Open browser console (F12 → Console tab)
- [ ] Should see: `✓ Supabase client initialized`
- [ ] Should NOT see any red errors about credentials

### ✅ Profile Selection & Auth

1. **Select a profile** (click Alex or Jordan button)
   - Button should change color (primary amber → active state)
   - Check console: should log the selected profile name

2. **Enter your email** and click "Send magic link"
   - Should see "Sending magic link..." briefly
   - Then: "✓ Check your email for a sign-in link"
   - Check your email inbox for a Supabase magic link

3. **Click the magic link** in your email
   - Should redirect back to the app
   - Should see the "✓ Connected to Supabase" welcome screen
   - Header should show your selected profile name
   - Console should log: `✓ User signed in: [your@email.com]`

### ✅ Persistence

1. **Reload the page** (Cmd/Ctrl + R)
   - Should stay on the app screen (NOT show auth screen again)
   - Profile name should still be visible
   - Console should log: `✓ Existing session found`

2. **Click "Sign out"** button
   - Should return to auth screen
   - localStorage should be cleared
   - Should start fresh next time

### ✅ Console Logs (Expected Output)

When everything works, console should show:
```
✓ Supabase client initialized
No active session
Profile selected: [Your Profile Name]
✓ Magic link sent to: your@email.com
✓ User signed in: your@email.com
✓ Connected to Supabase
✓ Existing session found: your@email.com (on reload)
```

### ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Red error in console about Supabase | Check your URL and API key in `js/auth.js` — copy again from Supabase dashboard |
| "Connection failed" error message | Click to dismiss, then check browser console for details |
| Magic link not arriving | Check spam folder; Supabase emails sometimes get filtered |
| Page stays on auth screen after clicking magic link | Session might not have synced — wait 2-3 seconds and reload manually |

---

## Design System Applied

- **Colors**: Amber (primary actions), Sage (success), Rose (mood/cycle), Sky (sleep)
- **Typography**: Fraunces (headings), Inter (body), IBM Plex Mono (data/numbers)
- **Spacing**: CSS variables (space-1 through space-9)
- **Animations**: Staggered entrance, smooth hover effects, accessibility-first (respects `prefers-reduced-motion`)

---

## Next Steps (Step 2)

Once Step 1 is verified:
- Core Habits feature (create, check off, streaks)
- Daily progress tracking
- Basic data persistence to Supabase

---

## Notes for Development

- **Never commit real credentials** — use environment variables or `.env.local` in production
- **Test in incognito/private mode** to verify fresh sessions
- **Check browser console** frequently — logs are very detailed
- **Supabase Auth uses magic links** — no password required
- **Profile selection is stored locally** — allows quick switching between two users on same device
