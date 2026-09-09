/**
 * Sidecars — small structured directives a model reply can carry.
 *
 * The online coach is asked to answer in plain paragraphs. When it also needs
 * to *do* something — remember a fact about the person, forget one, or run a
 * Bloom action (create a habit, log a tracker…) — it appends one or more
 * self-contained tagged blocks after its prose. This module finds those
 * blocks, parses them, and returns the cleaned prose separately, so the UI
 * never renders raw tags and the app never guesses about intent.
 *
 * Blocks look like:
 *
 *   [BLOOM_MEMORY]{"category":"preference","text":"…"}[/BLOOM_MEMORY]
 *   [BLOOM_FORGET]{"text":"…"}[/BLOOM_FORGET]
 *   [BLOOM_TOOL]{"name":"create_habit","args":{…}}[/BLOOM_TOOL]
 *
 * Pure and side-effect free — parsing can't touch storage or the network.
 */

export type MemoryCategory = "pattern" | "preference" | "goal" | "context";

export interface MemoryDirective {
  category: MemoryCategory;
  text: string;
}

export interface ForgetDirective {
  text: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Sidecars {
  /** The reply with every sidecar block removed. */
  text: string;
  memories: MemoryDirective[];
  forgets: ForgetDirective[];
  tools: ToolCall[];
}

const BLOCK = /\[(BLOOM_MEMORY|BLOOM_FORGET|BLOOM_TOOL)\]([\s\S]*?)\[\/\1\]/g;

const CATEGORIES: MemoryCategory[] = ["pattern", "preference", "goal", "context"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBlock(kind: string, raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

/**
 * Pull every sidecar block out of a model reply. Blocks that fail to parse are
 * dropped from the result but still removed from the text, so a malformed
 * directive can never leak into what the person reads.
 */
export function parseSidecars(reply: string): Sidecars {
  const memories: MemoryDirective[] = [];
  const forgets: ForgetDirective[] = [];
  const tools: ToolCall[] = [];
  const cleaned: string[] = [];
  let cursor = 0;

  for (const match of reply.matchAll(BLOCK)) {
    if (match.index === undefined) continue;
    const before = reply.slice(cursor, match.index).trim();
    if (before) cleaned.push(before);
    cursor = match.index + match[0].length;

    const kind = match[1] ?? "";
    const payload = parseBlock(kind, match[2] ?? "");
    if (!isRecord(payload)) continue;

    if (kind === "BLOOM_MEMORY") {
      const category = CATEGORIES.includes(payload["category"] as MemoryCategory)
        ? (payload["category"] as MemoryCategory)
        : "context";
      const text = String(payload["text"] ?? "")
        .trim()
        .slice(0, 400);
      if (text) memories.push({ category, text });
    } else if (kind === "BLOOM_FORGET") {
      const text = String(payload["text"] ?? "")
        .trim()
        .slice(0, 400);
      if (text) forgets.push({ text });
    } else if (kind === "BLOOM_TOOL") {
      const name = String(payload["name"] ?? "")
        .trim()
        .slice(0, 40);
      const args = isRecord(payload["args"]) ? (payload["args"] as Record<string, unknown>) : {};
      if (name) tools.push({ name, args });
    }
  }

  const tail = reply.slice(cursor).trim();
  if (tail) cleaned.push(tail);

  const text = cleaned
    .join("\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, memories, forgets, tools };
}
