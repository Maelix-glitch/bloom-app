/**
 * Every embed and component the garden shows. Kept in one place so the bot and
 * the setup script speak with exactly the same voice.
 */
import { resolve } from "node:path";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type APIEmbed,
} from "discord.js";
import { FEELINGS, gardenBar, type Feeling, type GardenRank, type StreakSummary, nextRank } from "./garden.ts";
import { PALETTE, ROLES, type EmbedSpec, type PanelKey } from "./world.ts";

export const ID = {
  enter: "bloom:enter",
  role: (key: string) => `bloom:role:${key}`,
  feel: (key: string) => `bloom:feel:${key}`,
  note: (key: string) => `bloom:note:${key}`,
  join: (id: string) => `bloom:join:${id}`,
  flag: (messageId: string, channelId: string) => `bloom:flag:${channelId}:${messageId}`,
} as const;

export function embed(spec: EmbedSpec): EmbedBuilder {
  const e = new EmbedBuilder().setDescription(spec.description).setColor(spec.color ?? PALETTE.violet);
  if (spec.title) e.setTitle(spec.title);
  if (spec.fields) e.addFields(spec.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline ?? false })));
  if (spec.footer) e.setFooter({ text: spec.footer });
  if (spec.image) e.setImage(`attachment://${spec.image}`);
  return e;
}

export const ASSETS_DIR = resolve(import.meta.dirname, "..", "assets");

/** Files to upload alongside a set of embeds (one per referenced banner). */
export function filesFor(specs: readonly EmbedSpec[]): AttachmentBuilder[] {
  const names = [...new Set(specs.flatMap((s) => (s.image ? [s.image] : [])))];
  return names.map((n) => new AttachmentBuilder(resolve(ASSETS_DIR, n), { name: n }));
}

/* --------------------------------- panels -------------------------------- */

export function panel(key: PanelKey, opts: { appUrl?: string | undefined } = {}): ActionRowBuilder<ButtonBuilder>[] {
  switch (key) {
    case "enter": {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(ID.enter).setLabel("Step into the garden").setEmoji("🌱").setStyle(ButtonStyle.Success),
      );
      if (opts.appUrl) {
        row.addComponents(new ButtonBuilder().setURL(opts.appUrl).setLabel("Open Bloom").setEmoji("🌸").setStyle(ButtonStyle.Link));
      }
      return [row];
    }
    case "roles":
      return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          ROLES.filter((r) => r.optIn).map((r) =>
            new ButtonBuilder().setCustomId(ID.role(r.key)).setLabel(r.name).setEmoji(r.optIn!.emoji).setStyle(ButtonStyle.Secondary),
          ),
        ),
      ];
    case "checkin":
      return checkinRows();
    case "goal":
      return [];
  }
}

export function checkinRows(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      FEELINGS.map((f) => new ButtonBuilder().setCustomId(ID.feel(f.key)).setLabel(f.label).setEmoji(f.emoji).setStyle(ButtonStyle.Secondary)),
    ),
  ];
}

export function noteModal(f: Feeling): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ID.note(f.key))
    .setTitle(`${f.emoji} ${f.label}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("note")
          .setLabel("Anything you'd like to add? (optional)")
          .setPlaceholder("Slept badly but went for a walk anyway.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500),
      ),
    );
}

export function flagModal(channelId: string, messageId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ID.flag(messageId, channelId))
    .setTitle("Flag for Groundskeepers")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("What's wrong? Only the team will see this.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500),
      ),
    );
}

/* ---------------------------------- cards -------------------------------- */

export function arrivalCard(userId: string, count: number, gateId: string | undefined): APIEmbed {
  const gate = gateId ? `<#${gateId}>` : "🌱・enter-bloom";
  return new EmbedBuilder()
    .setColor(PALETTE.sage)
    .setDescription(`🌱  A new seed landed — welcome, <@${userId}>.\nWhen you're ready, the gate is in ${gate}.`)
    .setFooter({ text: `Seed #${count}` })
    .toJSON();
}

export function enteredCard(userId: string): APIEmbed {
  return new EmbedBuilder().setColor(PALETTE.sage).setDescription(`🌿  <@${userId}> stepped into the garden. Say hello.`).toJSON();
}

export function checkinCard(opts: { userId: string; name: string; avatar: string; feeling: Feeling; note: string; streak: StreakSummary }): APIEmbed {
  const { feeling: f, streak } = opts;
  const e = new EmbedBuilder()
    .setColor(f.color)
    .setAuthor({ name: `${opts.name} is ${f.phrase} today`, iconURL: opts.avatar })
    .setFooter({ text: streak.current > 1 ? `${f.emoji}  day ${streak.current} in a row` : `${f.emoji}  checked in` });
  if (opts.note) e.setDescription(opts.note);
  return e.toJSON();
}

export function myGardenCard(opts: { name: string; streak: StreakSummary; rank: GardenRank }): APIEmbed {
  const { streak, rank } = opts;
  const next = nextRank(streak.total);
  const lines = [
    `**${rank.name}** — *${rank.affirmation}*`,
    "",
    `🌱 **${streak.total}** day${streak.total === 1 ? "" : "s"} shown up`,
    `🔥 **${streak.current}** in a row right now`,
    `🌸 **${streak.longest}** longest run`,
    "",
    streak.checkedInToday ? "✅ You've checked in today." : "🌤️ You haven't checked in today — whenever you're ready.",
  ];
  if (next) {
    lines.push("", `Next: **${next.name}** at ${next.days} days`, gardenBar(streak.total, next.days));
  }
  return new EmbedBuilder().setColor(rank.color).setTitle(`${opts.name}'s garden`).setDescription(lines.join("\n")).setFooter({ text: "Only you can see this." }).toJSON();
}

export function milestoneCard(userId: string, streak: number): APIEmbed {
  return new EmbedBuilder()
    .setColor(PALETTE.amber)
    .setDescription(`🔥  <@${userId}> has shown up **${streak} days in a row**.`)
    .toJSON();
}

export function rankCard(userId: string, rank: GardenRank): APIEmbed {
  return new EmbedBuilder()
    .setColor(rank.color)
    .setDescription(`🌸  <@${userId}> is now **${rank.name}** — ${rank.days} days of showing up.\n*${rank.affirmation}*`)
    .toJSON();
}

export function goalCard(opts: { week: string; checkins: number; goal: number; gardeners: number }): APIEmbed {
  const pct = Math.min(100, Math.round((opts.checkins / opts.goal) * 100));
  const done = opts.checkins >= opts.goal;
  return new EmbedBuilder()
    .setColor(done ? PALETTE.rose : PALETTE.amber)
    .setTitle(done ? "🌸  The garden bloomed this week" : "🎯  This week's garden")
    .setDescription(
      [
        `Together we're aiming for **${opts.goal} check-ins** this week.`,
        "",
        gardenBar(opts.checkins, opts.goal, 12),
        `**${opts.checkins}** / ${opts.goal} · ${pct}% · ${opts.gardeners} gardener${opts.gardeners === 1 ? "" : "s"}`,
      ].join("\n"),
    )
    .setFooter({ text: `${opts.week} · resets Monday · counted from real check-ins only` })
    .toJSON();
}

export function dailyPanel(dateLabel: string): APIEmbed {
  return new EmbedBuilder()
    .setColor(PALETTE.sage)
    .setTitle(`🌅  ${dateLabel}`)
    .setDescription("A new day in the garden. How are you?")
    .toJSON();
}
