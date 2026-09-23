/**
 * A no-Discord-needed preview of the world, rendered straight from world.ts.
 *
 *   npm run preview        → http://localhost:4173
 *
 * Switch "Viewing as" to see exactly which channels a visitor, a member, a
 * beta tester or the team can see — computed from the real permission profiles.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FEELINGS, GARDEN_RANKS } from "./garden.ts";
import { PALETTE, PROFILES, ROLES, WORLD, type ChannelSpec, type EmbedSpec, type ProfileKey, type Target } from "./world.ts";

const ASSETS = resolve(import.meta.dirname, "..", "assets");
const PORT = Number(process.env["PORT"] || 4173);

type Viewer = "visitor" | "bloomer" | "beta" | "team";
const HOLDS: Record<Viewer, Target[]> = {
  visitor: ["@everyone"],
  bloomer: ["@everyone", "bloomer"],
  beta: ["@everyone", "bloomer", "beta"],
  team: ["@everyone", "bloomer", "team"],
};

/** Discord's resolution order: @everyone overwrite, then OR of role allows/denies (allow wins). */
export function can(profile: ProfileKey, viewer: Viewer, perm: string): boolean {
  const rules = PROFILES[profile];
  let v = true; // guild-level @everyone has View/Send by default
  const ev = rules.find((r) => r.target === "@everyone");
  if (ev?.deny?.includes(perm)) v = false;
  if (ev?.allow?.includes(perm)) v = true;
  const roles = rules.filter((r) => r.target !== "@everyone" && HOLDS[viewer].includes(r.target));
  const deny = roles.some((r) => r.deny?.includes(perm));
  const allow = roles.some((r) => r.allow?.includes(perm));
  if (deny) v = false;
  if (allow) v = true;
  return v;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function md(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br>");
}

function embedHtml(e: EmbedSpec): string {
  return `<div class="embed" style="--c:${hex(e.color ?? PALETTE.violet)}">
    ${e.title ? `<div class="e-title">${md(e.title)}</div>` : ""}
    <div class="e-desc">${md(e.description)}</div>
    ${(e.fields ?? []).map((f) => `<div class="e-field"><div class="e-fn">${md(f.name)}</div><div>${md(f.value)}</div></div>`).join("")}
    ${e.image ? `<img class="e-img" src="/assets/${e.image}" alt="">` : ""}
    ${e.footer ? `<div class="e-foot">${md(e.footer)}</div>` : ""}
  </div>`;
}

function panelHtml(key: string | undefined): string {
  if (key === "enter") return `<div class="btns"><button class="b green" data-act="enter">🌱 Step into the garden</button><button class="b grey">🌸 Open Bloom ↗</button></div>`;
  if (key === "roles") return `<div class="btns">${ROLES.filter((r) => r.optIn).map((r) => `<button class="b grey" data-act="toggle">${r.optIn!.emoji} ${esc(r.name)}</button>`).join("")}</div>`;
  if (key === "checkin") return `<div class="btns">${FEELINGS.map((f) => `<button class="b grey" data-act="feel" data-f="${f.key}">${f.emoji} ${f.label}</button>`).join("")}</div>`;
  if (key === "goal") return "";
  return "";
}

function sampleFor(ch: ChannelSpec): string {
  const bot = (inner: string) => `<div class="msg"><div class="av bot">🌱</div><div class="body"><div class="who">Bloom <span class="tag">APP</span> <span class="ts">Today</span></div>${inner}</div></div>`;
  const e = (desc: string, color: number, title?: string, footer?: string) => embedHtml({ description: desc, color, ...(title ? { title } : {}), ...(footer ? { footer } : {}) });
  switch (ch.purpose) {
    case "welcome":
      return bot(e("🌱  A new seed landed — welcome, <span class='mention'>@you</span>.\nWhen you're ready, the gate is in <span class='mention'>#🌱・enter-bloom</span>.", PALETTE.sage, undefined, "Seed #128"));
    case "goals":
      return bot(e(`Together we're aiming for **150 check-ins** this week.\n\n${"🌸".repeat(7)}${"🌱".repeat(5)}\n**87** / 150 · 58% · 31 gardeners`, PALETTE.amber, "🎯  This week's garden", "2026-W39 · resets Monday · counted from real check-ins only"));
    case "streaks":
      return bot(e("🔥  <span class='mention'>@juniper</span> has shown up **7 days in a row**.", PALETTE.amber)) +
        bot(e(`🌸  <span class='mention'>@juniper</span> is now **Sprout** — 7 days of showing up.\n*${GARDEN_RANKS[1]!.affirmation}*`, GARDEN_RANKS[1]!.color));
    case "challenges":
      return bot(`<div class="embed" style="--c:${hex(PALETTE.amber)}"><div class="e-title">🏆  Seven mornings of sunlight</div><div class="e-desc">Step outside within an hour of waking. Five minutes counts. Share a photo of your sky in the thread if you like.</div><div class="inline"><div><div class="e-fn">Until</div>2026-09-30</div><div><div class="e-fn">Taking part</div>24</div></div><div class="e-foot">Tap Join to take part · cheer each other on in the thread</div></div><div class="btns"><button class="b green" data-act="join">🌱 Join</button></div><div class="thread">🧵 🏆 Seven mornings of sunlight · 38 messages</div>`);
    case "analytics":
      return bot(`<div class="embed" style="--c:${hex(PALETTE.violet)}"><div class="e-title">📊  2026-09-22</div><div class="inline"><div><div class="e-fn">Joined</div>9</div><div><div class="e-fn">Entered</div>7</div><div><div class="e-fn">Left</div>1</div></div><div class="inline"><div><div class="e-fn">Check-ins</div>42</div><div><div class="e-fn">Members</div>128</div></div><div class="e-fn">Garden weather</div><div>${FEELINGS.map((f, i) => `${f.emoji} ${[12, 14, 8, 5, 3][i]}`).join("  ")}</div><div class="e-foot">Counted by the bot from real events. Nothing estimated.</div></div>`) +
        `<p class="note">Sample numbers — the real digest only ever shows counted events.</p>`;
    case "moderation":
      return bot(e("🌱 **joined** · <span class='mention'>@newbloom</span> · account created 3 years ago", PALETTE.surface)) +
        bot(e("🚩 **flag** from <span class='mention'>@maple</span>\ndiscord.com/channels/…\n> Unkind reply in #support", PALETTE.rose));
    case "wins":
      return `<div class="msg"><div class="av">🍃</div><div class="body"><div class="who">fern <span class="ts">Today</span></div>drank two glasses of water before coffee. small but i did it<div class="reacts"><span>🌸 12</span></div></div></div>`;
    case "moments":
      return `<div class="msg"><div class="av">🌻</div><div class="body"><div class="who">sol <span class="ts">Today</span></div>my week in Bloom — first time sleep's been this even 🥹<div class="thread">🧵 📸 sol's moment · 6 messages</div></div></div>`;
    default:
      return "";
  }
}

function checkinSample(): string {
  return `<div class="msg"><div class="av bot">🌱</div><div class="body"><div class="who">Bloom <span class="tag">APP</span> <span class="ts">Today</span></div>
    <div class="embed" style="--c:${hex(0xcf8fa7)}"><div class="e-author"><span class="mini">🌷</span> juniper is blooming today</div><div class="e-desc">Slept badly but went for a walk anyway. Feeling lighter.</div><div class="e-foot">🌸  day 7 in a row</div></div><div class="thread">🧵 3 replies</div></div></div>`;
}

function channelView(ch: ChannelSpec): string {
  const icon = ch.kind === "voice" ? "🔊" : ch.kind === "forum" ? "💬" : ch.kind === "announcement" ? "📣" : "#";
  const msgs = (ch.messages ?? [])
    .map((m) => `<div class="msg"><div class="av bot">🌱</div><div class="body"><div class="who">Bloom <span class="tag">APP</span>${m.pin ? ' <span class="pin">📌 pinned</span>' : ""}</div>${m.embeds.map(embedHtml).join("")}${panelHtml(m.panel)}</div></div>`)
    .join("");
  let extra = sampleFor(ch);
  if (ch.purpose === "checkin") extra = checkinSample();
  if (ch.kind === "forum") {
    extra = `<div class="forum">${(ch.tags ?? []).map((t) => `<span class="ftag">${t.emoji ?? ""} ${esc(t.name)}</span>`).join("")}</div>
      <div class="fpost"><div class="ft">Let me pick a colour for each habit</div><div class="fm"><span class="ftag">🌰 Seed</span> · 14 🌸 · 9 replies</div></div>
      <div class="fpost"><div class="ft">Weekly reflection prompt on Sundays?</div><div class="fm"><span class="ftag">🧪 Exploring</span> · 31 🌸 · 22 replies</div></div>`;
  }
  if (ch.kind === "voice") {
    const focus = ch.profile === "focus";
    extra = `<div class="voice"><div class="vbig">${esc(ch.name.split("・")[0] ?? "🔊")}</div><div class="vname">${esc(ch.name)}</div><div class="vsub">${focus ? "Silent co-working. Join, share your screen or camera, and get to it together. Microphones stay off." : "Drop in. No need to announce yourself."}${ch.userLimit ? ` · up to ${ch.userLimit}` : ""}</div></div>`;
  }
  const quiet = ch.profile === "gardenQuiet" ? `<div class="hint">Members reply in threads here — top-level posts are the garden's.</div>` : "";
  const readOnly = ch.profile === "threshold" ? `<div class="hint">Read-only for members — only the team posts here.</div>` : "";
  const midnight = ch.purpose === "midnight" ? `<div class="hint">🌙 Opens 22:00 · closes 05:00 garden time — the bot toggles posting automatically.</div>` : "";
  return `<div class="chhead"><span class="hash">${icon}</span> <b>${esc(ch.name)}</b>${ch.topic ? `<span class="topic">${esc(ch.topic)}</span>` : ""}</div>
    <div class="scroll">${msgs}${extra}${!msgs && !extra ? `<div class="empty">A room, waiting for its people.</div>` : ""}</div>
    ${ch.kind !== "voice" && ch.kind !== "forum" ? `<div class="composer">${readOnly || quiet || midnight || `<span>Message ${esc(ch.name)}</span>`}</div>` : ""}`;
}

function page(): string {
  const data = WORLD.map((cat) => ({
    name: cat.name,
    about: cat.about,
    channels: cat.channels.map((ch) => ({
      name: ch.name,
      kind: ch.kind,
      html: channelView(ch),
      see: Object.fromEntries((Object.keys(HOLDS) as Viewer[]).map((v) => [v, can(ch.profile, v, "ViewChannel")])),
    })),
  }));
  const roles = ROLES.filter((r) => r.hoist || GARDEN_RANKS.some((g) => g.name === r.name));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bloom · Discord world preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--bg:${hex(PALETTE.night)};--s1:${hex(PALETTE.surface)};--s2:#232434;--s3:#2b2c3e;--line:#303146;--fg:${hex(PALETTE.cream)};--mute:#9090a2;--faint:#6d6d82;--violet:${hex(PALETTE.violet)};--sage:${hex(PALETTE.sage)};--rose:${hex(PALETTE.rose)};--gold:${hex(PALETTE.gold)}}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#0c0d14;color:var(--fg);font:14px/1.45 Inter,system-ui,sans-serif}
.top{height:52px;display:flex;align-items:center;gap:14px;padding:0 18px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,#15101f,#0f1119)}
.top h1{font:600 17px Fraunces,serif;margin:0;letter-spacing:.01em}.top .sub{color:var(--mute);font-size:12.5px}
.seg{margin-left:auto;display:flex;gap:4px;background:var(--s1);padding:4px;border-radius:999px;border:1px solid var(--line)}
.seg button{all:unset;cursor:pointer;padding:6px 12px;border-radius:999px;color:var(--mute);font-size:12.5px}.seg button.on{background:var(--violet);color:#15131f;font-weight:600}
.app{display:grid;grid-template-columns:72px 260px 1fr 230px;height:calc(100% - 52px)}
.rail{background:#0a0b11;display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:8px}
.gicon{width:48px;height:48px;border-radius:16px;background:radial-gradient(circle at 30% 30%,#c9a8ee,#7a5bb8 60%,#3b2b63);display:grid;place-items:center;font-size:22px;box-shadow:0 0 0 2px #0a0b11,0 0 18px -2px #a590d988}
.side{background:var(--s1);display:flex;flex-direction:column;overflow:hidden;border-right:1px solid #0000}
.banner{height:118px;background:url(/assets/welcome.jpg) center/cover;position:relative;flex:none}
.banner:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0000 30%,var(--s1))}
.banner .gname{position:absolute;left:14px;bottom:8px;z-index:1;font:600 18px Fraunces,serif}
.chans{overflow:auto;padding:8px 8px 20px}
.cat{margin:16px 6px 4px;font-size:11.5px;font-weight:600;letter-spacing:.06em;color:var(--mute);text-transform:uppercase;display:flex;gap:6px;align-items:center}
.cat small{display:block;text-transform:none;letter-spacing:0;font-weight:400;color:var(--faint);font-size:11px;margin:0 6px 6px}
.ch{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;color:var(--mute);cursor:pointer;font-size:14.5px;transition:background .15s,color .15s}
.ch:hover{background:var(--s2);color:var(--fg)}.ch.on{background:var(--s3);color:var(--fg)}.ch .k{width:16px;text-align:center;opacity:.7;font-size:13px}
.ch.hidden{display:none}.ch.new{animation:bloom .7s cubic-bezier(.16,1,.3,1)}
@keyframes bloom{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
.main{background:var(--bg);display:flex;flex-direction:column;min-width:0}
.chhead{height:52px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden}
.chhead .hash{color:var(--faint);font-size:18px}.topic{color:var(--mute);font-size:13px;border-left:1px solid var(--line);padding-left:12px;overflow:hidden;text-overflow:ellipsis}
.scroll{flex:1;overflow:auto;padding:20px 18px 30px}
.msg{display:flex;gap:14px;margin:0 0 18px;max-width:760px}.av{width:40px;height:40px;border-radius:50%;background:var(--s3);display:grid;place-items:center;flex:none;font-size:18px}
.av.bot{background:radial-gradient(circle at 30% 30%,#b5dcc0,#5d8a6c)}
.body{min-width:0;flex:1}.who{font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px}.tag{background:#5865f2;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px}
.ts,.pin{color:var(--faint);font-weight:400;font-size:12px}
.embed{border-left:4px solid var(--c);background:var(--s1);border-radius:6px;padding:12px 16px 14px;margin:4px 0 6px;max-width:560px}
.e-title{font:600 16px Fraunces,serif;margin-bottom:6px}.e-desc{color:#dcd9e4}.e-field{margin-top:10px}.e-fn{font-weight:600;font-size:13px;margin-bottom:2px}
.e-img{display:block;width:100%;border-radius:6px;margin-top:12px}.e-foot{margin-top:10px;font-size:12px;color:var(--mute)}.e-author{font-weight:600;font-size:13.5px;margin-bottom:4px;display:flex;gap:6px;align-items:center}
.mini{width:22px;height:22px;border-radius:50%;background:var(--s3);display:inline-grid;place-items:center;font-size:12px}
.inline{display:flex;gap:28px;margin:8px 0}
code{background:var(--s3);padding:1px 5px;border-radius:4px;font-size:12.5px}a{color:var(--violet)}.mention{background:#a590d933;color:#d9ccff;border-radius:4px;padding:0 3px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 2px}.b{all:unset;cursor:pointer;padding:7px 14px;border-radius:8px;font-weight:500;font-size:13.5px;transition:filter .15s,transform .1s}
.b:active{transform:scale(.97)}.b:hover{filter:brightness(1.12)}.green{background:#3b7a55;color:#fff}.grey{background:var(--s3);color:var(--fg)}
.thread{margin-top:6px;color:var(--violet);font-size:13px}.reacts span{display:inline-block;margin-top:6px;background:#a590d922;border:1px solid #a590d955;border-radius:8px;padding:2px 8px;font-size:13px}
.composer{margin:0 18px 20px;padding:12px 16px;border-radius:10px;background:var(--s2);color:var(--faint)}.hint{color:var(--mute)}
.note{color:var(--faint);font-size:12px;margin:-8px 0 0 54px}.empty{color:var(--faint);padding:40px 0;text-align:center;font-style:italic}
.forum{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.ftag{background:var(--s2);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12.5px}
.fpost{background:var(--s1);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:10px;max-width:760px}.ft{font-weight:600;margin-bottom:6px}.fm{color:var(--mute);font-size:12.5px}
.voice{height:100%;display:grid;place-content:center;text-align:center;gap:6px;background:radial-gradient(ellipse at center,#a590d91a,transparent 60%)}.vbig{font-size:54px}.vname{font:600 22px Fraunces,serif}.vsub{color:var(--mute);max-width:380px}
.members{background:var(--s1);padding:18px 12px;overflow:auto}.rg{font-size:11.5px;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;margin:14px 6px 6px;font-weight:600}
.rm{display:flex;gap:10px;align-items:center;padding:5px 6px;border-radius:8px}.rm .dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--s3);font-size:14px}.rm small{display:block;color:var(--faint);font-size:11.5px}
.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--s2);border:1px solid var(--line);padding:12px 18px;border-radius:12px;opacity:0;transition:.3s cubic-bezier(.16,1,.3,1);max-width:520px;box-shadow:0 20px 50px -20px #000}
.toast.on{opacity:1;transform:translateX(-50%)}.toast .eph{display:block;color:var(--faint);font-size:11.5px;margin-top:4px}
@media (max-width:1100px){.app{grid-template-columns:72px 240px 1fr}.members{display:none}}
@media (max-width:760px){.app{grid-template-columns:1fr}.rail,.side{display:none}.side.open{display:flex;position:fixed;inset:52px 0 0;z-index:5}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body>
<div class="top"><h1>🌱 Bloom</h1><span class="sub">Discord world preview · rendered from <code>discord/src/world.ts</code></span>
<div class="seg" role="tablist" aria-label="Viewing as">
<button data-v="visitor" class="on">Before entering</button><button data-v="bloomer">Member</button><button data-v="beta">Beta Bloomer</button><button data-v="team">Bloom Team</button></div></div>
<div class="app">
<div class="rail"><div class="gicon">🌸</div></div>
<nav class="side"><div class="banner"><div class="gname">Bloom</div></div><div class="chans" id="chans"></div></nav>
<main class="main" id="main"></main>
<aside class="members">
${roles.map((r) => `<div class="rg">${esc(r.name)}</div><div class="rm"><div class="dot" style="box-shadow:0 0 0 2px ${hex(r.color || 0x9090a2)}">${r.key === "gardener" ? "🌻" : r.key === "groundskeeper" ? "🌿" : GARDEN_RANKS.find((g) => g.name === r.name) ? "🌱" : "·"}</div><div style="color:${hex(r.color || 0xf3f0ea)}">${esc(r.name)}<small>${esc(r.about)}</small></div></div>`).join("")}
</aside></div>
<div class="toast" id="toast"></div>
<script>
const WORLD=${JSON.stringify(data).replace(/</g, "\\u003c")};
let viewer="visitor",current=null;
const chans=document.getElementById("chans"),main=document.getElementById("main"),toast=document.getElementById("toast");
function kind(k){return k==="voice"?"🔊":k==="forum"?"💬":k==="announcement"?"📣":"#"}
function render(prev){
  chans.innerHTML="";const visible=[];
  for(const cat of WORLD){
    const cs=cat.channels.filter(c=>c.see[viewer]);if(!cs.length)continue;
    const h=document.createElement("div");h.innerHTML='<div class="cat">'+cat.name+'</div><small class="cat" style="margin-top:0;text-transform:none;letter-spacing:0;font-weight:400;color:var(--faint)">'+cat.about+'</small>';chans.append(h);
    for(const c of cs){visible.push(c.name);const el=document.createElement("div");el.dataset.name=c.name;el.className="ch"+(c.name===current?" on":"")+(prev&&!prev.includes(c.name)?" new":"");
      el.innerHTML='<span class="k">'+kind(c.kind)+'</span>'+c.name;el.onclick=()=>open(c.name);chans.append(el)}
  }
  if(!visible.includes(current))open(visible.find(n=>n.includes("enter-bloom"))||visible.find(n=>n.includes("welcome"))||visible[0]);
  return visible;
}
function open(name){current=name;const c=WORLD.flatMap(x=>x.channels).find(x=>x.name===name);main.innerHTML=c.html;
  document.querySelectorAll(".ch").forEach(el=>el.classList.toggle("on",el.dataset.name===name));}
function say(html){toast.innerHTML=html+'<span class="eph">👁 Only you can see this</span>';toast.classList.add("on");clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove("on"),3600)}
function setViewer(v){const prev=[...document.querySelectorAll(".ch")].map(e=>e.dataset.name);viewer=v;
  document.querySelectorAll(".seg button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));render(prev)}
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>setViewer(b.dataset.v));
main.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="enter"){if(viewer!=="visitor")return say("You're already inside. 🌿");say("🌿 <b>Welcome in.</b> The garden is open to you now. You're a <b>Seedling</b>.");setTimeout(()=>{setViewer("bloomer");open("💬・the-garden")},700)}
  if(a==="feel")say(b.textContent.trim().split(" ")[0]+" Checked in — a note box opens in Discord, then your card is posted.");
  if(a==="toggle")say(b.textContent.trim()+" added. Change your mind any time.");
  if(a==="join")say("You're in. 🌱 Good luck — go gently.");
});
render();
</script></body></html>`;
}

createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/assets/")) {
    const name = url.slice(8).replace(/[^a-z.]/g, "");
    try {
      res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "max-age=3600" }).end(readFileSync(resolve(ASSETS, name)));
    } catch {
      res.writeHead(404).end();
    }
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page());
}).listen(PORT, "0.0.0.0", () => console.log(`🌱 Preview: http://localhost:${PORT}`));
