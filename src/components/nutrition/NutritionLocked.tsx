/**
 * NutritionLocked — the Nutrition tab before the Assessment (M-251,
 * owner directive 2026-11-26: "the Nutrition tab opens only after
 * the Assessment is completed").
 *
 * The tab itself stays in the nav; this locked invitation is what
 * the page renders until the person's Assessment is complete. It is
 * the house Assessment invitation (EmptyState — one headline, one
 * line, one gold action) pointed at the Assessment's real home on
 * the Profile page. A completed Assessment — including every
 * assessment stored before the country question existed — opens
 * Nutrition normally; nothing about the person's other tabs changes.
 */

import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function NutritionLocked() {
  return (
    <div className="nut-wrap nut-page">
      <EmptyState
        title="Nutrition opens after your Assessment"
        description="Your plan, your dishes and your targets are all built from your Assessment answers. It takes a few minutes, and everything here opens the moment you finish."
        action={
          <Button asChild>
            <Link to="/profile" hash="pf-assessment">
              Start your Assessment
            </Link>
          </Button>
        }
      />
    </div>
  );
}
