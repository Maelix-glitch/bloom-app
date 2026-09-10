// @vitest-environment jsdom
/**
 * Render smoke test — the Cycle assistant panel.
 *
 * This panel shipped as a `TODO: Implement chat interface` stub for a while:
 * the launcher button on the cycle page opened it and showed the literal text
 * "Assistant Panel", with twelve real props discarded on the floor. TypeScript
 * caught it only because the props were rejected; nothing checked that a panel
 * actually renders or that asking it a question does anything. These do.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { AssistantPanel } from "./AssistantPanel";
import type { QuickPrompt } from "@/lib/cycle/assistant";
import type { Msg } from "./BloomCycleAI";

afterEach(cleanup);

const PROMPTS: QuickPrompt[] = [
  {
    id: "noticed",
    label: "What is Bloom noticing?",
    question: "What are you noticing?",
    available: () => true,
  },
];

function renderPanel(overrides: Partial<Parameters<typeof AssistantPanel>[0]> = {}) {
  const props = {
    context: null,
    useLogs: true,
    onToggleLogs: vi.fn(),
    insight: null,
    prompts: PROMPTS,
    messages: [] as Msg[],
    input: "",
    setInput: vi.fn(),
    ask: vi.fn().mockResolvedValue(undefined),
    answering: false,
    error: null,
    onClose: vi.fn(),
    ...overrides,
  };
  render(<AssistantPanel {...props} />);
  return props;
}

describe("AssistantPanel", () => {
  it("renders as a real dialog with an accessible name", () => {
    renderPanel();
    expect(screen.getByRole("dialog", { name: /bloom cycle assistant/i })).toBeTruthy();
  });

  it("offers the quick prompts while the thread is empty, and asks with them", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "What is Bloom noticing?" }));
    expect(props.ask).toHaveBeenCalledWith("What are you noticing?");
  });

  it("hides the quick prompts once there is a conversation", () => {
    renderPanel({ messages: [{ id: "u1", role: "you", text: "Hi" }] });
    expect(screen.queryByRole("button", { name: "What is Bloom noticing?" })).toBeNull();
    expect(screen.getByText("Hi")).toBeTruthy();
  });

  it("shows the thinking state without pretending there is an answer", () => {
    renderPanel({ answering: true });
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByLabelText("Send").hasAttribute("disabled")).toBe(true);
  });

  it("surfaces a failure the person can act on", () => {
    renderPanel({ error: "Couldn't answer that just now — try again in a moment." });
    expect(screen.getByText(/couldn't answer that just now/i)).toBeTruthy();
  });

  it("toggles whether the record is used, and can close", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByLabelText(/use my cycle record/i));
    expect(props.onToggleLogs).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /close the assistant/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
