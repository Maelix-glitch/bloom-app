// @vitest-environment jsdom
/**
 * GettingStartedCard — the three first steps, read from the real
 * record (hooks mocked at the module boundary): a fresh account sees
 * all three steps with their real doors; done steps are marked from
 * the data, never assumed; all three done (or the habits store still
 * settling) renders nothing at all.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const assessmentState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const habitsState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const nutritionState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useAssessment", () => ({ useAssessment: () => assessmentState.current }));
vi.mock("@/hooks/useHabits", () => ({ useHabits: () => habitsState.current }));
vi.mock("@/hooks/useNutrition", () => ({ useNutrition: () => nutritionState.current }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { GettingStartedCard } from "./GettingStartedCard";

afterEach(cleanup);

function seed({
  status = "not_started",
  habits = [] as unknown[],
  entries = [] as unknown[],
  loading = false,
} = {}) {
  assessmentState.current = { state: { status } };
  habitsState.current = { loading, habits, logs: [], points: 0 };
  nutritionState.current = { entries };
}

describe("GettingStartedCard", () => {
  it("a fresh record shows all three steps and counts none done", () => {
    seed();
    render(<GettingStartedCard />);
    expect(screen.getByTestId("getting-started-card")).toBeTruthy();
    expect(screen.getByText("0 of 3 done")).toBeTruthy();
    expect(screen.getByText("Take your assessment")).toBeTruthy();
    expect(screen.getByText("Add your first habit")).toBeTruthy();
    expect(screen.getByText("Log your first food")).toBeTruthy();
    /* The doors are real: the assessment section on this page, Today,
       Nutrition. */
    expect(screen.getByRole("link", { name: "Begin" }).getAttribute("href")).toBe(
      "#pf-assessment",
    );
    expect(screen.getByRole("link", { name: "Open Today" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Open Nutrition" }).getAttribute("href")).toBe(
      "/nutrition",
    );
  });

  it("an in-progress assessment reads as Continue, not Begin", () => {
    seed({ status: "in_progress" });
    render(<GettingStartedCard />);
    expect(screen.getByText("Continue your assessment")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Continue" })).toBeTruthy();
    expect(screen.getByText("0 of 3 done")).toBeTruthy();
  });

  it("done steps are marked from the record and lose their action", () => {
    seed({ status: "complete", habits: [{ id: "h1" }] });
    render(<GettingStartedCard />);
    expect(screen.getByText("2 of 3 done")).toBeTruthy();
    expect(screen.getAllByText("Done")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Begin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open Today" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open Nutrition" })).toBeTruthy();
  });

  it("all three done — the card disappears entirely", () => {
    seed({ status: "complete", habits: [{ id: "h1" }], entries: [{ id: "e1" }] });
    const { container } = render(<GettingStartedCard />);
    expect(container.firstChild).toBeNull();
  });

  it("while the habits store is settling, the card shows nothing", () => {
    seed({ loading: true });
    const { container } = render(<GettingStartedCard />);
    expect(container.firstChild).toBeNull();
  });
});
