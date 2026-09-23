/** The blueprint must be something Discord will actually accept. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { commandDefinitions } from "../src/commands.ts";
import { bits, overwrites, type Ids } from "../src/permissions.ts";
import { panel, embed } from "../src/ui.ts";
import { PROFILES, ROLES, WORLD, allChannels, channelFor, type Purpose } from "../src/world.ts";

const ids: Ids = { everyone: "1", bloomer: "2", beta: "3", gardener: "4", groundskeeper: "5", bot: "6" };

test("matches the requested structure exactly", () => {
  assert.deepEqual(
    WORLD.map((c) => c.name),
    ["✦ START HERE", "🌿 THE GARDEN", "🧠 BLOOM LAB", "🏆 CHALLENGES", "🎮 AFTER HOURS", "🎙️ GATHER", "🔒 BLOOM TEAM"],
  );
  assert.equal(allChannels().length, 32);
  assert.deepEqual(
    WORLD.find((c) => c.name === "🎙️ GATHER")!.channels.map((c) => c.kind),
    ["voice", "voice", "voice", "voice"],
  );
});

test("channel names are unique and within Discord limits", () => {
  const names = allChannels().map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
  for (const c of allChannels()) {
    assert.ok(c.name.length <= 100, c.name);
    if (c.topic) assert.ok(c.topic.length <= 1024, `${c.name} topic`);
    if (c.tags) assert.ok(c.tags.length <= 20, `${c.name} tags`);
  }
  for (const c of WORLD) assert.ok(c.channels.length <= 50);
});

test("every purpose the bot relies on maps to one channel", () => {
  const purposes: Purpose[] = ["welcome", "gate", "checkin", "wins", "moments", "streaks", "midnight", "goals", "challenges", "analytics", "moderation", "beta", "support"];
  for (const p of purposes) assert.ok(channelFor(p));
  const all = allChannels().flatMap((c) => (c.purpose ? [c.purpose] : []));
  assert.equal(new Set(all).size, all.length, "purposes are unique");
});

test("every permission name is a real Discord permission", () => {
  for (const r of ROLES) assert.doesNotThrow(() => bits(r.permissions), r.name);
  for (const [k, rules] of Object.entries(PROFILES)) {
    for (const rule of rules) {
      assert.doesNotThrow(() => bits([...(rule.allow ?? []), ...(rule.deny ?? [])]), k);
    }
  }
});

test("overwrites never allow and deny the same bit", () => {
  for (const k of Object.keys(PROFILES) as (keyof typeof PROFILES)[]) {
    for (const kind of ["text", "voice", "category"] as const) {
      for (const o of overwrites(k, ids, kind)) {
        assert.equal(BigInt(o.allow as bigint) & BigInt(o.deny as bigint), 0n, `${k}/${kind}`);
      }
    }
  }
});

test("the garden is hidden until you step through the gate", () => {
  const garden = overwrites("garden", ids, "text");
  const everyone = garden.find((o) => o.id === ids.everyone)!;
  assert.ok((everyone.deny as bigint) & bits(["ViewChannel"]));
  const bloomer = garden.find((o) => o.id === ids.bloomer)!;
  assert.ok((bloomer.allow as bigint) & bits(["ViewChannel", "SendMessages"]));

  const gate = overwrites("gate", ids, "text");
  assert.ok((gate.find((o) => o.id === ids.bloomer)!.deny as bigint) & bits(["ViewChannel"]), "gate vanishes after entering");

  const team = overwrites("team", ids, "text");
  assert.equal(team.find((o) => o.id === ids.bloomer), undefined, "members get nothing on team channels");
  assert.ok((team.find((o) => o.id === ids.everyone)!.deny as bigint) & bits(["ViewChannel"]));
});

test("focus room lets you join but not speak", () => {
  const f = overwrites("focus", ids, "voice").find((o) => o.id === ids.bloomer)!;
  assert.ok((f.allow as bigint) & bits(["Connect"]));
  assert.ok((f.deny as bigint) & bits(["Speak"]));
});

test("text channels never carry voice-only bits", () => {
  const voice = bits(["Connect", "Speak", "Stream", "UseVAD"]);
  for (const o of overwrites("garden", ids, "text")) {
    assert.equal(((o.allow as bigint) | (o.deny as bigint)) & voice, 0n);
  }
});

test("world messages fit Discord's embed limits", () => {
  for (const ch of allChannels()) {
    for (const m of ch.messages ?? []) {
      assert.ok(m.embeds.length <= 10);
      let total = 0;
      for (const e of m.embeds) {
        const json = embed(e).toJSON();
        assert.ok((json.description ?? "").length <= 4096, m.id);
        assert.ok((json.title ?? "").length <= 256, m.id);
        assert.ok((json.fields ?? []).length <= 25, m.id);
        for (const f of json.fields ?? []) assert.ok(f.name.length <= 256 && f.value.length <= 1024, m.id);
        total += (json.title ?? "").length + (json.description ?? "").length + (json.footer?.text ?? "").length;
      }
      assert.ok(total <= 6000, m.id);
      if (m.panel) {
        for (const row of panel(m.panel, { appUrl: "https://example.com" })) assert.ok(row.components.length <= 5);
      }
    }
  }
});

test("commands serialise", () => {
  const defs = commandDefinitions();
  assert.equal(defs.length, 5);
  assert.deepEqual(defs.map((d) => d.name).sort(), ["Flag for Groundskeepers", "beta", "challenge", "checkin", "garden"].sort());
});
