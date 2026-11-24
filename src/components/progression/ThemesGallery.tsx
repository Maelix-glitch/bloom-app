/**
 * The Themes gallery — the Atelier's dedicated presentation for themes
 * (M-238).
 *
 * Until now themes sat in the same small shelf tile as every other kind:
 * a short art strip, a name, and a button, with no way to see what a
 * theme actually is before using it. This gallery gives each of the
 * twelve founded themes a composed card (its own overview artwork, its
 * name in the display serif, its one-line world, and a calm row of its
 * real palette swatches) and a detail sheet with all three artworks and
 * the full palette, values included.
 *
 * The twelve themes are free for every user (owner decision,
 * 2026-11-24): there is no price and no buy step, in the gallery or the
 * detail sheet. The only states are Equipped and not equipped, and the
 * equip action is the Atelier's existing one, passed in as a prop and
 * used unchanged: equipping still republishes the skin app-wide
 * through the store. Premium themes will arrive later as their own
 * separate set; they are not part of this gallery's twelve.
 */

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BloomSheet, SheetBody } from "@/components/ui/bloom-sheet";
import type { ComponentDef } from "@/lib/rewards/types";
import { THEME_ART } from "@/lib/rewards/themeArt";
import { themePalette } from "@/lib/rewards/themePalettes";
import { cn } from "@/lib/utils";

/** Whether a theme is the one currently equipped. */
export function isThemeEquipped(
  theme: ComponentDef,
  equippedThemeId: string | undefined,
): boolean {
  return equippedThemeId === theme.id;
}

function StateLine({ equipped }: { equipped: boolean }) {
  if (equipped) {
    return (
      <span className="thg-state is-equipped">
        <Check width={12} height={12} aria-hidden /> Equipped
      </span>
    );
  }
  return <span className="thg-state">Free</span>;
}

function StateAction({
  theme,
  equipped,
  onEquip,
}: {
  theme: ComponentDef;
  equipped: boolean;
  onEquip: (theme: ComponentDef) => void;
}) {
  if (equipped) return null;
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => onEquip(theme)}>
      Use this look
    </Button>
  );
}

/** The swatches a card shows: the palette without the hairline border step. */
const CARD_TOKENS = new Set(["--background", "--surface", "--surface-2", "--surface-3", "--border-strong", "--accent-secondary"]);

export function ThemesGallery({
  themes,
  equippedThemeId,
  onEquip,
}: {
  themes: ComponentDef[];
  equippedThemeId: string | undefined;
  onEquip: (theme: ComponentDef) => void;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = themes.find((t) => t.id === detailId) ?? null;

  return (
    <section className="thg" aria-label="Themes">
      <p className="thg-note">
        Twelve founded themes, free for everyone. Each one restyles every Bloom surface and
        carries its own artwork for the rail, Today and Mood. Open a theme to see its colours
        and pictures before you use it.
      </p>

      <div className="thg-grid">
        {themes.map((theme) => {
          const equipped = isThemeEquipped(theme, equippedThemeId);
          const art = THEME_ART[theme.id];
          const swatches = themePalette(theme.id).filter((e) => CARD_TOKENS.has(e.token));
          return (
            <article
              key={theme.id}
              className={cn("thg-card", equipped && "is-equipped")}
              data-theme-card={theme.id}
              data-equipped={equipped ? "true" : "false"}
            >
              <button
                type="button"
                className="thg-open"
                onClick={() => setDetailId(theme.id)}
                aria-label={`View ${theme.title}`}
              >
                <span className="thg-art">
                  {art ? <img src={art.overview} alt="" loading="lazy" /> : null}
                </span>
                <span className="thg-head">
                  <span className="thg-title">{theme.title}</span>
                  <span className="thg-world">{theme.intent}</span>
                </span>
              </button>

              <div
                className="thg-swatches"
                role="img"
                aria-label={`${theme.title} palette: ${swatches.map((s) => s.label).join(", ")}`}
              >
                {swatches.map((entry) => (
                  <span
                    key={entry.token}
                    className="thg-swatch"
                    style={{ background: entry.value }}
                    title={`${entry.label} · ${entry.value}`}
                  />
                ))}
              </div>

              <div className="thg-foot">
                <StateLine equipped={equipped} />
                <StateAction theme={theme} equipped={equipped} onEquip={onEquip} />
              </div>
            </article>
          );
        })}
      </div>

      <ThemeDetailSheet
        theme={detail}
        equippedThemeId={equippedThemeId}
        onEquip={onEquip}
        onClose={() => setDetailId(null)}
      />
    </section>
  );
}

function ThemeDetailSheet({
  theme,
  equippedThemeId,
  onEquip,
  onClose,
}: {
  theme: ComponentDef | null;
  equippedThemeId: string | undefined;
  onEquip: (theme: ComponentDef) => void;
  onClose: () => void;
}) {
  const art = theme ? THEME_ART[theme.id] : null;
  const palette = theme ? themePalette(theme.id) : [];
  const equipped = theme ? isThemeEquipped(theme, equippedThemeId) : false;

  return (
    <BloomSheet
      open={theme !== null}
      onClose={onClose}
      title={theme ? `${theme.title} theme` : "Theme"}
      size="lg"
    >
      {theme && art ? (
        <SheetBody className="thg-sheet-body">
          <div className="thg-sheet-scroll">
            <figure className="thg-figure thg-figure-hero">
              <img src={art.overview} alt="" />
              <figcaption>Today · hero artwork</figcaption>
            </figure>

            <h3 className="thg-sheet-title">{theme.title}</h3>
            <p className="thg-sheet-world">{theme.intent}</p>
            <p className="thg-sheet-detail">{theme.detail}</p>

            <div className="thg-trio">
              <figure className="thg-figure">
                <img src={art.sidebar} alt="" loading="lazy" />
                <figcaption>Rail · sidebar artwork</figcaption>
              </figure>
              <figure className="thg-figure">
                <img src={art.mood} alt="" loading="lazy" />
                <figcaption>Mood · hero artwork</figcaption>
              </figure>
            </div>

            <h4 className="thg-sheet-sub">Palette</h4>
            <ul className="thg-palette">
              {palette.map((entry) => (
                <li key={entry.token} className="thg-palette-row">
                  <span className="thg-swatch" style={{ background: entry.value }} aria-hidden />
                  <span className="thg-palette-label">{entry.label}</span>
                  <span className="thg-palette-value">{entry.value}</span>
                </li>
              ))}
            </ul>

            <p className="thg-surfaces">
              Applies to {theme.surfaces.join(", ").toLowerCase()}.
            </p>

            <div className="thg-foot thg-sheet-foot">
              <StateLine equipped={equipped} />
              <StateAction theme={theme} equipped={equipped} onEquip={onEquip} />
            </div>
          </div>
        </SheetBody>
      ) : null}
    </BloomSheet>
  );
}
