/** Environment, read once. Fails loudly and specifically — never silently. */
import { resolve } from "node:path";

export interface Config {
  token: string;
  clientId: string;
  guildId: string;
  tz: string;
  weeklyGoal: number;
  appUrl: string | undefined;
  dataPath: string;
}

export function loadConfig(): Config {
  const env = process.env;
  const missing = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_GUILD_ID"].filter((k) => !env[k]);
  if (missing.length) {
    console.error(
      `\n🌱 Bloom Discord can't start: missing ${missing.join(", ")}.\n` +
        `   Copy discord/.env.example to discord/.env and fill it in (see discord/README.md).\n`,
    );
    process.exit(1);
  }
  const tz = env["BLOOM_TZ"] || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    console.error(`🌱 BLOOM_TZ="${tz}" is not a valid IANA timezone (e.g. Europe/London, America/New_York).`);
    process.exit(1);
  }
  const goal = Number(env["BLOOM_WEEKLY_GOAL"] || 150);
  return {
    token: env["DISCORD_TOKEN"]!,
    clientId: env["DISCORD_CLIENT_ID"]!,
    guildId: env["DISCORD_GUILD_ID"]!,
    tz,
    weeklyGoal: Number.isFinite(goal) && goal > 0 ? Math.round(goal) : 150,
    appUrl: env["BLOOM_APP_URL"] || undefined,
    dataPath: resolve(import.meta.dirname, "..", "data", "garden.json"),
  };
}
