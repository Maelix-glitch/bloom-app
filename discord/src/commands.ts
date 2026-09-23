/** Slash + context-menu command definitions (shared by the bot and the registrar). */
import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { FEELINGS } from "./garden.ts";

export const FLAG_COMMAND = "Flag for Groundskeepers";

export function commandDefinitions(): RESTPostAPIApplicationCommandsJSONBody[] {
  return [
    new SlashCommandBuilder()
      .setName("checkin")
      .setDescription("Tell the garden how you are today")
      .addStringOption((o) =>
        o
          .setName("feeling")
          .setDescription("The one that fits")
          .setRequired(true)
          .addChoices(...FEELINGS.map((f) => ({ name: `${f.emoji} ${f.label}`, value: f.key }))),
      )
      .addStringOption((o) => o.setName("note").setDescription("Anything you'd like to add (optional)").setMaxLength(500))
      .toJSON(),
    new SlashCommandBuilder().setName("garden").setDescription("See your own streak, days and rank (only you see it)").toJSON(),
    new SlashCommandBuilder()
      .setName("challenge")
      .setDescription("Open a new challenge for the garden")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((o) => o.setName("title").setDescription("e.g. Seven mornings of sunlight").setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName("description").setDescription("What taking part looks like").setRequired(true).setMaxLength(600))
      .addIntegerOption((o) => o.setName("days").setDescription("How many days it runs").setRequired(true).setMinValue(1).setMaxValue(60))
      .toJSON(),
    new SlashCommandBuilder()
      .setName("beta")
      .setDescription("Invite someone into the greenhouse (🧪・beta-testing) — or out of it")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
      .toJSON(),
    new ContextMenuCommandBuilder().setName(FLAG_COMMAND).setType(ApplicationCommandType.Message).toJSON(),
  ];
}
