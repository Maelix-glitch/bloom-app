import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useMoodSystem } from "@/hooks/useMoodSystem";
import { useRailIdentity } from "@/hooks/useRailIdentity";
import type { MoodEntry } from "@/lib/mood/types";
import { Composer } from "@/components/mood/Composer";
import { MoodPage } from "@/components/mood/page/MoodPage";
import { AppNav } from "@/components/home/HomeSidebar";

export const Route = createFileRoute("/mood/")({
  head: () => ({
    meta: [
      { title: "Bloom — Mood" },
      {
        name: "description",
        content:
          "A gentle mood check-in: log how you feel, see your mood journey, and notice calm patterns in your days.",
      },
    ],
  }),
  component: MoodRoute,
});

/**
 * /mood — the Mood page from the harmonious-dashboard model, wired to the
 * real Mood record. The full analytics view (Mood Intelligence) lives at
 * /mood/intelligence and is linked from "See all" / "Explore your insights".
 */
function MoodRoute() {
  const system = useMoodSystem();
  const identity = useRailIdentity();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<MoodEntry | null>(null);

  const openNew = () => {
    setEditing(null);
    setComposerOpen(true);
  };
  const openEdit = (entry: MoodEntry) => {
    setEditing(entry);
    setComposerOpen(true);
  };

  return (
    <div className="mood-page app-shell relative min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="min-w-0 pb-28 lg:pb-16">
        <MoodPage
          system={system}
          identity={{
            displayName: identity.displayName,
            avatarPath: identity.avatarPath,
            accent: identity.accent,
            signedIn: identity.status === "signed-in",
          }}
          onCompose={openNew}
          onEdit={openEdit}
        />
      </main>

      <Composer
        open={composerOpen}
        initial={editing}
        onClose={() => setComposerOpen(false)}
        onSave={system.saveEntry}
        onDelete={(entry) => system.removeEntry(entry.id)}
      />
    </div>
  );
}
