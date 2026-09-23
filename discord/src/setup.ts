/**
 * Makes a real Discord server match the blueprint in world.ts.
 *
 *   npm run setup          apply
 *   npm run setup:dry      print what would change, touch nothing
 *
 * Idempotent: run it as often as you like. Existing roles/channels are matched
 * by name and updated in place; world messages are edited, not re-posted.
 * Nothing that isn't in the blueprint is ever deleted — extras are listed so a
 * human can decide.
 */
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildFeature,
  GuildSystemChannelFlags,
  type CategoryChannel,
  type GuildBasedChannel,
  type Role,
} from "discord.js";
import { loadConfig } from "./config.ts";
import { bits, overwrites, type Ids } from "./permissions.ts";
import { Store } from "./store.ts";
import { embed, filesFor, panel } from "./ui.ts";
import { ROLES, WORLD, type ChannelSpec } from "./world.ts";

const dry = process.argv.includes("--dry-run");
const log = (icon: string, msg: string) => console.log(`${icon}  ${msg}`);

const cfg = loadConfig();
const store = new Store(cfg.dataPath);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await client.login(cfg.token);
await new Promise<void>((r) => client.once("clientReady", () => r()));
const guild = await client.guilds.fetch(cfg.guildId);
await guild.channels.fetch();
await guild.roles.fetch();
const me = await guild.members.fetchMe();

console.log(`\n🌱 Tending "${guild.name}"${dry ? " (dry run — nothing will change)" : ""}\n`);

const community = guild.features.includes(GuildFeature.Community);
if (!community) {
  log("ℹ️", "Server isn't a Community server — forums become text channels and announcements become text.");
  log("  ", "Enable Community in Server Settings for the full experience, then run setup again.");
}

/* ---------------------------------- roles --------------------------------- */

async function ensureRoles(): Promise<Record<string, Role>> {
  const out: Record<string, Role> = {};
  for (const spec of ROLES) {
    const existing = guild.roles.cache.find((r) => r.name === spec.name);
    const data = {
      name: spec.name,
      color: spec.color,
      hoist: spec.hoist,
      mentionable: spec.mentionable,
      permissions: bits(spec.permissions),
    };
    if (existing) {
      if (existing.position >= me.roles.highest.position) {
        log("⚠️", `Role "${spec.name}" sits above the bot's role — drag the bot's role to the top and re-run.`);
        out[spec.key] = existing;
        continue;
      }
      const changed =
        existing.color !== data.color || existing.hoist !== data.hoist || existing.mentionable !== data.mentionable || existing.permissions.bitfield !== data.permissions;
      if (changed) {
        log("🔁", `role ${spec.name}`);
        out[spec.key] = dry ? existing : await existing.edit(data);
      } else out[spec.key] = existing;
    } else {
      log("🌱", `role ${spec.name}`);
      if (!dry) out[spec.key] = await guild.roles.create({ ...data, reason: "Bloom world setup" });
    }
  }
  // Order: blueprint top → bottom, directly beneath the bot's own role.
  if (!dry) {
    const top = me.roles.highest.position;
    const positions = ROLES.map((s, i) => ({ role: out[s.key]!.id, position: Math.max(1, top - 1 - i) }));
    await guild.roles.setPositions(positions).catch((e: Error) => log("⚠️", `couldn't order roles: ${e.message}`));
  }
  return out;
}

/* -------------------------------- channels -------------------------------- */

function discordType(spec: ChannelSpec): ChannelType.GuildText | ChannelType.GuildAnnouncement | ChannelType.GuildForum | ChannelType.GuildVoice {
  if (spec.kind === "voice") return ChannelType.GuildVoice;
  if (spec.kind === "forum" && community) return ChannelType.GuildForum;
  if (spec.kind === "announcement" && community) return ChannelType.GuildAnnouncement;
  return ChannelType.GuildText;
}

async function ensureWorld(ids: Ids): Promise<void> {
  const seen = new Set<string>();
  let categoryIndex = 0;
  for (const cat of WORLD) {
    let category = guild.channels.cache.find((c): c is CategoryChannel => c.type === ChannelType.GuildCategory && c.name === cat.name);
    const catOverwrites = overwrites(cat.profile, ids, "category");
    if (!category) {
      log("🌿", `category ${cat.name}`);
      if (!dry) category = await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory, permissionOverwrites: catOverwrites, position: categoryIndex });
    } else if (!dry) {
      await category.edit({ permissionOverwrites: catOverwrites, position: categoryIndex });
    }
    if (category) seen.add(category.id);
    categoryIndex++;

    let position = 0;
    for (const spec of cat.channels) {
      const type = discordType(spec);
      const kind = spec.kind === "voice" ? "voice" : "text";
      const perms = overwrites(spec.profile, ids, kind);
      const existing = guild.channels.cache.find((c) => c.name === spec.name && (c.parentId === category?.id || !c.parentId));
      const common = {
        name: spec.name,
        parent: category?.id ?? null,
        permissionOverwrites: perms,
        position,
        ...(spec.topic && kind === "text" ? { topic: spec.topic } : {}),
        ...(spec.slowmode ? { rateLimitPerUser: spec.slowmode } : {}),
        ...(spec.userLimit ? { userLimit: spec.userLimit } : {}),
        ...(type === ChannelType.GuildForum && spec.tags ? { availableTags: spec.tags.map((t) => ({ name: t.name, emoji: t.emoji ? { id: null, name: t.emoji } : null, moderated: false })) } : {}),
      };
      let channel: GuildBasedChannel | undefined = existing;
      if (existing && existing.type !== type) {
        log("⚠️", `${spec.name} exists as a different channel type — left alone. Delete it and re-run to recreate.`);
      } else if (existing) {
        log("·", `${spec.name}`);
        if (!dry) channel = await (existing as Extract<GuildBasedChannel, { edit: unknown }>).edit(common as never);
      } else {
        log("🌱", `${spec.name}`);
        if (!dry) channel = await guild.channels.create({ ...common, type } as never);
      }
      if (channel) {
        seen.add(channel.id);
        store.data.channels[spec.name] = channel.id;
        if (!dry) await postMessages(spec, channel);
      }
      position++;
    }
  }

  const extras = guild.channels.cache.filter((c) => !seen.has(c.id) && !c.isThread());
  if (extras.size) {
    console.log("\nNot in the blueprint (left untouched — delete by hand if unwanted):");
    for (const c of extras.values()) console.log(`   · ${c.name}`);
  }
}

async function postMessages(spec: ChannelSpec, channel: GuildBasedChannel): Promise<void> {
  if (!spec.messages?.length || !channel.isTextBased()) return;
  for (const m of spec.messages) {
    const payload = {
      embeds: m.embeds.map(embed),
      files: filesFor(m.embeds),
      attachments: [],
      components: m.panel ? panel(m.panel, { appUrl: cfg.appUrl }) : [],
    };
    const prior = store.data.posted[m.id];
    if (prior?.channelId === channel.id) {
      const msg = await channel.messages.fetch(prior.messageId).catch(() => null);
      if (msg) {
        // The goal card is owned by the live bot once it runs; don't overwrite its numbers.
        if (m.panel !== "goal") await msg.edit(payload);
        continue;
      }
    }
    const sent = await channel.send(payload);
    if (m.pin) await sent.pin().catch(() => undefined);
    store.data.posted[m.id] = { channelId: channel.id, messageId: sent.id };
    log("✉️", `posted ${m.id} in ${spec.name}`);
  }
}

/* ---------------------------------- server -------------------------------- */

async function ensureServer(): Promise<void> {
  const rules = guild.channels.cache.get(store.data.channels["📜・rules"] ?? "");
  const mod = guild.channels.cache.get(store.data.channels["🚨・moderation"] ?? "");
  if (dry) return;
  await guild
    .edit({
      // Bloom writes its own arrivals in 👋・welcome; Discord's stock join messages would break the spell.
      systemChannel: null,
      systemChannelFlags: [GuildSystemChannelFlags.SuppressJoinNotifications, GuildSystemChannelFlags.SuppressJoinNotificationReplies],
      ...(community && rules ? { rulesChannel: rules.id } : {}),
      ...(community && mod ? { publicUpdatesChannel: mod.id } : {}),
    })
    .catch((e: Error) => log("⚠️", `server settings: ${e.message}`));
}

/* ----------------------------------- run ---------------------------------- */

try {
  const roles = await ensureRoles();
  if (dry && Object.keys(roles).length < ROLES.length) {
    log("ℹ️", "Some roles don't exist yet, so channel permissions can't be previewed. Run without --dry-run.");
  } else {
    const ids: Ids = {
      everyone: guild.roles.everyone.id,
      bloomer: roles["bloomer"]!.id,
      beta: roles["beta"]!.id,
      gardener: roles["gardener"]!.id,
      groundskeeper: roles["groundskeeper"]!.id,
      bot: me.id,
    };
    for (const [k, r] of Object.entries(roles)) store.data.roles[k] = r.id;
    await ensureWorld(ids);
    // Setup rewrites channel permissions, so let the bot re-apply the midnight state on its next tick.
    delete store.data.midnightOpen;
    await ensureServer();
  }
  if (!dry) store.save();
  console.log(`\n🌸 ${dry ? "Dry run complete." : "The garden is ready."}\n`);
} catch (e) {
  console.error("\n🥀 Setup stopped:", (e as Error).message);
  if ((e as { code?: number }).code === 50013) {
    console.error("   The bot is missing permissions. Invite it with Administrator (see README), or move its role to the top.");
  }
  process.exitCode = 1;
} finally {
  await client.destroy();
}

