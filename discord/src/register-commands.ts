/** Registers the garden's commands on your server (instant, guild-scoped). */
import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./commands.ts";
import { loadConfig } from "./config.ts";

const cfg = loadConfig();
const rest = new REST().setToken(cfg.token);
const body = commandDefinitions();
await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body });
console.log(`🌱 Registered ${body.length} commands on the garden.`);
