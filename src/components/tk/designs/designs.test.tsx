// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Atlas } from "./Atlas";
import { CapsuleDock } from "./shared";
import { Ledger } from "./Ledger";
import { Strip } from "./Strip";
import { todayKey } from "@/lib/cycle/predict";
import { TRACKERS } from "@/lib/trackers/core";

/** Fourteen real-looking days ending today, so the pages have something to draw. */
function seed() {
  const today = todayKey();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - (13 - i));
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      sleepMinutes: 420 + i * 5,
      bedTime: "23:00",
      wakeTime: "07:00",
      sleepQuality: 3,
      waterMl: 1400 + i * 90,
      sessions: [{ subject: "Maths", minutes: 45 + i * 5, startAt: "09:00" }],
      movementMinutes: 20 + i,
      energy: (i % 5) + 1,
      screenMinutes: 180 + i * 10,
      notes: null,
    };
  });
  window.localStorage.setItem("bloom.trackers.days.v1", JSON.stringify(days));
  return days;
}

let errors: unknown[] = [];

beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
  window.localStorage.clear();
  seed();
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as never;
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the three trackers designs", () => {
  it("Ledger draws the sheet with today's figures", () => {
    render(<Ledger />);
    expect(screen.getByText("Six entries a day.")).toBeTruthy();
    expect(screen.getAllByText("Sleep").length).toBeGreaterThan(0);
    /* 470 minutes on the last seeded day reads as 7h 50m */
    expect(screen.getAllByText("7h 50m").length).toBeGreaterThan(0);
    expect(screen.getByText(/On target/)).toBeTruthy();
    expect(errors).toHaveLength(0);
  });

  it("Atlas draws the compass, its key and the study field", () => {
    const { container } = render(<Atlas />);
    expect(screen.getByText(/Your day, on one dial/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /twenty-four hour compass/i })).toBeTruthy();
    for (const name of ["Sleep", "Water", "Study", "Movement", "Energy", "Screen"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    /* every tracker has a ring, arc or block on the compass */
    expect(container.querySelectorAll(".at-key li")).toHaveLength(6);
    /* the board is a two-column grid: compass, then everything it explains.
       A third child would drop into row two and leave the right column empty. */
    const board = container.querySelector(".at-board");
    expect(board?.children).toHaveLength(2);
    expect(board?.children[1]?.querySelectorAll(".at-territory")).toHaveLength(6);
    /* every mark on the compass has to fall inside its own viewBox — the hour
       labels sit at r=140 and used to be drawn outside a 260-wide box, so all
       four were clipped away. */
    const compass = container.querySelector(".at-compass svg")!;
    const [vx, vy, vw, vh] = compass.getAttribute("viewBox")!.split(/\s+/).map(Number);
    const inside = (x: number, y: number) =>
      x >= vx! && x <= vx! + vw! && y >= vy! && y <= vy! + vh!;
    const marks = [
      ...Array.from(compass.querySelectorAll("text")).map((t) => ({
        x: Number(t.getAttribute("x")),
        y: Number(t.getAttribute("y")) - 3,
      })),
      ...Array.from(compass.querySelectorAll("circle")).map((c) => ({
        x: Number(c.getAttribute("cx")) + Number(c.getAttribute("r")),
        y: Number(c.getAttribute("cy")) + Number(c.getAttribute("r")),
      })),
    ];
    expect(marks.length).toBeGreaterThan(4);
    for (const m of marks) {
      expect(inside(m.x, m.y), `mark at ${m.x},${m.y} falls outside the viewBox`).toBe(true);
    }
    expect(compass.querySelectorAll(".at-hour")).toHaveLength(4);
    /* all six trackers draw on the compass, each in its own colour. Energy
       used to be missing entirely and study shared movement's colour. */
    const arcs = new Set(
      Array.from(container.querySelectorAll(".at-arc")).map((a) => a.getAttribute("data-id")),
    );
    for (const id of ["sleep", "water", "movement", "screen", "study", "energy"]) {
      expect(arcs, `no arc drawn for ${id}`).toContain(id);
    }
    /* jsdom doesn't load the stylesheet, so check the colours where they're
       written. Study used to reuse movement's colour and energy had none. */
    /* jsdom gives import.meta.url an http base, so resolve from the project
       root instead — vitest always runs from there. */
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/trackers2.css"),
      "utf8",
    );
    const strokeOf = (id: string) => {
      const m = css.match(
        new RegExp(`\\.at-arc\\[data-id="${id}"\\]\\s*\\{[^}]*?stroke:\\s*([^;]+);`),
      );
      return m?.[1]?.trim() ?? null;
    };
    const strokes = TRACKERS.map((t) => strokeOf(t.id));
    strokes.forEach((value, i) => {
      expect(value, `no arc colour declared for ${TRACKERS[i]!.id}`).toBeTruthy();
    });
    expect(new Set(strokes).size, "two trackers share an arc colour").toBe(TRACKERS.length);

    /* every ring shows a track even when nothing is logged, and every filled
       arc ends in a lit cap */
    expect(container.querySelectorAll(".at-track")).toHaveLength(6);
    expect(container.querySelectorAll(".at-cap").length).toBeGreaterThan(0);

    /* targets are editable here, and achievements are read off the record */
    expect(container.querySelectorAll(".tk2-targets-grid input")).toHaveLength(6);
    expect(container.querySelectorAll(".tk2-badges-grid li")).toHaveLength(4);

    /* study gets a field of its own, and the route carries all six paths */
    expect(screen.getByText(/Study · the field/)).toBeTruthy();
    expect(container.querySelectorAll(".at-route-line").length).toBeGreaterThanOrEqual(5);
    expect(errors).toHaveLength(0);
  });

  it("Strip draws six bands of fourteen cells", () => {
    const { container } = render(<Strip />);
    expect(screen.getByText(/Six bands/)).toBeTruthy();
    expect(container.querySelectorAll(".sp-band")).toHaveLength(6);
    expect(container.querySelectorAll(".sp-cell")).toHaveLength(84);
    expect(errors).toHaveLength(0);
  });

  it("slides the capsule dock's metal chip to the active option", () => {
    const { container } = render(
      <CapsuleDock
        options={[
          { value: 1, label: "Rough" },
          { value: 2, label: "Fair" },
          { value: 3, label: "Okay" },
        ]}
        value={3}
        onSelect={() => {}}
      />,
    );

    const dock = container.querySelector(".tk2-dock") as HTMLElement;
    expect(dock.style.getPropertyValue("--tk2-dock-i")).toBe("2");
    expect(dock.style.getPropertyValue("--tk2-dock-n")).toBe("3");
    expect(container.querySelector(".tk2-dock-tracer")?.getAttribute("data-visible")).toBe("true");
    expect(container.querySelectorAll(".tk2-dock-btn")).toHaveLength(3);
    expect(
      container.querySelector('.tk2-dock-btn[data-active="true"]')?.textContent,
    ).toBe("Okay");

    /* with nothing chosen the chip hides itself rather than sitting on option one */
    const { container: empty } = render(
      <CapsuleDock options={[{ value: 1, label: "Rough" }]} value={null} onSelect={() => {}} />,
    );
    expect(empty.querySelector(".tk2-dock-tracer")?.getAttribute("data-visible")).toBe("false");
  });

  it("all three show the advanced read, not a placeholder", () => {
    for (const [name, Component] of [
      ["Ledger", Ledger],
      ["Atlas", Atlas],
      ["Strip", Strip],
    ] as const) {
      const { unmount } = render(<Component />);
      const headline = screen
        .getAllByText(/bright|low days|alike on paper|Not yet/i)
        .filter((el) => el.closest("p"));
      expect(headline.length, `${name} shows the advanced read`).toBeGreaterThan(0);
      unmount();
    }
    expect(errors).toHaveLength(0);
  });

  it("an empty record explains itself instead of going blank", () => {
    window.localStorage.clear();
    for (const [name, Component] of [
      ["Ledger", Ledger],
      ["Atlas", Atlas],
      ["Strip", Strip],
    ] as const) {
      const { unmount } = render(<Component />);
      const copy = document.body.textContent ?? "";
      expect(copy.length, `${name} renders copy when empty`).toBeGreaterThan(200);
      expect(/empty|blank|Nothing plotted|Add one day/i.test(copy) || /Six entries|Six bands|Where your hours/.test(copy)).toBe(true);
      unmount();
    }
    expect(errors).toHaveLength(0);
  });
});
