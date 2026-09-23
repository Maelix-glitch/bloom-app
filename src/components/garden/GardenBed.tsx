import { gardenState, GARDEN_COPY, type GardenState } from "@/lib/garden/growth";
import { useHabits } from "@/hooks/useHabits";
import { useTrackers } from "@/hooks/useTrackers";
import { useMoodSystem } from "@/hooks/useMoodSystem";

const STAGE_EMOJI: Record<string, string> = {
  seed: "🌱",
  sprout: "🌿",
  budding: "🌷",
  bloom: "🌸",
  flourish: "🌺",
  keeper: "🏵️",
};

const STAGE_GRADIENT: Record<string, string> = {
  seed: "from-stone-100 to-stone-200",
  sprout: "from-emerald-50 to-green-100",
  budding: "from-amber-50 to-orange-100",
  bloom: "from-pink-50 to-rose-100",
  flourish: "from-violet-50 to-fuchsia-100",
  keeper: "from-amber-100 to-yellow-100",
};

export function GardenBed({ compact = false }: { compact?: boolean }) {
  const { habits, logs } = useHabits();
  const { days } = useTrackers();
  const { entries } = useMoodSystem();

  const state: GardenState = gardenState({
    habits: (habits as any) ?? [],
    habitLogs: (logs as any) ?? [],
    trackerDays: (days as any) ?? [],
    moodEntries: (entries as any) ?? [],
  });

  return (
    <div className={`rounded-[18px] border border-border bg-gradient-to-br ${STAGE_GRADIENT[state.stage]} p-4 ${compact ? "" : "md:p-6"}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-muted-foreground">LIVING GARDEN</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl">{STAGE_EMOJI[state.stage]}</span>
            <span className="text-[18px] font-semibold tracking-tight text-foreground">{state.label}</span>
            {state.wilting && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">needs water</span>}
          </div>
          <div className="mt-1 max-w-[36ch] text-[13px] leading-5 text-muted-foreground">{GARDEN_COPY[state.stage]}</div>
        </div>
        <div className="hidden text-right md:block">
          <div className="text-[11px] tracking-wide text-muted-foreground">HEALTH</div>
          <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-black/10">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(state.health * 100)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{Math.round(state.health * 100)}%</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/70 px-3 py-2 text-center backdrop-blur">
          <div className="text-[11px] tracking-wide text-muted-foreground">PETALS</div>
          <div className="text-[18px] font-semibold text-foreground">{state.petals}</div>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2 text-center backdrop-blur">
          <div className="text-[11px] tracking-wide text-muted-foreground">STREAK</div>
          <div className="text-[18px] font-semibold text-foreground">{state.streak}d</div>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2 text-center backdrop-blur">
          <div className="text-[11px] tracking-wide text-muted-foreground">SPROUTS</div>
          <div className="text-[18px] font-semibold text-foreground">{state.sprouts}</div>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 text-[11px] text-muted-foreground">
          Garden grows from real logs — habits + trackers + mood. Miss a day? It pauses, never punishes.
        </div>
      )}
    </div>
  );
}
