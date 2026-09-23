/**
 * The garden's caretaker. Run `npm start` after `npm run setup` and
 * `npm run commands`.
 *
 * What it tends:
 *   · arrivals      — writes its own welcome in 👋・welcome (Discord's stock join message is off)
 *   · the gate      — "Step into the garden" grants Bloomer + Seedling and the gate vanishes
 *   · check-ins     — feeling buttons / /checkin → a card in 🌱・daily-check-in, streaks, ranks
 *   · streaks       — milestones and new ranks are noted in 🔥・streaks
 *   · community goal— one live card in 🎯・community-goals, edited as check-ins land
 *   · midnight      — 🌙・midnight-bloom opens at 22:00 and closes at 05:00 garden time
 *   · challenges    — /challenge posts a joinable challenge in 🏆・active-challenges
 *   · small wins    — every win gets a 🌸; every bloom-moment gets its own thread
 *   · safety        — "Flag for Groundskeepers" sends a private report to 🚨・moderation
 *   · analytics     — a daily digest of real counts in 📊・analytics
 */
import {
  ActivityType,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type Interaction,
  type ModalSubmitInteraction,
  type Role,
  type SendableChannels,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { FLAG_COMMAND } from "./commands.ts";
import { loadConfig } from "./config.ts";
import {
  FEELINGS,
  GARDEN_RANKS,
  dayKey,
  feeling,
  isMidnightOpen,
  isMilestone,
  rankForDays,
  shiftDay,
  summarize,
  weekKey,
  type Feeling,
} from "./garden.ts";
import { Store } from "./store.ts";
import {
  ID,
  arrivalCard,
  checkinCard,
  checkinRows,
  dailyPanel,
  enteredCard,
  filesFor,
  flagModal,
  goalCard,
  milestoneCard,
  myGardenCard,
  noteModal,
  rankCard,
} from "./ui.ts";
import { PALETTE, ROLES, channelFor, role, type Purpose, type RoleKey } from "./world.ts";

const cfg = loadConfig();
const store = new Store(cfg.dataPath);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.GuildMember],
  allowedMentions: { parse: [] }, // never ping by accident; opt-in pings are passed explicitly
});

const today = () => dayKey(new Date(), cfg.tz);
const ephemeral = MessageFlags.Ephemeral;

/* --------------------------------- lookups -------------------------------- */

function guild(): Guild {
  const g = client.guilds.cache.get(cfg.guildId);
  if (!g) throw new Error("The bot isn't in DISCORD_GUILD_ID. Invite it first (see README).");
  return g;
}

function channel(purpose: Purpose): SendableChannels | undefined {
  const name = channelFor(purpose).name;
  const g = guild();
  const id = store.data.channels[name];
  const ch = (id && g.channels.cache.get(id)) || g.channels.cache.find((c) => c.name === name);
  return ch && ch.isSendable() ? ch : undefined;
}

function roleOf(key: RoleKey): Role | undefined {
  const g = guild();
  const id = store.data.roles[key];
  return (id && g.roles.cache.get(id)) || g.roles.cache.find((r) => r.name === role(key).name);
}

async function send(purpose: Purpose, payload: Parameters<SendableChannels["send"]>[0]) {
  const ch = channel(purpose);
  if (!ch) {
    console.warn(`🥀 No channel for "${purpose}" — run npm run setup.`);
    return undefined;
  }
  return ch.send(payload).catch((e: Error) => console.warn(`🥀 couldn't post in ${purpose}: ${e.message}`));
}

const modLog = (description: string, color: number = PALETTE.surface) =>
  send("moderation", { embeds: [new EmbedBuilder().setColor(color).setDescription(description).setTimestamp()] });

/* --------------------------------- arrivals ------------------------------- */

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== cfg.guildId || member.user.bot) return;
  store.bump(today(), "joined");
  const gateId = store.data.channels[channelFor("gate").name];
  await send("welcome", {
    embeds: [arrivalCard(member.id, member.guild.memberCount, gateId)],
    allowedMentions: { users: [member.id] },
  });
  await modLog(`🌱 **joined** · <@${member.id}> · account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`);
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (member.guild.id !== cfg.guildId || member.user?.bot) return;
  store.bump(today(), "left");
  await modLog(`🍂 **left** · ${member.user?.tag ?? member.id}`);
});

async function enter(i: ButtonInteraction) {
  const member = i.member as GuildMember;
  const bloomer = roleOf("bloomer");
  const seedling = roleOf("seedling");
  if (!bloomer) return i.reply({ content: "The garden isn't planted yet — a Gardener needs to run setup.", flags: ephemeral });
  if (member.roles.cache.has(bloomer.id)) {
    return i.reply({ content: "You're already inside. 🌿", flags: ephemeral });
  }
  const hasRank = GARDEN_RANKS.some((r) => {
    const rr = roleOf(r.key as RoleKey);
    return rr && member.roles.cache.has(rr.id);
  });
  await member.roles.add([bloomer, ...(seedling && !hasRank ? [seedling] : [])], "Stepped into the garden");
  store.bump(today(), "entered");

  const link = (p: Purpose) => {
    const id = store.data.channels[channelFor(p).name];
    return id ? `<#${id}>` : channelFor(p).name;
  };
  const garden = guild().channels.cache.find((c) => c.name === "💬・the-garden");
  await i.reply({
    flags: ephemeral,
    embeds: [
      new EmbedBuilder()
        .setColor(PALETTE.sage)
        .setTitle("🌿  Welcome in.")
        .setDescription(
          [
            "The garden is open to you now. A few places to start:",
            "",
            `🌱 ${link("checkin")} — tell us how today is going`,
            `🌸 ${link("wins")} — share something small you did`,
            `🫶 ${link("support")} — for the heavier days`,
            `💡 ${link("ideas")} — help shape what Bloom becomes`,
            "",
            `You're a **Seedling**. Every day you check in, you grow.`,
          ].join("\n"),
        ),
    ],
  });
  if (garden?.isSendable()) {
    await garden.send({ embeds: [enteredCard(member.id)] }).catch(() => undefined);
  }
  await modLog(`🌿 **entered** · <@${member.id}>`, PALETTE.sage);
}

/* --------------------------------- opt-ins -------------------------------- */

async function toggleRole(i: ButtonInteraction, key: RoleKey) {
  const spec = ROLES.find((r) => r.key === key && r.optIn);
  const r = roleOf(key);
  if (!spec || !r) return i.reply({ content: "That role isn't set up yet.", flags: ephemeral });
  const member = i.member as GuildMember;
  const has = member.roles.cache.has(r.id);
  await (has ? member.roles.remove(r) : member.roles.add(r));
  return i.reply({
    content: has ? `${spec.optIn!.emoji} **${spec.name}** removed. Quieter now.` : `${spec.optIn!.emoji} **${spec.name}** added — ${spec.optIn!.description.toLowerCase()}.`,
    flags: ephemeral,
  });
}

/* --------------------------------- check-in ------------------------------- */

async function checkIn(i: ChatInputCommandInteraction | ModalSubmitInteraction, f: Feeling, note: string) {
  const member = i.member as GuildMember;
  const day = today();
  if (!store.checkIn(member.id, day, f.key)) {
    const s = summarize(store.member(member.id).days, day);
    return i.reply({
      content: `You've already checked in today — ${s.current > 1 ? `that's ${s.current} days in a row. ` : ""}See you tomorrow. 🌙`,
      flags: ephemeral,
    });
  }
  const rec = store.member(member.id);
  const streak = summarize(rec.days, day);
  const card = checkinCard({
    userId: member.id,
    name: member.displayName,
    avatar: member.displayAvatarURL({ size: 64 }),
    feeling: f,
    note: note.trim(),
    streak,
  });
  const posted = await send("checkin", { embeds: [card] });
  const link = posted ? ` · [see it](${posted.url})` : "";
  await i.reply({
    content: `${f.emoji} Checked in${streak.current > 1 ? ` — **${streak.current} days** in a row` : ""}.${link}`,
    flags: ephemeral,
  });

  if (isMilestone(streak.current)) {
    await send("streaks", { embeds: [milestoneCard(member.id, streak.current)] });
  }
  await syncRank(member, streak.total);
  await refreshGoal();
}

async function syncRank(member: GuildMember, total: number) {
  const rank = rankForDays(total);
  const rec = store.member(member.id);
  const want = roleOf(rank.key as RoleKey);
  const others = GARDEN_RANKS.filter((r) => r.key !== rank.key)
    .map((r) => roleOf(r.key as RoleKey))
    .filter((r): r is Role => !!r && member.roles.cache.has(r.id));
  try {
    if (others.length) await member.roles.remove(others, "Garden rank changed");
    if (want && !member.roles.cache.has(want.id)) await member.roles.add(want, "Garden rank");
  } catch (e) {
    console.warn(`🥀 couldn't update rank role: ${(e as Error).message}`);
  }
  if (rec.rank !== rank.key) {
    const firstTime = rec.rank === undefined && rank.key === "seedling";
    rec.rank = rank.key;
    store.save();
    if (!firstTime) await send("streaks", { embeds: [rankCard(member.id, rank)] });
  }
}

/* ------------------------------ community goal ---------------------------- */

function weekDays(day: string): string[] {
  const wk = weekKey(day);
  const out: string[] = [];
  for (let n = -6; n <= 6; n++) {
    const d = shiftDay(day, n);
    if (weekKey(d) === wk) out.push(d);
  }
  return out;
}

async function refreshGoal() {
  const at = store.data.posted["goals.weekly"];
  if (!at) return;
  const ch = guild().channels.cache.get(at.channelId);
  if (!ch?.isTextBased()) return;
  const msg = await ch.messages.fetch(at.messageId).catch(() => null);
  if (!msg) return;
  const day = today();
  const days = weekDays(day);
  await msg
    .edit({ embeds: [goalCard({ week: weekKey(day), checkins: store.checkinsOn(days), goal: cfg.weeklyGoal, gardeners: store.gardenersOn(days) })] })
    .catch(() => undefined);
}

/* -------------------------------- challenges ------------------------------ */

function challengeEmbed(c: { title: string; description: string; ends: string; participants: string[] }) {
  return new EmbedBuilder()
    .setColor(PALETTE.amber)
    .setTitle(`🏆  ${c.title}`)
    .setDescription(c.description)
    .addFields(
      { name: "Until", value: c.ends, inline: true },
      { name: "Taking part", value: `${c.participants.length}`, inline: true },
    )
    .setFooter({ text: "Tap Join to take part · cheer each other on in the thread" });
}

async function openChallenge(i: ChatInputCommandInteraction) {
  const title = i.options.getString("title", true);
  const description = i.options.getString("description", true);
  const days = i.options.getInteger("days", true);
  const ends = shiftDay(today(), days - 1);
  const id = Date.now().toString(36);
  const challenger = roleOf("challenger");
  const draft = { title, description, ends, participants: [] as string[] };
  const msg = await send("challenges", {
    content: challenger ? `<@&${challenger.id}> a new challenge is open.` : undefined,
    allowedMentions: challenger ? { roles: [challenger.id] } : { parse: [] },
    embeds: [challengeEmbed(draft)],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(ID.join(id)).setLabel("Join").setEmoji("🌱").setStyle(ButtonStyle.Success),
      ),
    ],
  });
  if (!msg) return i.reply({ content: "Couldn't find 🏆・active-challenges — run setup.", flags: ephemeral });
  await msg.startThread({ name: `🏆 ${title}`.slice(0, 100) }).catch(() => undefined);
  store.data.challenges[id] = { id, ...draft, channelId: msg.channelId, messageId: msg.id };
  store.save();
  return i.reply({ content: `Challenge opened: ${msg.url}`, flags: ephemeral });
}

async function joinChallenge(i: ButtonInteraction, id: string) {
  const c = store.data.challenges[id];
  if (!c) return i.reply({ content: "This challenge has closed.", flags: ephemeral });
  if (c.ends < today()) return i.reply({ content: "This challenge has ended — thank you to everyone who took part.", flags: ephemeral });
  const idx = c.participants.indexOf(i.user.id);
  if (idx >= 0) c.participants.splice(idx, 1);
  else c.participants.push(i.user.id);
  store.save();
  await i.update({ embeds: [challengeEmbed(c)] });
  await i.followUp({ content: idx >= 0 ? "You've stepped out of this one. That's okay." : "You're in. 🌱 Good luck — go gently.", flags: ephemeral });
}

/* ---------------------------------- rhythm -------------------------------- */

/** Runs every minute: midnight garden, day rollover, digest, challenge endings. */
async function tick() {
  const now = new Date();
  const day = dayKey(now, cfg.tz);

  // 🌙 midnight-bloom
  const open = isMidnightOpen(now, cfg.tz);
  if (store.data.midnightOpen !== open) {
    const ch = channel("midnight");
    const bloomer = roleOf("bloomer");
    if (ch && "permissionOverwrites" in ch && bloomer) {
      await ch.permissionOverwrites.edit(bloomer, { SendMessages: open, SendMessagesInThreads: open }).catch(() => undefined);
      const owl = roleOf("night-owl");
      await ch
        .send(
          open
            ? {
                content: owl ? `<@&${owl.id}>` : undefined,
                allowedMentions: owl ? { roles: [owl.id] } : { parse: [] },
                embeds: [
                  new EmbedBuilder()
                    .setColor(PALETTE.violet)
                    .setDescription("🌙  The lanterns are on. The midnight garden is open until 05:00.")
                    .setImage("attachment://midnight.jpg"),
                ],
                files: filesFor([{ description: "", image: "midnight.jpg" }]),
              }
            : { embeds: [new EmbedBuilder().setColor(PALETTE.gold).setDescription("🌅  Morning. The midnight garden closes until 22:00 — sleep well, if you still can.")] },
        )
        .catch(() => undefined);
    }
    store.data.midnightOpen = open;
    store.save();
  }

  // 🌅 new day → a fresh check-in prompt, and yesterday's digest for the team
  if (store.data.lastDigest !== day) {
    const yesterday = shiftDay(day, -1);
    if (store.data.lastDigest !== undefined) {
      await postDigest(yesterday);
      const label = new Intl.DateTimeFormat("en-GB", { timeZone: cfg.tz, weekday: "long", day: "numeric", month: "long" }).format(now);
      await send("checkin", { embeds: [dailyPanel(label)], components: checkinRows() });
      await closeChallenges(yesterday);
      await refreshGoal();
    }
    store.data.lastDigest = day;
    store.save();
  }
}

async function postDigest(day: string) {
  const d = store.data.days[day] ?? { checkins: 0, entered: 0, joined: 0, left: 0, feelings: {} };
  const weather = FEELINGS.map((f) => `${f.emoji} ${d.feelings[f.key] ?? 0}`).join("  ");
  await send("analytics", {
    embeds: [
      new EmbedBuilder()
        .setColor(PALETTE.violet)
        .setTitle(`📊  ${day}`)
        .addFields(
          { name: "Joined", value: `${d.joined}`, inline: true },
          { name: "Entered", value: `${d.entered}`, inline: true },
          { name: "Left", value: `${d.left}`, inline: true },
          { name: "Check-ins", value: `${d.checkins}`, inline: true },
          { name: "Members", value: `${guild().memberCount}`, inline: true },
          { name: "Garden weather", value: weather },
        )
        .setFooter({ text: "Counted by the bot from real events. Nothing estimated." }),
    ],
  });
}

async function closeChallenges(yesterday: string) {
  for (const c of Object.values(store.data.challenges)) {
    if (c.ends !== yesterday) continue;
    await send("challenges", {
      embeds: [
        new EmbedBuilder()
          .setColor(PALETTE.rose)
          .setDescription(`🌸  **${c.title}** has ended. ${c.participants.length} of you took part — thank you for growing together.`),
      ],
    });
  }
}

/* -------------------------------- messages -------------------------------- */

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.inGuild() || msg.author.bot || msg.guildId !== cfg.guildId) return;
  const name = "name" in msg.channel ? msg.channel.name : "";
  if (name === channelFor("wins").name) {
    await msg.react("🌸").catch(() => undefined);
  } else if (name === channelFor("moments").name && msg.channel.type === ChannelType.GuildText) {
    await msg.startThread({ name: `📸 ${msg.member?.displayName ?? msg.author.username}'s moment`.slice(0, 100) }).catch(() => undefined);
  }
});

/* ------------------------------- interactions ----------------------------- */

async function route(i: Interaction) {
  if (!i.inCachedGuild() || i.guildId !== cfg.guildId) return;

  if (i.isButton()) {
    const [, kind, arg] = i.customId.split(":");
    if (i.customId === ID.enter) return enter(i);
    if (kind === "role" && arg) return toggleRole(i, arg as RoleKey);
    if (kind === "feel" && arg) {
      const f = feeling(arg);
      if (!f) return;
      if (summarize(store.member(i.user.id).days, today()).checkedInToday) {
        return i.reply({ content: "You've already checked in today. See you tomorrow. 🌙", flags: ephemeral });
      }
      return i.showModal(noteModal(f));
    }
    if (kind === "join" && arg) return joinChallenge(i, arg);
    return;
  }

  if (i.isModalSubmit()) {
    const parts = i.customId.split(":");
    if (parts[1] === "note") {
      const f = feeling(parts[2] ?? "");
      if (f) return checkIn(i, f, i.fields.getTextInputValue("note"));
    }
    if (parts[1] === "flag") {
      const [, , channelId, messageId] = parts;
      const reason = i.fields.getTextInputValue("reason").trim() || "_no reason given_";
      await modLog(
        `🚩 **flag** from <@${i.user.id}>\nhttps://discord.com/channels/${i.guildId}/${channelId}/${messageId}\n> ${reason.replace(/\n/g, "\n> ")}`,
        PALETTE.rose,
      );
      return i.reply({ content: "Thank you. The Groundskeepers will take a gentle look. 🌿", flags: ephemeral });
    }
    return;
  }

  if (i.isMessageContextMenuCommand() && i.commandName === FLAG_COMMAND) {
    return i.showModal(flagModal(i.targetMessage.channelId, i.targetMessage.id));
  }

  if (i.isChatInputCommand()) {
    const member = i.member;
    const inside = (() => {
      const b = roleOf("bloomer");
      return !b || member.roles.cache.has(b.id);
    })();
    switch (i.commandName) {
      case "checkin": {
        if (!inside) return i.reply({ content: "Step through 🌱・enter-bloom first — then the garden's yours.", flags: ephemeral });
        const f = feeling(i.options.getString("feeling", true));
        if (!f) return;
        return checkIn(i, f, i.options.getString("note") ?? "");
      }
      case "garden": {
        const s = summarize(store.member(i.user.id).days, today());
        return i.reply({ embeds: [myGardenCard({ name: member.displayName, streak: s, rank: rankForDays(s.total) })], flags: ephemeral });
      }
      case "challenge":
        return openChallenge(i);
      case "beta": {
        const target = i.options.getMember("member");
        const beta = roleOf("beta");
        if (!target || !beta) return i.reply({ content: "Couldn't find that member or the Beta Bloomer role.", flags: ephemeral });
        const has = target.roles.cache.has(beta.id);
        await (has ? target.roles.remove(beta) : target.roles.add(beta));
        if (!has) {
          await send("beta", {
            content: `🧪 Welcome to the greenhouse, <@${target.id}>.`,
            allowedMentions: { users: [target.id] },
          });
        }
        return i.reply({ content: has ? `${target.displayName} left the greenhouse.` : `${target.displayName} is now a Beta Bloomer.`, flags: ephemeral });
      }
    }
  }
}

client.on(Events.InteractionCreate, (i) => {
  route(i).catch(async (e: Error) => {
    console.error("🥀", e);
    if (i.isRepliable() && !i.replied && !i.deferred) {
      await i.reply({ content: "Something went wrong on our side — the Groundskeepers have been told.", flags: ephemeral }).catch(() => undefined);
    }
  });
});

/* ---------------------------------- start --------------------------------- */

client.once(Events.ClientReady, async (c) => {
  console.log(`🌱 ${c.user.tag} is tending the garden (tz ${cfg.tz}).`);
  c.user.setActivity({ name: "the garden grow", type: ActivityType.Watching });
  const g = guild();
  await g.channels.fetch();
  await g.roles.fetch();
  await refreshGoal();
  await tick().catch((e: Error) => console.error("🥀 tick", e));
  setInterval(() => void tick().catch((e: Error) => console.error("🥀 tick", e)), 60_000);
});

await client.login(cfg.token);
