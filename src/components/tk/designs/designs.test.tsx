// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Atlas } from "./Atlas";
import { NumberPicker, TagGroup } from "./shared";
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
  cleanup();
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

  it("never references a design token that isn't declared", () => {
    /* Renaming a token silently breaks every rule that used the old name:
       var() resolves to nothing and the declaration is dropped. jsdom cannot
       see that, so the stylesheet is checked directly. */
    const css = readFileSync(resolve(process.cwd(), "src/styles/trackers2.css"), "utf8");
    const declared = new Set(
      Array.from(css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm), (m) => m[1]!),
    );
    /* these come from the theme blocks in cycle2.css */
    const inherited = new Set([
      "--ci-font-display",
      "--ci-font-mono",
      "--ci-font-sans",
      "--ci-radius-md",
      "--ci-radius-lg",
      "--ci-radius-sm",
      /* set per arc by the [data-id] rules below */
      "--active-track-color-hex",
    ]);
    const used = new Set(Array.from(css.matchAll(/var\((--[a-z0-9-]+)/g), (m) => m[1]!));
    const missing = Array.from(used).filter(
      (name) => !declared.has(name) && !inherited.has(name),
    );
    expect(missing, `undeclared tokens: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps the picker rules in the stylesheet", () => {
    /* jsdom applies no stylesheet, so assert the rules exist where they're
       written - a lost block here is invisible to every other test. */
    const css = readFileSync(resolve(process.cwd(), "src/styles/trackers2.css"), "utf8");
    for (const rule of [
      ".tk2-tags {",
      ".tk2-tag {",
      ".tk2-numbers {",
      ".tk2-number {",
      '.tk2-tag[data-active="true"] {',
      '.tk2-number[data-active="true"] {',
    ]) {
      expect(css, `missing rule: ${rule}`).toContain(rule);
    }
    /* tags wrap, the number bar is a capsule, and the number is a circle */
    expect(css).toMatch(/\.tk2-tags \{[^}]*flex-wrap: wrap;/);
    expect(css).toMatch(/\.tk2-numbers \{[^}]*border-radius: 30px;/);
    expect(css).toMatch(/\.tk2-number \{[^}]*border-radius: 50%;/);
  });

  it("renders each tag choice as its own element, not one run of text", () => {
    const { container } = render(
      <TagGroup
        options={[
          { value: 1, label: "Rough" },
          { value: 2, label: "Fair" },
          { value: 3, label: "Okay" },
        ]}
        value={3}
        onSelect={() => {}}
      />,
    );

    const tags = container.querySelectorAll(".tk2-tag");
    expect(tags).toHaveLength(3);
    expect(Array.from(tags).map((t) => t.textContent)).toEqual(["Rough", "Fair", "Okay"]);
    /* one word per element is the whole point — no "RoughFairOkay" */
    expect(
      container.querySelector('.tk2-tag[data-active="true"]')?.textContent,
    ).toBe("Okay");
    expect(container.querySelectorAll('.tk2-tag[data-active="true"]')).toHaveLength(1);
  });

  it("renders the energy scale as separate circles in a capsule bar", () => {
    const { container } = render(
      <NumberPicker
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        value={4}
        onSelect={() => {}}
      />,
    );

    expect(container.querySelector(".tk2-numbers")).toBeTruthy();
    const circles = container.querySelectorAll(".tk2-number");
    expect(circles).toHaveLength(5);
    expect(Array.from(circles).map((c) => c.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(
      container.querySelector('.tk2-number[data-active="true"]')?.textContent,
    ).toBe("4");

    /* nothing chosen: no circle is lit, rather than the first one lighting up */
    const { container: empty } = render(
      <NumberPicker
        options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
        value={null}
        onSelect={() => {}}
      />,
    );
    expect(empty.querySelectorAll('[data-active="true"]')).toHaveLength(0);
  });

  it("the dashboard carries no logging form at all", () => {
    const { container } = render(<Atlas />);
    expect(container.querySelectorAll("textarea")).toHaveLength(0);
    expect(container.querySelectorAll("select")).toHaveLength(0);
    /* the old sheet's field wrapper and its date picker are gone from this view */
    expect(container.querySelector(".ci-field")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cards are read-only: no inline controls left on them", () => {
    const { container } = render(<Atlas />);
    expect(container.querySelectorAll(".at-territory button")).toHaveLength(0);
    expect(container.querySelectorAll(".at-territory input")).toHaveLength(0);
    /* the card itself is the trigger */
    const card = container.querySelector('.at-territory[data-id="movement"]')!;
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("opens the logging modal from a card, saves a typed total and closes", () => {
    const { container } = render(<Atlas />);
    const card = container.querySelector('.at-territory[data-id="movement"]') as HTMLElement;

    fireEvent.click(card);
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Log Movement");

    /* the field opens on what's already there, not on a blank */
    const field = dialog.querySelector(".tk2-modal-input") as HTMLInputElement;
    expect(field.value).toBe("33");

    fireEvent.change(field, { target: { value: "45" } });
    fireEvent.click(screen.getByText(/save & close/i));

    expect(screen.queryByRole("dialog")).toBeNull();
    /* 45 is the total, not 33 + 45 */
    expect(
      container.querySelector('.at-territory[data-id="movement"] .at-coord')?.textContent,
    ).toContain("45");
    expect(container.querySelector(".at-notice")?.textContent).toContain("noted on the map");
  });

  it("sets energy from the modal and fills its ring to the full sweep", () => {
    const { container } = render(<Atlas />);
    fireEvent.click(container.querySelector('.at-territory[data-id="energy"]')!);

    const dialog = screen.getByRole("dialog");
    const five = Array.from(dialog.querySelectorAll(".tk2-number")).at(-1)!;
    fireEvent.click(five);
    /* the circle fills the field, and saving writes what the field holds */
    expect((dialog.querySelector(".tk2-modal-input") as HTMLInputElement).value).toBe("5");
    fireEvent.click(screen.getByText(/save & close/i));

    expect(
      container.querySelector('.at-territory[data-id="energy"] .at-coord')?.textContent,
    ).toContain("5");

    /* 5 of 5 leaves nothing hidden — the whole circumference is drawn */
    const ring = container.querySelector('.at-arc[data-id="energy"]')!;
    expect(Number(ring.getAttribute("stroke-dasharray"))).toBeGreaterThan(0);
    expect(Number(ring.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 1);
  });

  it("a ring's hidden length is exactly the share still missing", () => {
    const { container } = render(<Atlas />);
    const ring = container.querySelector('.at-arc[data-id="water"]')!;
    const circumference = Number(ring.getAttribute("stroke-dasharray"));
    const offset = Number(ring.getAttribute("stroke-dashoffset"));
    /* seeded day ends at 1400 + 13*90 = 2570ml against a 2200ml target */
    const share = Math.min(2570 / 2200, 1);
    expect(offset).toBeCloseTo(circumference * (1 - share), 0);
  });

  it("escape closes the modal without saving anything", () => {
    const { container } = render(<Atlas />);
    const before = container.querySelector('.at-territory[data-id="screen"] .at-coord')
      ?.textContent;
    fireEvent.click(container.querySelector('.at-territory[data-id="screen"]')!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      container.querySelector('.at-territory[data-id="screen"] .at-coord')?.textContent,
    ).toBe(before);
  });

  it("opens the reflect sheet from the floating action and saves several at once", () => {
    const { container } = render(<Atlas />);
    const fab = container.querySelector(".premium-log-cta") as HTMLElement;
    expect(fab.textContent?.toLowerCase()).toContain("reflect & log today");
    /* the dock itself must not swallow clicks meant for the page */
    expect(container.querySelector(".premium-action-dock")).toBeTruthy();

    fireEvent.click(fab);
    const dialog = screen.getByRole("dialog");
    /* the sheet carries no heading, no lede — just the six fields */
    expect(dialog.textContent?.trim()).not.toContain("Reflect on today");
    expect(dialog.textContent?.trim()).not.toContain("Every figure is a total");

    /* one field per tracker, each opening on what today already holds */
    const fields = dialog.querySelectorAll(".tk2-sheet-input") as NodeListOf<HTMLInputElement>;
    expect(fields).toHaveLength(6);
    expect(fields[0]!.value).toBe("485"); /* seeded sleep, 420 + 13*5 */

    fireEvent.change(fields[0]!, { target: { value: "500" } });
    fireEvent.change(fields[1]!, { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      container.querySelector('.at-territory[data-id="sleep"] .at-coord')?.textContent,
    ).toContain("8h 20m"); /* 500 minutes */
    expect(
      container.querySelector('.at-territory[data-id="water"] .at-coord')?.textContent,
    ).toContain("3L"); /* 3000ml */
  });

  it("the floating action leaves the page entirely while a panel is open", () => {
    const { container } = render(<Atlas />);
    expect(container.querySelector(".premium-log-cta")).toBeTruthy();
    fireEvent.click(container.querySelector('.at-territory[data-id="water"]')!);
    /* unmounted rather than hidden, so it cannot sit on top of the panel */
    expect(container.querySelector(".premium-log-cta")).toBeNull();
    expect(container.querySelector(".premium-action-dock")).toBeNull();
    cleanup();
  });

  it("every panel mounts outside the page, on its own layer", () => {
    const { container } = render(<Atlas />);
    /* nothing overlay-shaped is anywhere in the page tree when closed */
    expect(container.querySelector(".tk2-modal-root")).toBeNull();
    expect(container.textContent).not.toContain("Save & close");

    fireEvent.click(container.querySelector('.at-territory[data-id="water"]')!);
    const dialog = screen.getByRole("dialog");
    /* portalled to <body>, so no ancestor of the page can drag it into the
       page flow — the failure that renders a panel as bare words at the foot
       of the canvas */
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.querySelector("[data-overlay]")).toBeTruthy();
    cleanup();
  });

  it("reads the insights out as a core with a caption", () => {
    const { container } = render(<Atlas />);
    const insight = container.querySelector(".tk2-insight");
    expect(insight).toBeTruthy();
    const caption = insight?.querySelector(".tk2-insight-caption")?.textContent ?? "";
    expect(caption.toLowerCase()).toContain("biometric");
    /* numbering is explicit, not a browser list marker */
    expect(insight?.querySelectorAll(".tk2-insight-index").length).toBeGreaterThan(0);
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
