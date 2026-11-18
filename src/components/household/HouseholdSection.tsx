/**
 * HouseholdSection — the One-Kitchen Family card on Profile.
 *
 * One kitchen cooks for the whole household. The account holder is
 * member #1 by construction: their pattern and allergies are read
 * from their Assessment and are never re-asked here — this section
 * manages the OTHER people at the table, and says so in plain words.
 *
 * The "Cooks for everyone" count is computed live from the real dish
 * library against every member's pattern and checkable allergies.
 * Allergy words Bloom could not match to an ingredient name are
 * shown as check-manually warnings — never folded into the count as
 * if they had been verified.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { useHousehold } from "@/hooks/useHousehold";
import { DIETARY_LABEL, DIETARY_OPTIONS } from "@/lib/assessment/questions";
import { splitTerms } from "@/lib/household/household";
import type { DietaryPattern } from "@/lib/vitalis/domain/profile";

import "@/styles/household.css";

const PREVIEW_COUNT = 3;

export function HouseholdSection() {
  const { members, table, suitability, caregiver, add, remove } = useHousehold();
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<DietaryPattern | "">("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [formNote, setFormNote] = useState<string | null>(null);

  const owner = table[0];
  const preview = suitability.suiting.slice(0, PREVIEW_COUNT);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormNote("Give the person a name first.");
      return;
    }
    const ok = add({
      name: trimmed,
      pattern: pattern === "" ? null : pattern,
      allergies: splitTerms(allergies),
      dislikes: splitTerms(dislikes),
    });
    if (!ok) {
      setFormNote("Your household list is full — remove someone before adding another.");
      return;
    }
    setName("");
    setPattern("");
    setAllergies("");
    setDislikes("");
    setFormNote(null);
  };

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">One kitchen</p>
          <h2 className="pf-title">Your household</h2>
        </div>
      </div>

      <div className="hh-stack" style={{ marginTop: "var(--space-4)" }}>
        <p className="hh-body">
          One kitchen cooks for everyone at your table. You are member #1 — your pattern and
          allergies come from your Assessment and are never re-asked here. To change yours,
          update your preferences in the Assessment. This list is only for the other people
          you cook for.
        </p>

        {/* Member #1: the account holder, from their own record. */}
        {owner ? (
          <div className="hh-member hh-member--row">
            <div className="hh-member-head">
              <span className="hh-member-name">You</span>
              <span className="hh-line">
                {owner.pattern ? DIETARY_LABEL[owner.pattern] : "No pattern stated"}
              </span>
            </div>
            {caregiver
              .filter((c) => c.member.self)
              .map((c) =>
                c.lines.slice(1).map((line) => (
                  <p key={line} className="hh-line">
                    {line}
                  </p>
                )),
              )}
          </div>
        ) : null}

        {/* Stored members, each with their what-to-watch lines. */}
        {members.map((member) => {
          const lines = caregiver.find((c) => c.member.id === member.id)?.lines ?? [];
          return (
            <div key={member.id} className="hh-member hh-member--row">
              <div className="hh-member-head">
                <span className="hh-member-name">{member.name}</span>
                <button
                  type="button"
                  className="hh-btn hh-btn-quiet"
                  onClick={() => remove(member.id)}
                >
                  Remove
                </button>
              </div>
              {lines.map((line) => (
                <p key={line} className="hh-line">
                  {line}
                </p>
              ))}
            </div>
          );
        })}

        {/* Add a member. */}
        <div className="hh-member">
          <span className="hh-member-name">Add someone you cook for</span>
          <label className="hh-field">
            Name
            <input
              className="hh-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amma"
              maxLength={60}
            />
          </label>
          <label className="hh-field">
            Their dietary pattern
            <select
              className="hh-input"
              value={pattern}
              onChange={(e) => setPattern(e.target.value as DietaryPattern | "")}
            >
              <option value="">No pattern stated</option>
              {DIETARY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="hh-field">
            Allergies (comma-separated, their own words)
            <input
              className="hh-input"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. peanut, shellfish"
            />
          </label>
          <label className="hh-field">
            Dislikes (comma-separated)
            <input
              className="hh-input"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="e.g. bitter gourd, okra"
            />
          </label>
          {formNote ? <p className="hh-line">{formNote}</p> : null}
          <div>
            <button type="button" className="hh-btn hh-btn-gold" onClick={submit}>
              Add to household
            </button>
          </div>
        </div>

        {/* Cooks for everyone — computed live from the dish library. */}
        <div>
          <p className="pf-eyebrow">Cooks for everyone</p>
          <p className="hh-count" style={{ marginTop: "var(--space-2)" }}>
            {suitability.suitingCount} of {suitability.totalDishes} dishes
          </p>
          <p className="hh-body">
            suit everyone at your table — every member's pattern, and no ingredient anyone
            here is allergic to.
          </p>
        </div>

        {suitability.unmatched.length > 0 ? (
          <div className="hh-warn">
            <p>
              Some allergy words could not be checked:{" "}
              {suitability.unmatched
                .map((u) => `"${u.term}" (${u.memberName})`)
                .join(", ")}
              . Bloom could not match{" "}
              {suitability.unmatched.length === 1 ? "it" : "them"} to an ingredient name, so
              the count above covers only the checks that could actually run. Check{" "}
              {suitability.unmatched.length === 1 ? "that one" : "those"} manually — an
              unmatched allergy is never treated as safe.
            </p>
          </div>
        ) : null}

        {preview.length > 0 ? (
          <>
            <ul className="hh-chips">
              {preview.map((dish) => (
                <li key={dish.id} className="hh-chip">
                  {dish.name.en}
                </li>
              ))}
            </ul>
            <div>
              <Link to="/nutrition" className="hh-browse">
                Browse all {suitability.totalDishes.toLocaleString("en-IN")} dishes
              </Link>
            </div>
          </>
        ) : (
          <p className="hh-body">
            No dish in the library suits the whole table right now — try cooking in parts, or
            check whether a pattern above is stricter than the person really eats.
          </p>
        )}
      </div>
    </div>
  );
}
