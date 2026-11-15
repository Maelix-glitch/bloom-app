// @vitest-environment jsdom
/**
 * The Coach composer's half of the submit contract.
 *
 * PR #106 promised the composer clears whenever the message is safely in
 * the thread, but the composer waited for the reply itself — for a photo
 * the caption and chip sat in the dock for the whole ~25s flight, looking
 * like the send never happened. The fix is an accepted signal: the page
 * calls `onAccepted` the moment the user message is appended to the
 * thread, and the composer clears then. These tests pin the contract:
 *   · accepted → the composer clears while the reply is still in flight,
 *     and the photo's preview URL is NOT revoked (the thread owns it now);
 *   · rejected → nothing was sent, so the draft AND the attachment stay
 *     exactly as they were — the data-loss trap a naive clear-on-send
 *     would walk straight into;
 *   · failed after accept → the composer stays clear (the message is in
 *     the thread carrying its own Try again) and the notice says so;
 *   · answered without the signal → the final outcome still clears, so
 *     the composer never depends on the signal alone.
 */
import { createElement, forwardRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/*
 * motion/react is mocked out (same stub as Welcome.test.tsx): jsdom never
 * runs animation frames, and these assertions are about the submit
 * contract, not the chip's entrance.
 */
vi.mock("motion/react", () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        forwardRef(function MotionStub(props: Record<string, unknown>, ref) {
          const {
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            variants: _variants,
            whileHover: _whileHover,
            whileTap: _whileTap,
            ...rest
          } = props;
          return createElement(tag, { ...rest, ref });
        }),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: unknown }) => children,
    useReducedMotion: () => true,
  };
});

import { Composer, type ComposerAttachment, type ComposerSubmitOutcome } from "./Composer";

afterEach(cleanup);

const PREVIEW_URL = "blob:fern-preview";

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

type SubmitFn = (
  text: string,
  attachment: ComposerAttachment | null,
  onAccepted: () => void,
) => Promise<ComposerSubmitOutcome>;

function Harness({
  onSubmit,
  onNotice,
}: {
  onSubmit: SubmitFn;
  onNotice: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <Composer
      draft={draft}
      onDraftChange={setDraft}
      placeholder="What are you thinking about?"
      thinking={false}
      inputRef={inputRef}
      onSubmit={onSubmit}
      onOpenCamera={() => {}}
      onNotice={onNotice}
      onOpenContext={() => {}}
      contextLabel="Personal context"
      contextLive={false}
      followUps={[]}
      onFollowUp={() => {}}
    />
  );
}

const textbox = () => screen.getByLabelText("Message Bloom") as HTMLTextAreaElement;
const sendButton = () => screen.getByLabelText("Send message") as HTMLButtonElement;

function typeDraft(value: string) {
  fireEvent.change(textbox(), { target: { value } });
}

function attachPhoto(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"][accept="image/*"]',
  ) as HTMLInputElement | null;
  if (!input) throw new Error("photo input missing");
  const file = new File(["fake-jpeg-bytes"], "fern.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });
}

function submit(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("composer form missing");
  fireEvent.submit(form);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("Composer submit contract — the accepted signal", () => {
  it("clears the draft and chip the moment the send is accepted, while the reply is still in flight", async () => {
    const flight = deferred<ComposerSubmitOutcome>();
    const seen: { text?: string; attachment?: ComposerAttachment | null } = {};
    const onSubmit = vi.fn<SubmitFn>((text, attachment, onAccepted) => {
      seen.text = text;
      seen.attachment = attachment;
      onAccepted();
      return flight.promise;
    });
    const { container } = render(<Harness onSubmit={onSubmit} onNotice={() => {}} />);
    typeDraft("What is in this photo?");
    attachPhoto(container);
    expect(screen.getByText("fern.jpg")).toBeTruthy();

    submit(container);

    /* The reply has NOT landed — the promise is still pending — but the
       composer has already let go of its copy. */
    expect(textbox().value).toBe("");
    expect(screen.queryByText("fern.jpg")).toBeNull();
    expect(seen.text).toBe("What is in this photo?");
    expect(seen.attachment?.name).toBe("fern.jpg");
    /* The preview URL belongs to the thread now; revoking it here would
       break the photo in the message above. */
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(PREVIEW_URL);

    /* And once the reply lands, nothing comes back. */
    flight.resolve("answered");
    await act(async () => {});
    expect(textbox().value).toBe("");
    expect(screen.queryByText("fern.jpg")).toBeNull();
  });

  it("keeps the draft and the attachment untouched when the send is rejected", async () => {
    const onSubmit = vi.fn<SubmitFn>(() => Promise.resolve("rejected"));
    const { container } = render(<Harness onSubmit={onSubmit} onNotice={() => {}} />);
    typeDraft("Don't lose this");
    attachPhoto(container);

    submit(container);

    /* Wait until the outcome has been handled (busy clears), then the
       draft must be exactly as it was — words and photo alike. */
    await waitFor(() => expect(sendButton().disabled).toBe(false));
    expect(textbox().value).toBe("Don't lose this");
    expect(screen.getByText("fern.jpg")).toBeTruthy();
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(PREVIEW_URL);
  });

  it("stays clear when an accepted send fails, and points at the Try again on the message", async () => {
    const onNotice = vi.fn();
    const onSubmit = vi.fn<SubmitFn>((_text, _attachment, onAccepted) => {
      onAccepted();
      return Promise.resolve("failed");
    });
    const { container } = render(<Harness onSubmit={onSubmit} onNotice={onNotice} />);
    typeDraft("How many calories in this?");
    attachPhoto(container);

    submit(container);

    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith(
        "That reply didn't make it — tap Try again on your message above.",
      ),
    );
    expect(textbox().value).toBe("");
    expect(screen.queryByText("fern.jpg")).toBeNull();
  });

  it("still clears on the final outcome even if the accepted signal never fired", async () => {
    const onSubmit = vi.fn<SubmitFn>(() => Promise.resolve("answered"));
    const { container } = render(<Harness onSubmit={onSubmit} onNotice={() => {}} />);
    typeDraft("A plain message");

    submit(container);

    await waitFor(() => expect(textbox().value).toBe(""));
  });
});
