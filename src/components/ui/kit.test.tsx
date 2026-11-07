// @vitest-environment jsdom
/**
 * Kit fixtures + contract tests (UI update U2, plan §2.2/§2.4/§5.5).
 *
 * The codebase has no storybook; these renders are the kit's fixture set —
 * one place that exercises every re-skinned component the way a story
 * would — and they pin the U2 contract so the stock shadcn metrics can't
 * creep back: the gold pill button at 44/48 px, token radii instead of
 * rounded-md, elevation tokens instead of stock shadows, the gold focus
 * system, converged overlay chrome, and the EmptyState pattern.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Badge } from "./badge";
import { BloomConfirm } from "./bloom-sheet";
import { Button } from "./button";
import { Card, CardTitle } from "./card";
import { Checkbox } from "./checkbox";
import { ConfirmSheet } from "./confirm-sheet";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { EmptyState } from "./empty-state";
import { Input } from "./input";
import { Label } from "./label";
import { Sheet, SheetContent, SheetTitle } from "./sheet";
import { Skeleton } from "./skeleton";
import { Switch } from "./switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

afterEach(cleanup);

/** jsdom ships no matchMedia; BloomSheet asks it whether this is a phone. */
function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => mockMatchMedia(false));

const STOCK = ["rounded-md", "shadow-sm", "ring-ring"];

function expectNoStock(el: HTMLElement) {
  for (const cls of STOCK) expect(el.className).not.toContain(cls);
  expect(el.className).not.toMatch(/(^|\s)shadow(\s|$)/);
}

describe("Button — the hero pattern, codified", () => {
  it("primary is a 44px gold pill with the gold focus ring", () => {
    render(<Button>Begin</Button>);
    const btn = screen.getByRole("button", { name: "Begin" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("rounded-pill");
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("text-primary-foreground");
    expect(btn.className).toContain("ring-primary/60");
    expect(btn.className).not.toContain("h-9");
    expectNoStock(btn);
  });

  it("lg is the 48px hero size; the press settle rides along", () => {
    render(<Button size="lg">Continue</Button>);
    const btn = screen.getByRole("button", { name: "Continue" });
    expect(btn.className).toContain("h-12");
    expect(btn.className).toContain("bm-press");
  });

  it("secondary and ghost speak the same token language", () => {
    render(
      <>
        <Button variant="secondary">Later</Button>
        <Button variant="ghost">Skip</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Later" }).className).toContain("bg-secondary");
    const ghost = screen.getByRole("button", { name: "Skip" });
    expect(ghost.className).toContain("hover:bg-surface-3");
    expect(ghost.className).toContain("rounded-pill");
  });

  it("destructive is the --danger token, not a stock red", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-destructive");
  });
});

describe("Fields", () => {
  it("Input is a 44px token field with faint placeholder and gold focus", () => {
    render(<Input placeholder="Your name" aria-label="Name" />);
    const input = screen.getByLabelText("Name");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("rounded-control");
    expect(input.className).toContain("bg-surface-2");
    expect(input.className).toContain("placeholder:text-faint");
    expect(input.className).toContain("focus-visible:ring-primary/60");
    expectNoStock(input);
  });

  it("Label caps variant is the small-caps metadata treatment", () => {
    render(<Label variant="caps">Section</Label>);
    const label = screen.getByText("Section");
    expect(label.className).toContain("uppercase");
    expect(label.className).toContain("tracking-[var(--tracking-meta)]");
  });
});

describe("Card and Tabs", () => {
  it("Card wears the token surface; panel variant is the hero panel", () => {
    const { rerender } = render(
      <Card data-testid="c">
        <CardTitle>Today</CardTitle>
      </Card>,
    );
    const card = screen.getByTestId("c");
    expect(card.className).toContain("rounded-card");
    expect(card.className).toContain("shadow-card");
    expect(card.className).toContain("border-border-subtle");
    expect(screen.getByText("Today").className).toContain("font-display");
    expectNoStock(card);

    rerender(<Card data-testid="c" variant="panel" />);
    expect(card.className).toContain("rounded-panel");
    expect(card.className).toContain("shadow-panel");
  });

  it("Tabs are a segmented pill; the active segment is gold-deep/gold", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Demo">
          <TabsTrigger value="a">Week</TabsTrigger>
          <TabsTrigger value="b">Month</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("h-11");
    expect(list.className).toContain("rounded-pill");
    expect(list.className).toContain("bg-surface-2");
    const active = screen.getByRole("tab", { name: "Week" });
    expect(active.className).toContain("data-[state=active]:bg-gold-deep");
    expect(active.className).toContain("data-[state=active]:text-gold");
    expectNoStock(list);
  });
});

describe("Small controls and chips", () => {
  it("Badge is a pill; the gold badge is the one accent chip", () => {
    render(<Badge variant="gold">375 pts</Badge>);
    const badge = screen.getByText("375 pts");
    expect(badge.className).toContain("rounded-pill");
    expect(badge.className).toContain("bg-gold-deep");
    expect(badge.className).toContain("text-gold");
    expectNoStock(badge);
  });

  it("Skeleton holds on surface-2 at control radius", () => {
    render(<Skeleton data-testid="sk" />);
    const sk = screen.getByTestId("sk");
    expect(sk.className).toContain("bg-surface-2");
    expect(sk.className).toContain("rounded-control");
    expect(sk.className).toContain("animate-pulse");
  });

  it("Switch is a 44×24 pill; Checkbox an 18px token box", () => {
    render(
      <>
        <Switch aria-label="Cycle" />
        <Checkbox aria-label="Done" />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "Cycle" });
    expect(sw.className).toContain("h-6");
    expect(sw.className).toContain("w-11");
    expect(sw.className).toContain("data-[state=checked]:bg-primary");
    expectNoStock(sw);
    const cb = screen.getByRole("checkbox", { name: "Done" });
    expect(cb.className).toContain("h-[18px]");
    expect(cb.className).toContain("bg-surface-2");
    expectNoStock(cb);
  });
});

describe("Overlay convergence (§2.4)", () => {
  it("Dialog content wears BloomSheet chrome", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Evening review</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("rounded-dialog");
    expect(dialog.className).toContain("shadow-dialog");
    expect(dialog.className).toContain("bg-surface");
    expect(dialog.className).toContain("duration-[var(--motion-page)]");
    expectNoStock(dialog);
    expect(screen.getByText("Evening review").className).toContain("font-display");
  });

  it("Sheet bottom wears the panel-radius top corners and the same chrome", () => {
    render(
      <Sheet open>
        <SheetContent side="bottom">
          <SheetTitle>Log water</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog");
    expect(sheet.dataset["bloomSide"]).toBe("bottom");
    expect(sheet.className).toContain("rounded-t-panel");
    expect(sheet.className).toContain("shadow-dialog");
    expect(sheet.className).toContain("bg-surface");
  });

  it("BloomConfirm renders on BloomSheet and fires onConfirm, then closes", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <BloomConfirm
        open
        onClose={onClose}
        title="Delete this entry?"
        description="It will leave your record."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Delete" });
    /* tone defaults to danger → the destructive button, not a hand-rolled pill. */
    expect(confirm.className).toContain("bg-destructive");
    fireEvent.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("BloomConfirm cancel is the ghost button and only closes", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <BloomConfirm
        open
        onClose={onClose}
        title="Leave?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        tone="default"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("the ConfirmSheet shim re-exports the same component", () => {
    expect(ConfirmSheet).toBe(BloomConfirm);
  });
});

describe("EmptyState (§5.5)", () => {
  it("renders mark, Fraunces headline, support line and the one action", () => {
    render(
      <EmptyState
        title={
          <>
            Nothing logged <span className="display-em">yet</span>
          </>
        }
        description="Your first entry starts the record."
        action={<Button>Add an entry</Button>}
      />,
    );
    const heading = screen.getByRole("heading", { name: /Nothing logged/ });
    expect(heading.className).toContain("font-display");
    expect(screen.getByText("Your first entry starts the record.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add an entry" }).className).toContain("bg-primary");
  });

  it("works bare — no description, no action — and accepts a custom glyph", () => {
    render(<EmptyState title="All caught up" glyph={<span data-testid="glyph" />} />);
    expect(screen.getByRole("heading", { name: "All caught up" })).toBeTruthy();
    expect(screen.getByTestId("glyph")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
