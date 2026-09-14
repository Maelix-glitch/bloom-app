/**
 * BackgroundSheet — the background is a layer, not a preset swap.
 *
 * Bloom gradients, a flat color, a custom gradient, a photo, a texture, and a
 * light overlay all compose on top of each other, so switching from a
 * template's background to your own photo never throws the composition away.
 * The FIT / FILL / BLUR / DARKEN / LIGHTEN row are the one-tap answers people
 * actually reach for when a photo goes behind text.
 */

import { useState } from "react";
import { ImagePlus, Wand2 } from "lucide-react";

import { StorySheet } from "../StorySheet";
import {
  BLOOM_PALETTE,
  GRADIENT_PRESETS,
  TEXTURES,
  gradientPresetById,
  readableInk,
  recentBackgrounds,
  rememberBackground,
} from "@/lib/stories/canvas/backgrounds";
import { linear, paintEdges, paintStyle, solid, type Paint } from "@/lib/stories/canvas/paint";
import type { StoryBackgroundState, TextureId } from "@/lib/stories/canvas/backgrounds";
import { ColorField, FieldLabel, SliderRow } from "./controls";

type Tab = "bloom" | "color" | "gradient" | "photo" | "texture";

const TABS: { id: Tab; label: string }[] = [
  { id: "bloom", label: "Bloom" },
  { id: "color", label: "Color" },
  { id: "gradient", label: "Gradient" },
  { id: "photo", label: "Photo" },
  { id: "texture", label: "Texture" },
];

export function BackgroundSheet({
  bg,
  onChange,
  onUsePhoto,
  onClose,
}: {
  bg: StoryBackgroundState;
  onChange: (next: StoryBackgroundState) => void;
  /** Opens the picker; resolves with a data URL or null. */
  onUsePhoto: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(bg.photo ? "photo" : bg.mode === "solid" ? "color" : "bloom");
  const recents = recentBackgrounds();

  const patch = (next: Partial<StoryBackgroundState>) => onChange({ ...bg, ...next });

  const pickPreset = (id: string) => {
    rememberBackground(id);
    const preset = gradientPresetById(id);
    if (!preset) return;
    patch({ mode: "preset", presetId: id, paint: preset.paint, ink: preset.ink });
  };

  const setPaint = (paint: Paint, presetId: string | null, angle: number) => {
    patch({
      mode: presetId ? "preset" : "gradient",
      presetId,
      paint,
      angle,
      ink: readableInk(bg.color),
    });
  };

  const photo = bg.photo;
  const setPhoto = (next: Partial<NonNullable<typeof photo>>) => {
    if (!photo) return;
    patch({ mode: "photo", photo: { ...photo, ...next } });
  };

  const autoInkFor = (color: string): string => readableInk(color);

  return (
    <StorySheet
      title="Background"
      subtitle="Text, photos and stickers stay exactly where they are."
      onClose={onClose}
      label="Background options"
    >
      <div className="se-tabs" role="tablist" aria-label="Background source">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="se-tab"
            data-active={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bloom" ? (
        <div className="se-panel">
          <div className="se-bg-grid">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pickPreset(g.id)}
                aria-pressed={bg.presetId === g.id}
                aria-label={g.name}
                className="se-bg-tile"
                data-active={bg.presetId === g.id}
              >
                <span className="se-bg-art" style={paintStyle(g.paint)} aria-hidden />
                <span className="se-bg-name">{g.name}</span>
              </button>
            ))}
          </div>
          {recents.length > 0 ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <FieldLabel>Recently used</FieldLabel>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recents.slice(0, 8).map((id) => {
                  const g = gradientPresetById(id);
                  if (!g) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickPreset(id)}
                      aria-label={g.name}
                      title={g.name}
                      className="se-bg-mini"
                      style={paintStyle(g.paint)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "color" ? (
        <div className="se-panel">
          <ColorField
            label="Solid color"
            value={bg.color}
            onChange={(c) => {
              const color = c ?? bg.color;
              patch({
                mode: "solid",
                presetId: null,
                color,
                paint: solid(color),
                ink: autoInkFor(color),
              });
            }}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {BLOOM_PALETTE.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  patch({
                    mode: "solid",
                    presetId: null,
                    color: s.color,
                    paint: solid(s.color),
                    ink: s.on,
                  })
                }
                aria-label={s.label}
                aria-pressed={bg.mode === "solid" && bg.color === s.color}
                className="se-palette-chip"
                data-active={bg.mode === "solid" && bg.color === s.color}
                style={{ background: s.color, color: s.on }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "gradient" ? (
        <div className="se-panel">
          <FieldLabel hint="Two Bloom colors, one angle">Build your own</FieldLabel>
          <div className="flex items-center gap-3">
            <span className="se-grad-preview" style={paintStyle(bg.paint)} aria-hidden />
            <div className="flex-1">
              <ColorField
                label="From"
                value={paintEdges(bg.paint).from}
                onChange={(c) =>
                  c &&
                  setPaint(
                    linear(bg.angle, [
                      [0, c],
                      [100, paintEdges(bg.paint).to],
                    ]),
                    null,
                    bg.angle,
                  )
                }
              />
            </div>
          </div>
          <ColorField
            label="To"
            value={paintEdges(bg.paint).to}
            onChange={(c) =>
              c &&
              setPaint(
                linear(bg.angle, [
                  [0, paintEdges(bg.paint).from],
                  [100, c],
                ]),
                null,
                bg.angle,
              )
            }
          />
          <SliderRow
            label="Angle"
            min={0}
            max={360}
            value={bg.angle}
            suffix="°"
            onChange={(angle) =>
              setPaint(
                linear(angle, [
                  [0, paintEdges(bg.paint).from],
                  [100, paintEdges(bg.paint).to],
                ]),
                null,
                angle,
              )
            }
          />
        </div>
      ) : null}

      {tab === "photo" ? (
        <div className="se-panel">
          <button type="button" className="se-wide-btn" onClick={onUsePhoto}>
            <ImagePlus className="size-4" aria-hidden />
            {photo ? "Change photo" : "Use a photo as background"}
          </button>

          {photo ? (
            <>
              <div className="se-quick-row" role="group" aria-label="Quick photo treatments">
                <button
                  type="button"
                  className="se-quick"
                  data-active={photo.fit === "fit"}
                  onClick={() => setPhoto({ fit: "fit", blur: 0 })}
                >
                  FIT
                </button>
                <button
                  type="button"
                  className="se-quick"
                  data-active={photo.fit === "fill" && photo.blur === 0}
                  onClick={() => setPhoto({ fit: "fill", blur: 0 })}
                >
                  FILL
                </button>
                <button
                  type="button"
                  className="se-quick"
                  data-active={photo.blur >= 18}
                  onClick={() => setPhoto({ blur: photo.blur >= 18 ? 0 : 22 })}
                >
                  BLUR
                </button>
                <button
                  type="button"
                  className="se-quick"
                  data-active={bg.overlay?.color === "#0B0912"}
                  onClick={() =>
                    patch({
                      overlay:
                        bg.overlay?.color === "#0B0912"
                          ? null
                          : { color: "#0B0912", opacity: 0.42 },
                      ink: "#F7F1E3",
                    })
                  }
                >
                  DARKEN
                </button>
                <button
                  type="button"
                  className="se-quick"
                  data-active={bg.overlay?.color === "#FBF7EC"}
                  onClick={() =>
                    patch({
                      overlay:
                        bg.overlay?.color === "#FBF7EC"
                          ? null
                          : { color: "#FBF7EC", opacity: 0.45 },
                      ink: "#211C12",
                    })
                  }
                >
                  LIGHTEN
                </button>
              </div>

              <SliderRow
                label="Blur"
                min={0}
                max={40}
                value={photo.blur}
                onChange={(v) => setPhoto({ blur: v })}
              />
              <SliderRow
                label="Zoom"
                min={1}
                max={2.5}
                step={0.01}
                value={photo.zoom}
                onChange={(v) => setPhoto({ zoom: v })}
              />
              <SliderRow
                label="Shift across"
                min={-50}
                max={50}
                value={photo.panX * 100}
                suffix="%"
                onChange={(v) => setPhoto({ panX: v / 100 })}
              />
              <SliderRow
                label="Shift down"
                min={-50}
                max={50}
                value={photo.panY * 100}
                suffix="%"
                onChange={(v) => setPhoto({ panY: v / 100 })}
              />
              <SliderRow
                label="Opacity"
                min={10}
                max={100}
                value={Math.round(photo.opacity * 100)}
                suffix="%"
                onChange={(v) => setPhoto({ opacity: v / 100 })}
              />
            </>
          ) : (
            <p className="se-hint">
              Pick a photo and it sits behind everything — safe zones, text and photo slots stay
              put. Blur or darken it if the text needs to breathe.
            </p>
          )}
        </div>
      ) : null}

      {tab === "texture" ? (
        <div className="se-panel">
          <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Texture">
            {TEXTURES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={bg.texture === t.id}
                onClick={() => patch({ texture: t.id as TextureId })}
                className="se-texture-tile"
                data-active={bg.texture === t.id}
              >
                {t.name}
              </button>
            ))}
          </div>
          {bg.texture !== "none" ? (
            <SliderRow
              label="Texture strength"
              min={0}
              max={100}
              value={Math.round(bg.textureOpacity * 100)}
              suffix="%"
              onChange={(v) => patch({ textureOpacity: v / 100 })}
            />
          ) : null}

          <div className="se-divider" aria-hidden />

          <FieldLabel hint="Keeps text readable over anything">Light overlay</FieldLabel>
          <div className="se-quick-row">
            <button
              type="button"
              className="se-quick"
              data-active={!bg.overlay}
              onClick={() => patch({ overlay: null })}
            >
              Off
            </button>
            <button
              type="button"
              className="se-quick"
              data-active={bg.overlay?.color === "#0B0912"}
              onClick={() =>
                patch({
                  overlay: { color: "#0B0912", opacity: bg.overlay?.opacity ?? 0.35 },
                  ink: "#F7F1E3",
                })
              }
            >
              Dark
            </button>
            <button
              type="button"
              className="se-quick"
              data-active={bg.overlay?.color === "#FBF7EC"}
              onClick={() =>
                patch({
                  overlay: { color: "#FBF7EC", opacity: bg.overlay?.opacity ?? 0.4 },
                  ink: "#211C12",
                })
              }
            >
              Light
            </button>
            <button
              type="button"
              className="se-quick"
              onClick={() =>
                patch({
                  overlay: {
                    color: "#6D2E46",
                    opacity: 0.22,
                  },
                })
              }
            >
              Warm
            </button>
          </div>
          {bg.overlay ? (
            <>
              <SliderRow
                label="Overlay strength"
                min={0}
                max={100}
                value={Math.round(bg.overlay.opacity * 100)}
                suffix="%"
                onChange={(v) => patch({ overlay: { color: bg.overlay!.color, opacity: v / 100 } })}
              />
              <ColorField
                label="Overlay color"
                value={bg.overlay.color}
                onChange={(c) =>
                  c && patch({ overlay: { color: c, opacity: bg.overlay!.opacity } })
                }
              />
            </>
          ) : null}

          <button
            type="button"
            className="se-wide-btn se-wide-btn-ghost"
            onClick={() => patch({ ink: readableInk(bg.color) })}
          >
            <Wand2 className="size-4" aria-hidden /> Suggest text color
          </button>
        </div>
      ) : null}
    </StorySheet>
  );
}
