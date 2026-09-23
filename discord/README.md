# 🌱 Bloom — Discord

When someone joins, they shouldn't land in "a Discord server with Bloom branding." They should land at the **edge of the garden**.

This folder has everything for that:

- **the world**: every category, channel, role, permission and pinned message, written as data in [`src/world.ts`](src/world.ts)
- **setup**: makes a real server match that data. Safe to run again and again.
- **the bot**: the thing that keeps the world alive (arrivals, the gate, check-ins, streaks, the midnight garden, challenges, safety, analytics)
- **a preview**: walk through the whole world in a browser, no Discord needed

It's a separate package (with its own `package.json` and `node_modules`), so it doesn't touch the web app's build.

---

## How it feels

```
 visitor joins  ─▶  sees only ✦ START HERE
                    👋 welcome        "You found the garden."   (banner art)
                    🌱 enter-bloom    the gate: [🌱 Step into the garden]
                    📖 guide · 📜 rules · 📢 announcements

   presses the button  ─▶  gets Bloomer + Seedling
                           the gate disappears, the rest of the garden appears
                           a private "Welcome in." pointing to where to start
                           a soft "stepped into the garden" in 💬 the-garden
```

Discord's stock "X just slid into the server!" messages are switched off. Bloom writes its own arrival message in its own voice.

| Place | What's alive there |
| --- | --- |
| 👋・welcome | Bloom greets every new person by name, with their seed number |
| 🌱・enter-bloom | The gate. One button, then it disappears for you |
| 📖・the-bloom-guide | A map of the garden and the rank path, plus opt-in buttons: 🌙 Night Owl · 🏆 Challenger · 🧠 Lab Notes |
| 🌱・daily-check-in | Five feelings: 🌸 Blooming · 🌿 Steady · 🌱 Growing · 🌧️ Cloudy · 🌙 Resting. Pick one, add a note if you want, and a card is posted. Replies go in threads. A fresh prompt appears every morning |
| 🌸・small-wins | Every post gets a 🌸 |
| 🫶・support | Slowmode on. Pinned care guidelines and a helpline link. Clearly marked as peer support, not a crisis service |
| 📸・bloom-moments | Every post gets its own thread |
| 💡 ideas · 🐛 bugs · ⚙️ features | Forums with status tags (Seed → Planted, New → Fixed, Requested → Shipped) |
| 🧪・beta-testing | Only visible to Beta Bloomers. `/beta @user` lets people in or out |
| 🏆・active-challenges | `/challenge` posts a challenge people can join, with its own thread, and pings Challengers |
| 🔥・streaks | Streak milestones (3, 7, 14, 30…) and new ranks |
| 🌙・midnight-bloom | **Only open 22:00–05:00** garden time. The bot opens and closes it and gives Night Owls a soft ping |
| 🎯・community-goals | One live card showing the week's check-ins against a shared goal, updated as people check in |
| 🎧・Focus Room | Members can join, stream and use cameras, but can't unmute. Silent co-working |
| 📊・analytics | A daily digest for the team: joined / entered / left / check-ins / feelings. Only real counts |
| 🚨・moderation | Joins, entries, leaves, and **Flag for Groundskeepers** reports (right-click a message → Apps) |

**Garden ranks** use names from the app's own ladder, but they count *days you showed up*, not points:
Seedling → Sprout (7) → Budding (30) → In Bloom (100) → Evergreen (365). A rank is never taken away. Missing a day resets your current run and nothing else. There's no public leaderboard, on purpose.

**Roles:** Gardener (team) · Groundskeeper (mods) · the five ranks · Beta Bloomer · three opt-in ping roles · Bloomer (means you've entered).

---

## Setup (about 10 minutes)

### 1. Create the app
1. Go to <https://discord.com/developers/applications> → **New Application** → name it **Bloom**.
   Use the Bloom icon (`public/bloom/icons/icon-512.png`) as the avatar.
2. **Bot** tab → **Reset Token** → copy it.
   Under **Privileged Gateway Intents**, turn on **Server Members Intent**. That's the only one it needs. It never reads what people write.
3. **General Information** → copy the **Application ID**.

### 2. Invite it
Open this URL, with your Application ID in place of `APP_ID`:

```
https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot+applications.commands&permissions=8
```

`permissions=8` is Administrator. Setup needs it to create channels and roles. After setup you can swap it for a narrower role: Manage Roles, Manage Channels, Manage Messages, Manage Threads, Send Messages, Embed Links, Attach Files, Add Reactions, Mention Everyone, Create Public Threads.

Then go to **Server Settings → Roles** and drag the **Bloom** role to the top.

For forums and an announcement channel, turn on **Community** in Server Settings. Without it, setup still works and uses text channels for those instead.

### 3. Configure and run

```bash
cd discord
npm install
cp .env.example .env      # fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, BLOOM_TZ
npm run setup:dry         # see what would change
npm run setup             # build the world
npm run commands          # register /checkin /garden /challenge /beta + Flag
npm start                 # keep this running
```

Needs Node 22.18 or newer, which runs TypeScript directly with no build step.

Finally, give yourself **Gardener**. Setup doesn't hand out team roles.

### Running it for real
`npm start` has to stay running, because the midnight garden, arrivals and check-ins depend on it. Anything that runs Node works: a small VPS with `pm2 start "npm start" --name bloom-discord`, Railway, Fly.io, or a Raspberry Pi.

Garden data (check-in days, counts) lives in `discord/data/garden.json`. It's ignored by git, so back it up. Notes people type with a check-in are posted to the channel and never stored.

---

## Changing the world

Everything is in [`src/world.ts`](src/world.ts). To rename a channel, rewrite the welcome, add a forum tag or change who sees what, edit it and run `npm run setup` again.

- Existing channels and roles are matched by name and updated in place.
- Pinned world messages are **edited**, not posted again.
- Setup never deletes anything. Channels that aren't in the blueprint are listed so you can decide.
- If you *rename* a channel in `world.ts`, setup creates a new one. Delete the old one by hand.

Preview any change first:

```bash
npm run preview   # http://localhost:4173
```

Use the **"Before entering / Member / Beta Bloomer / Bloom Team"** switch to see exactly which channels each person gets. It's calculated from the same permission rules setup applies. Press **Step into the garden** to walk through the entrance.

## Scripts

| | |
| --- | --- |
| `npm run setup` / `setup:dry` | Build or update the server from `world.ts` |
| `npm run commands` | Register the slash and context-menu commands |
| `npm start` | Run the bot |
| `npm run preview` | Browser preview of the world |
| `npm test` | Garden logic and blueprint checks (Discord limits, permissions) |
| `npm run typecheck` | `tsc` |

## Principles (same as the app)
- **Nothing is invented.** Streaks, ranks, goals and analytics come only from what the bot actually saw happen.
- **Quiet by default.** No @everyone. Pings only go to people who opted in. Your own stats (`/garden`) are visible only to you.
- **Gentle.** Missing a day never takes anything away.
- **Safe.** Support is clearly peer support, with a real helpline link and a private way to flag messages.
