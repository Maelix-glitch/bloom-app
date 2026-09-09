import { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";

import type { CoachBlock } from "@/hooks/useCoachSystem";
import { cn } from "@/lib/utils";

function Sparkline({ values, accent }: { values: number[]; accent?: string | undefined }) {
  const safe = values.length > 1 ? values : [3, 3, 3, 3, 3];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = Math.max(1, max - min);
  const points = safe
    .map(
      (value, index) =>
        `${(index / (safe.length - 1)) * 100},${100 - ((value - min) / span) * 76 - 12}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("coach-spark", accent && `coach-spark-${accent}`)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricBlock({ block }: { block: Extract<CoachBlock, { type: "metric" }> }) {
  return (
    <div className={cn("coach-block coach-metric", block.accent && `coach-accent-${block.accent}`)}>
      <div className="coach-metric-copy">
        <p className="coach-block-label">{block.label}</p>
        <p className="coach-metric-value">{block.value}</p>
        {block.detail ? <p className="coach-metric-detail">{block.detail}</p> : null}
      </div>
      <div className="coach-metric-chart">
        <Sparkline values={block.series} accent={block.accent} />
      </div>
    </div>
  );
}

function PlanBlock({
  block,
  onAction,
}: {
  block: Extract<CoachBlock, { type: "plan" }>;
  onAction: (action: string) => void;
}) {
  return (
    <div className="coach-block coach-plan">
      <div className="coach-plan-head">
        <p className="coach-block-label">Your next step</p>
        <p className="coach-plan-title">{block.title}</p>
        {block.detail ? <p className="coach-plan-detail">{block.detail}</p> : null}
      </div>
      <ol className="coach-plan-steps">
        {block.steps.map((step, index) => (
          <li key={`${step.label}-${index}`} className="coach-plan-step">
            <span className="coach-plan-step-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="coach-plan-step-copy">
              <span className="coach-plan-step-label">{step.label}</span>
              {step.time ? <span className="coach-plan-step-time">{step.time}</span> : null}
            </span>
            <Check className="coach-plan-step-check" aria-hidden="true" />
          </li>
        ))}
      </ol>
      <div className="coach-block-actions">
        <button
          type="button"
          className="coach-block-action-primary"
          onClick={() => onAction("plan-start")}
        >
          Use as a starting point <ArrowRight className="coach-block-action-icon" />
        </button>
        <button
          type="button"
          className="coach-block-action-ghost"
          onClick={() => onAction("plan-adjust")}
        >
          Adjust it
        </button>
      </div>
    </div>
  );
}

function ProposalBlock({
  block,
  onAction,
  onDismiss,
}: {
  block: Extract<CoachBlock, { type: "proposal" }>;
  onAction: (action: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="coach-block coach-proposal">
      <div className="coach-proposal-head">
        <p className="coach-block-label">A change worth weighing</p>
        <p className="coach-proposal-title">{block.title}</p>
        {block.detail ? <p className="coach-proposal-detail">{block.detail}</p> : null}
      </div>
      {block.changes?.length ? (
        <ul className="coach-proposal-changes">
          {block.changes.map((change, index) => (
            <li key={`${change.label}-${index}`} className="coach-proposal-change">
              <span className="coach-proposal-change-label">{change.label}</span>
              <span className="coach-proposal-change-path">
                <em>{change.from || "—"}</em>
                <span aria-hidden="true">→</span>
                <strong>{change.to || "—"}</strong>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="coach-block-actions">
        <button
          type="button"
          className="coach-block-action-primary"
          onClick={() => onAction("proposal-explore")}
        >
          Explore this change <ArrowRight className="coach-block-action-icon" />
        </button>
        <button type="button" className="coach-block-action-ghost" onClick={onDismiss}>
          <X className="coach-block-action-icon" /> Not now
        </button>
      </div>
    </div>
  );
}

/**
 * Structured pieces the grounded responder emits (metric / plan / proposal).
 * Each has its own quiet visual voice — a number with its real line, a next
 * step with a sage check, a weighed change in lavender. Nothing here is ever
 * synthesised; blocks arrive already grounded in the record.
 */
export function ResponseBlocks({
  blocks,
  onAction,
}: {
  blocks: CoachBlock[];
  onAction: (action: string) => void;
}) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  return (
    <div className="coach-blocks">
      {blocks.map((block, index) => {
        if (hidden.has(index)) return null;
        if (block.type === "metric") return <MetricBlock key={`m-${index}`} block={block} />;
        if (block.type === "plan")
          return <PlanBlock key={`p-${index}`} block={block} onAction={onAction} />;
        return (
          <ProposalBlock
            key={`o-${index}`}
            block={block}
            onAction={onAction}
            onDismiss={() => setHidden((current) => new Set(current).add(index))}
          />
        );
      })}
    </div>
  );
}
