/**
 * InteractiveTray — poll, question, slider, countdown, mention, date.
 * Each builder is a tiny form; the editor places the finished sticker at
 * canvas center and selects it for dragging.
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

import { StorySheet } from "./StorySheet";
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

const TOOLS: { id: Tool; label: string; hint: string; icon: typeof AtSign }[] = [
  { id: "poll", label: "Poll", hint: "Morning or night?", icon: BarChart3 },
  { id: "question", label: "Question", hint: "Invite kind answers", icon: MessageCircleQuestion },
  { id: "slider", label: "Slider", hint: "How was your day?", icon: SlidersHorizontal },
  { id: "countdown", label: "Countdown", hint: "To something good", icon: CalendarClock },
  { id: "mention", label: "Mention", hint: "Tag a person", icon: AtSign },
  { id: "date", label: "Date", hint: "Stamp the memory", icon: CalendarDays },
];

const SLIDER_EMOJI = ["🌸", "😊", "❤️", "✨", "🌙", "🔥", "😴", "🎉"];

const inputCls =
  "w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-[13.5px] outline-none transition-colors placeholder:text-faint/70 focus:border-border-strong";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
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
    <StorySheet
      title={tool ? TOOLS.find((t) => t.id === tool)!.label : "Interactive"}
      subtitle={tool ? TOOLS.find((t) => t.id === tool)!.hint : "Stickers people can touch."}
      onClose={onClose}
    >
      {!tool ? (
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {TOOLS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTool(t.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 px-3.5 py-3.5 text-left transition-colors hover:border-border-strong"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-muted-foreground">
                  <t.icon className="size-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold">{t.label}</span>
                  <span className="block truncate text-[11.5px] text-faint">{t.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          <button
            type="button"
            onClick={() => setTool(null)}
            className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> All interactive
          </button>
          {tool === "poll" ? <PollBuilder onAdd={onAdd} /> : null}
          {tool === "question" ? <QuestionBuilder onAdd={onAdd} /> : null}
          {tool === "slider" ? <SliderBuilder onAdd={onAdd} /> : null}
          {tool === "countdown" ? <CountdownBuilder onAdd={onAdd} /> : null}
          {tool === "mention" ? <MentionBuilder onAdd={onAdd} /> : null}
          {tool === "date" ? <DateBuilder onAdd={onAdd} /> : null}
        </div>
      )}
    </StorySheet>
  );
}

function AddButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="bsheet-primary mt-1 w-full justify-center disabled:opacity-40"
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
          placeholder="Morning or night?"
          maxLength={ELEMENT_LIMITS.maxPollQuestion}
          className={inputCls}
        />
      </Row>
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Options ({options.filter((o) => o.trim()).length}/4)</span>
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
              aria-label={`Option ${i + 1}`}
              className={inputCls}
            />
            {options.length > 2 ? (
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                aria-label={`Remove option ${i + 1}`}
                className="grid w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
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
            className="rounded-xl border border-dashed border-border px-3 py-2 text-[12.5px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            + Add option
          </button>
        ) : null}
      </div>
      <AddButton disabled={!valid} onClick={() => onAdd(makePollElement(question, options))}>
        Add poll
      </AddButton>
    </>
  );
}

function QuestionBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <>
      <Row label="Ask your people">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, ELEMENT_LIMITS.maxQuestionPrompt))}
          placeholder="What's one small thing that made your day better?"
          maxLength={ELEMENT_LIMITS.maxQuestionPrompt}
          className={inputCls}
        />
      </Row>
      <p className="text-[12px] text-faint">
        Answers arrive privately — only you see who wrote what.
      </p>
      <AddButton disabled={!prompt.trim()} onClick={() => onAdd(makeQuestionElement(prompt))}>
        Add question
      </AddButton>
    </>
  );
}

function SliderBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [prompt, setPrompt] = useState("");
  const [emoji, setEmoji] = useState(SLIDER_EMOJI[0]!);
  return (
    <>
      <Row label="Prompt">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, ELEMENT_LIMITS.maxSliderPrompt))}
          placeholder="How was your day?"
          maxLength={ELEMENT_LIMITS.maxSliderPrompt}
          className={inputCls}
        />
      </Row>
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Knob</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Slider emoji">
          {SLIDER_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              aria-label={`Use ${e}`}
              onClick={() => setEmoji(e)}
              className={cn(
                "grid size-10 place-items-center rounded-xl border text-[20px] transition-all",
                emoji === e ? "border-border-strong bg-surface-3" : "border-transparent",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <AddButton disabled={!prompt.trim()} onClick={() => onAdd(makeSliderElement(prompt, emoji))}>
        Add slider
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
      <Row label="What are you counting to?">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, ELEMENT_LIMITS.maxCountdownTitle))}
          placeholder="Trip to the coast"
          maxLength={ELEMENT_LIMITS.maxCountdownTitle}
          className={inputCls}
        />
      </Row>
      <Row label="Date and time">
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className={cn(inputCls, "dark:[color-scheme:dark]")}
        />
      </Row>
      <AddButton
        disabled={!valid}
        onClick={() => onAdd(makeCountdownElement(title, new Date(at).toISOString()))}
      >
        Add countdown
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
        <p className="text-[12px] text-rose">
          Usernames are 3–30 letters, numbers, or underscores.
        </p>
      ) : null}
      <AddButton disabled={!valid} onClick={() => onAdd(makeMentionElement(clean))}>
        Add mention
      </AddButton>
    </>
  );
}

function DateBuilder({ onAdd }: { onAdd: (el: StoryElement) => void }) {
  const [style, setStyle] = useState<"soft" | "mono" | "display">("soft");
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Style</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Date style">
          {(["soft", "mono", "display"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              onClick={() => setStyle(s)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2.5 text-[13px] capitalize transition-colors",
                style === s
                  ? "border-border-strong bg-surface-3 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid place-items-center rounded-2xl border border-border bg-surface/60 py-5">
        <span className="sx-date" data-style={style}>
          {new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <AddButton onClick={() => onAdd(makeDateElement({ style }))}>Add date</AddButton>
    </>
  );
}
