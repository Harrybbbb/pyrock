import { Fragment, useEffect, useRef, useState } from "react";
import type { MessageDto } from "@pyrock/shared";
import { randomMessageId } from "../utils/id";
import { AssistantPrompt } from "./AssistantPrompt";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { QuickExamples } from "./QuickExamples";

interface ChatWindowProps {
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
  messages,
  isLoading,
  isSending,
  error,
  onSend,
  onClarify,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);

  // The API returns newest-first (useful for a general "latest N" list), but a chat
  // reads top-to-bottom chronologically — otherwise a reply to a clarifying question
  // appears above the question it's answering instead of after it.
  const orderedMessages = [...messages].reverse();

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    await onSend({ messageId: randomMessageId(), text: trimmed });
    setDraft("");
  }

  return (
    <div className="chat-window">
      <div className="chat-window__history" ref={historyRef}>
        {isLoading && <p className="chat-window__hint">Loading messages…</p>}
        {!isLoading && messages.length === 0 && (
          <p className="chat-window__hint">
            No messages yet for this site. Send one below, or try an example.
          </p>
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
      </div>

      {error && (
        <p className="chat-window__error" role="alert">
          {error}
        </p>
      )}

      <QuickExamples disabled={isSending} onPick={setDraft} />

      <MessageInput
        value={draft}
        onChangeValue={setDraft}
        disabled={isSending}
        onSend={() => submit(draft)}
      />
    </div>
  );
}
