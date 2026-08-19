import { Fragment, useEffect, useRef, useState } from "react";
import type { MessageDto } from "@pyrock/shared";
import { randomMessageId } from "../utils/id";
import { AssistantPrompt } from "./AssistantPrompt";
import { Icon } from "./Icon";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { QuickExamples } from "./QuickExamples";

interface ChatWindowProps {
  siteId: string;
  messages: MessageDto[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onSend: (input: { messageId: string; text: string }) => Promise<void>;
  onClarify: (id: string, text: string) => Promise<void>;
}

/** Content-related failures get a clarifying question; only provider outages get a blind retry. */
function needsClarification(message: MessageDto): boolean {
  if (message.status === "NEEDS_REVIEW") return true;
  return (
    message.status === "FAILED" && message.failureCode !== "PROVIDER_ERROR"
  );
}

export function ChatWindow({
  siteId,
  messages,
  isLoading,
  isSending,
  error,
  onSend,
  onClarify,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  // Whether the reader is parked at the newest message. Auto-scroll only then,
  // so scrolling back through the log isn't yanked away by an arriving reply.
  const pinnedRef = useRef(true);

  // The API returns newest-first (useful for a general "latest N" list), but a chat
  // reads top-to-bottom chronologically — otherwise a reply to a clarifying question
  // appears above the question it's answering instead of after it.
  const orderedMessages = [...messages].reverse();

  // A plain effect isn't enough: the stream keeps growing after the effect runs
  // (webfonts land, a failure detail expands), and scrollTop set against the
  // old height leaves the newest message clipped. Measuring the stream instead
  // pins the view to the bottom every time its height actually changes.
  useEffect(() => {
    const viewport = historyRef.current;
    const stream = streamRef.current;
    if (!viewport || !stream) return;

    const stickToBottom = () => {
      if (pinnedRef.current) viewport.scrollTop = viewport.scrollHeight;
    };

    stickToBottom();
    const observer = new ResizeObserver(stickToBottom);
    observer.observe(stream);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    pinnedRef.current = true;
    const viewport = historyRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [siteId]);

  function handleHistoryScroll() {
    const el = historyRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    await onSend({ messageId: randomMessageId(), text: trimmed });
    setDraft("");
  }

  const reviewCount = messages.filter(needsClarification).length;
  const meta = isLoading
    ? "Loading conversation…"
    : messages.length === 0
      ? "No updates logged yet"
      : `${messages.length} update${messages.length === 1 ? "" : "s"}${
          reviewCount > 0 ? ` · ${reviewCount} awaiting your input` : ""
        }`;

  return (
    <section className="chat-window">
      <div className="chat-window__bar">
        <div className="chat-window__bar-title">
          <span className="chat-window__bar-icon">
            <Icon name="site" size={17} />
          </span>
          <div className="chat-window__bar-text">
            <h2>{siteId}</h2>
            <span className="chat-window__bar-meta">{meta}</span>
          </div>
        </div>
      </div>

      <div
        className="chat-window__history"
        ref={historyRef}
        onScroll={handleHistoryScroll}
      >
        <div className="chat-window__stream" ref={streamRef}>
          {isLoading && (
            <>
              <div className="skeleton skeleton--bubble" />
              <div className="skeleton skeleton--bubble" />
              <div className="skeleton skeleton--bubble" />
            </>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="chat-window__intro">
              <span className="chat-window__intro-icon">
                <Icon name="sparkle" size={22} />
              </span>
              <h3>Start the log</h3>
              <p>
                Write an update the way you'd say it on site — English, Hindi or
                Hinglish. Pyrock pulls out the materials and keeps the ledger.
              </p>
            </div>
          )}

          {orderedMessages.map((message) => (
            <Fragment key={message.id}>
              <MessageBubble
                message={message}
                disabled={isSending}
                onRetry={submit}
              />
              {needsClarification(message) && (
                <AssistantPrompt
                  message={message}
                  disabled={isSending}
                  onClarify={onClarify}
                />
              )}
            </Fragment>
          ))}

          {isSending && (
            <div
              className="typing-bubble"
              aria-label="Pyrock is reading your update"
            >
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="chat-window__error" role="alert">
          <Icon name="alert" size={15} />
          {error}
        </p>
      )}

      <div className="chat-window__toolbar">
        <QuickExamples disabled={isSending} onPick={setDraft} />
      </div>

      <MessageInput
        value={draft}
        onChangeValue={setDraft}
        disabled={isSending}
        onSend={() => submit(draft)}
      />
    </section>
  );
}
