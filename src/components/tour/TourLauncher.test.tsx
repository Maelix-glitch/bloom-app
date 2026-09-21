// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TourCard } from "./TourLauncher";

const mockStartTour = vi.fn();
let mockCompleted: Record<string, boolean> = {};

vi.mock("./TourContext", () => ({
  useTour: () => ({
    startTour: mockStartTour,
    completed: mockCompleted,
    isActive: false,
    showPrompt: false,
    close: vi.fn(),
  }),
}));

describe("TourCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockCompleted = {};
  });

  it("renders the tour card when the section tutorial has not been completed", () => {
    mockCompleted = {};
    render(<TourCard tourId="home" containerClassName="home-band" />);

    expect(screen.getByText("Greeting, habits, map, flow — how Today works.")).toBeTruthy();
    const button = screen.getByRole("button", { name: /Take tour/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(mockStartTour).toHaveBeenCalledWith("home");
  });

  it("takes the tutorial completely out of the page once completed on a section", () => {
    mockCompleted = { home: true };
    const { container } = render(<TourCard tourId="home" containerClassName="home-band" />);

    // Entire card and outer container must be completely gone
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Take tour/i)).toBeNull();
    expect(screen.queryByText(/Today works/i)).toBeNull();
  });

  it("removes the section card for other sections when completed", () => {
    mockCompleted = { mood: true, coach: true };

    const { container: moodContainer } = render(
      <TourCard tourId="mood" containerClassName="px-4" />,
    );
    expect(moodContainer.firstChild).toBeNull();

    const { container: coachContainer } = render(
      <TourCard tourId="coach" containerClassName="px-4" />,
    );
    expect(coachContainer.firstChild).toBeNull();

    // Incomplete section should still render
    const { container: cycleContainer } = render(
      <TourCard tourId="cycle" containerClassName="px-4" />,
    );
    expect(cycleContainer.firstChild).not.toBeNull();
  });
});
