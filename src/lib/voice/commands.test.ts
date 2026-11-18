import { describe, expect, it } from "vitest";

import {
  GLASS_ML,
  matchByName,
  normaliseTranscript,
  parseVoiceCommand,
  waterMlOf,
  type VoiceIntent,
} from "./commands";

const intentOf = (raw: string): VoiceIntent => parseVoiceCommand(raw).intent;

describe("parseVoiceCommand — habits", () => {
  it("parses 'mark gym done'", () => {
    expect(intentOf("Mark gym done")).toEqual({ kind: "tick-habit", heardName: "gym" });
  });
  it("parses 'tick morning walk'", () => {
    expect(intentOf("tick morning walk")).toEqual({ kind: "tick-habit", heardName: "morning walk" });
  });
  it("parses 'gym done' and 'i did gym'", () => {
    expect(intentOf("gym done")).toEqual({ kind: "tick-habit", heardName: "gym" });
    expect(intentOf("I did meditation")).toEqual({ kind: "tick-habit", heardName: "meditation" });
  });
  it("strips trailing 'today'/'please'", () => {
    expect(intentOf("mark gym done today please")).toEqual({ kind: "tick-habit", heardName: "gym" });
  });
});

describe("parseVoiceCommand — water", () => {
  it("parses digits: 'drank 500 ml water'", () => {
    expect(intentOf("drank 500 ml water")).toEqual({ kind: "log-water", ml: 500 });
  });
  it("parses word numbers: 'drank five hundred ml water'", () => {
    expect(intentOf("drank five hundred ml water")).toEqual({ kind: "log-water", ml: 500 });
  });
  it("parses glasses: 'two glasses of water'", () => {
    expect(intentOf("two glasses of water")).toEqual({ kind: "log-water", glasses: 2 });
    expect(intentOf("I drank a glass of water")).toEqual({ kind: "log-water", glasses: 1 });
  });
  it("parses litres", () => {
    expect(intentOf("drank 1 litre water")).toEqual({ kind: "log-water", ml: 1000 });
  });
  it("understands paani as water", () => {
    expect(intentOf("drank 500 ml paani")).toEqual({ kind: "log-water", ml: 500 });
    expect(intentOf("two glasses of paani")).toEqual({ kind: "log-water", glasses: 2 });
  });
  it("no amount heard → the intent carries NO amount (never invented)", () => {
    const intent = intentOf("drank water");
    expect(intent).toEqual({ kind: "log-water" });
    if (intent.kind === "log-water") expect(waterMlOf(intent)).toBeNull();
  });
  it("glasses convert at the app's own glass size", () => {
    // MetricsEntryModal's water stepper: one step = a glass = 250 ml.
    expect(GLASS_ML).toBe(250);
    expect(waterMlOf({ kind: "log-water", glasses: 2 })).toBe(500);
    expect(waterMlOf({ kind: "log-water", ml: 330 })).toBe(330);
  });
});

describe("parseVoiceCommand — weight", () => {
  it("parses digits and words", () => {
    expect(intentOf("my weight is 82")).toEqual({ kind: "log-weight", kg: 82 });
    expect(intentOf("my weight is eighty two")).toEqual({ kind: "log-weight", kg: 82 });
    expect(intentOf("weight is 82.5")).toEqual({ kind: "log-weight", kg: 82.5 });
    expect(intentOf("I weigh eighty two point five")).toEqual({ kind: "log-weight", kg: 82.5 });
  });
  it("implausible weights are not intents", () => {
    expect(intentOf("my weight is 10").kind).toBe("unknown");
    expect(intentOf("my weight is 900").kind).toBe("unknown");
  });
});

describe("parseVoiceCommand — food", () => {
  it("parses 'log two eggs' with the count", () => {
    expect(intentOf("log two eggs")).toEqual({ kind: "log-food", heardName: "eggs", count: 2 });
  });
  it("parses 'log 2 eggs' with digit counts", () => {
    expect(intentOf("log 2 eggs")).toEqual({ kind: "log-food", heardName: "eggs", count: 2 });
  });
  it("no count heard → no count on the intent", () => {
    const intent = intentOf("log eggs");
    expect(intent).toEqual({ kind: "log-food", heardName: "eggs" });
    if (intent.kind === "log-food") expect(intent.count).toBeUndefined();
  });
  it("parses a spoken meal", () => {
    expect(intentOf("had an omelette for breakfast")).toEqual({
      kind: "log-food",
      heardName: "omelette",
      count: 1,
      meal: "breakfast",
    });
  });
  it("'log water' and 'log weight' are not food", () => {
    expect(intentOf("log water").kind).toBe("log-water");
    expect(intentOf("log weight 82").kind).toBe("log-weight");
  });
});

describe("parseVoiceCommand — navigation", () => {
  it("parses 'open nutrition'", () => {
    expect(intentOf("open nutrition")).toEqual({ kind: "navigate", target: "nutrition" });
    expect(intentOf("go to trackers")).toEqual({ kind: "navigate", target: "trackers" });
    expect(intentOf("show profile")).toEqual({ kind: "navigate", target: "profile" });
  });
  it("an unknown destination is unknown, not a guess", () => {
    expect(intentOf("open settings").kind).toBe("unknown");
  });
});

describe("parseVoiceCommand — honesty", () => {
  it("unclear transcripts parse to unknown", () => {
    expect(intentOf("blah blah blah").kind).toBe("unknown");
    expect(intentOf("what is the weather").kind).toBe("unknown");
    expect(intentOf("").kind).toBe("unknown");
    expect(intentOf("   ").kind).toBe("unknown");
  });
  it("normalises case and punctuation", () => {
    expect(normaliseTranscript("Mark Gym, Done!")).toBe("mark gym done");
    expect(intentOf("Mark Gym, Done!")).toEqual({ kind: "tick-habit", heardName: "gym" });
  });
});

describe("matchByName", () => {
  const items = [{ name: "Gym" }, { name: "Morning Walk" }, { name: "Egg" }, { name: "Egg Fried Rice" }];
  it("matches exactly, case-insensitively", () => {
    expect(matchByName(items, "gym")).toEqual({ status: "match", item: { name: "Gym" } });
  });
  it("matches plural heard against singular stored", () => {
    expect(matchByName(items, "eggs")).toEqual({ status: "match", item: { name: "Egg" } });
  });
  it("an unmatched name resolves to none — never a substitute", () => {
    expect(matchByName(items, "swimming")).toEqual({ status: "none" });
  });
  it("a unique fragment matches; a shared fragment is ambiguous, not a pick", () => {
    expect(matchByName(items, "egg f")).toEqual({ status: "match", item: { name: "Egg Fried Rice" } });
    expect(matchByName(items, "e").status).toBe("ambiguous");
  });
});
