/**
 * InteractiveTray — Instagram-exact interactive stickers.
 * Dark sheet, list of IG interactive stickers with icons, builders dark.
 */

import { useState } from "react";
import {
  ArrowLeft,
  AtSign,
  BarChart3,
  CalendarClock,
  CalendarDays,
  MessageCircleQuestion,
  SlidersHorizontal,
} from "lucide-react";

import {
  ELEMENT_LIMITS,
  makeCountdownElement,
  makeDateElement,
  makeMentionElement,
  makePollElement,
  makeQuestionElement,
  makeSliderElement,
} from "@/lib/stories/elements";
import type { StoryElement } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

type Tool = "poll" | "question" | "slider" | "countdown" | "mention" | "date";

const TOOLS: { id: Tool; label: string; hint: string; icon: typeof AtSign; color: string }[] = [
  { id: "poll", label: "Poll", hint: "Ask a question", icon: BarChart3, color: "#0095f6" },
  { id: "question", label: "Questions", hint: "Ask me anything", icon: MessageCircleQuestion, color: "#ff6b6b" },
  { id: "slider", label: "Slider", hint: "Emoji slider", icon: SlidersHorizontal, color: "#fa7e1e" },
  { id: "countdown", label: "Countdown", hint: "Counting down to", icon: CalendarClock, color: "#962fbf" },
  { id: "mention", label: "Mention", hint: "Tag people", icon: AtSign, color: "#0095f6" },
  { id: "date", label: "Date", hint: "Current date", icon: CalendarDays, color: "#1DB954" },
];

const SLIDER_EMOJI = ["😍", "🔥", "😂", "❤️", "😮", "😢", "👏", "💯"];

const inputCls =
  "w-full rounded-lg border border-[#363636] bg-[#262626] px-4 py-3 text-[15px] text-white outline-none placeholder:text-[#a8a8a8] focus:border-white/30";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">{label}</span>
      {children}
    </label>
  );
}

export function InteractiveTray({
  onAdd,
  onClose,
}: {
  onAdd: (el: StoryElement) => void;
  onClose: () => void;
}) {
  const [tool, setTool] = useState<Tool | null>(null);

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Interactive stickers">
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col gap-3 border-b border-[#262626] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex items-center justify-between">
            {tool ? (
              <button
                type="button"
                onClick={() => setTool(null)}
                className="flex items-center gap-2 text-[15px] font-medium text-white"
              >
                <ArrowLeft className="size-5" /> Back
              </button>
            ) : (
              <h2 className="text-[16px] font-semibold text-white">Interactive</h2>
            )}
            <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">
              Done
            </button>
          </div>
          {tool ? (
            <p className="text-[13px] text-[#a8a8a8]">{TOOLS.find((t) => t.id === tool)!.hint}</p>
          ) : (
            <p className="text-[13px] text-[#a8a8a8]">Add stickers people can interact with</p>
          )}
        </div>

        <div className="overflow-y-auto px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {!tool ? (
            <ul className="grid grid-cols-2 gap-3">
              {TOOLS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTool(t.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <span
                      className="grid size-10 place-items-center rounded-full text-white"
                      style={{ background: t.color }}
                    >
                      <t.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-white">{t.label}</span>
                      <span className="block truncate text-[12px] text-[#a8a8a8]">{t.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-5">
              {tool === "poll" ? <PollBuilder onAdd={onAdd} /> : null}
              {tool === "question" ? <QuestionBuilder onAdd={onAdd} /> : null}
              {tool === "slider" ? <SliderBuilder onAdd={onAdd} /> : null}
              {tool === "countdown" ? <CountdownBuilder onAdd={onAdd} /> : null}
              {tool === "mention" ? <MentionBuilder onAdd={onAdd} /> : null}
              {tool === "date" ? <DateBuilder onAdd={onAdd} /> : null}
            </div>
          )}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}

function AddButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-2 w-full rounded-full bg-white py-3 text-[15px] font-semibold text-black disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PollBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const valid = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;
  return (
    <>
      <Row label="Question">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, ELEMENT_LIMITS.maxPollQuestion))}
          placeholder="Ask a question…"
          maxLength={ELEMENT_LIMITS.maxPollQuestion}
          className={inputCls}
        />
      </Row>
      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Options</span>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value.slice(0, ELEMENT_LIMITS.maxPollOption);
                setOptions(next);
              }}
              placeholder={`Option ${i + 1}`}
              maxLength={ELEMENT_LIMITS.maxPollOption}
              className={inputCls}
            />
            {options.length > 2 ? (
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                className="grid w-11 shrink-0 place-items-center rounded-lg bg-[#262626] text-white"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {options.length < 4 ? (
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="rounded-lg border border-dashed border-[#363636] py-2.5 text-[14px] text-[#a8a8a8]"
          >
            + Add option
          </button>
        ) : null}
      </div>
      <AddButton disabled={!valid} onClick={() => onAdd(makePollElement(question, options))}>
        Add
      </AddButton>
    </>
  );
}

function QuestionBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <>
      <Row label="Question">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, ELEMENT_LIMITS.maxQuestionPrompt))}
          placeholder="Ask me anything…"
          maxLength={ELEMENT_LIMITS.maxQuestionPrompt}
          className={inputCls}
        />
      </Row>
      <p className="text-[13px] text-[#a8a8a8]">Answers will be sent privately to you</p>
      <AddButton disabled={!prompt.trim()} onClick={() => onAdd(makeQuestionElement(prompt))}>
        Add
      </AddButton>
    </>
  );
}

function SliderBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [prompt, setPrompt] = useState("");
  const [emoji, setEmoji] = useState(SLIDER_EMOJI[0]!);
  return (
    <>
      <Row label="Question">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, ELEMENT_LIMITS.maxSliderPrompt))}
          placeholder="How much do you love this?"
          maxLength={ELEMENT_LIMITS.maxSliderPrompt}
          className={inputCls}
        />
      </Row>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Emoji</span>
        <div className="flex flex-wrap gap-2">
          {SLIDER_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={cn(
                "grid size-12 place-items-center rounded-xl border text-[24px] transition-all",
                emoji === e ? "border-white bg-white/10 scale-110" : "border-[#262626] bg-[#1a1a1a]",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <AddButton disabled={!prompt.trim()} onClick={() => onAdd(makeSliderElement(prompt, emoji))}>
        Add
      </AddButton>
    </>
  );
}

function CountdownBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [title, setTitle] = useState("");
  const [at, setAt] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
  });
  const valid = title.trim().length > 0 && new Date(at).getTime() > Date.now();
  return (
    <>
      <Row label="Countdown name">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, ELEMENT_LIMITS.maxCountdownTitle))}
          placeholder="My birthday"
          maxLength={ELEMENT_LIMITS.maxCountdownTitle}
          className={inputCls}
        />
      </Row>
      <Row label="End time">
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} />
      </Row>
      <AddButton disabled={!valid} onClick={() => onAdd(makeCountdownElement(title, new Date(at).toISOString()))}>
        Add
      </AddButton>
    </>
  );
}

function MentionBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [handle, setHandle] = useState("");
  const clean = handle.replace(/^@/, "").trim().toLowerCase();
  const valid = /^[a-z0-9_]{3,30}$/.test(clean);
  return (
    <>
      <Row label="Username">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.slice(0, 31))}
          placeholder="@username"
          autoCapitalize="none"
          autoCorrect="off"
          className={inputCls}
        />
      </Row>
      {!valid && handle.trim() ? (
        <p className="text-[13px] text-[#ff3040]">3–30 letters, numbers, or _</p>
      ) : null}
      <AddButton disabled={!valid} onClick={() => onAdd(makeMentionElement(clean))}>
        Add
      </AddButton>
    </>
  );
}

function DateBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [style, setStyle] = useState<"soft" | "mono" | "display">("soft");
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Style</span>
        <div className="flex gap-2">
          {(["soft", "mono", "display"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={cn(
                "flex-1 rounded-lg border py-2.5 text-[14px] capitalize",
                style === s ? "border-white bg-white text-black" : "border-[#363636] bg-[#262626] text-white",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid place-items-center rounded-xl bg-[#1a1a1a] border border-[#262626] py-6">
        <span className="rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-black">
          {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      <AddButton onClick={() => onAdd(makeDateElement({ style }))}>Add</AddButton>
    </>
  );
}
