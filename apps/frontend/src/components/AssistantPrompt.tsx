import { FormEvent, useState } from "react";
import type { MessageDto } from "@pyrock/shared";
import { CLARIFYING_QUESTIONS } from "../utils/failureMessages";

interface AssistantPromptProps {
  message: MessageDto;
  disabled: boolean;
  onClarify: (messageId: string, additionalText: string) => Promise<void>;
}

/**
 * The assistant's side of the conversation: a clarifying question under a
 * NEEDS_REVIEW/FAILED message, with a reply box. The reply resolves that
 * *same* message in place (PATCH /messages/:id/clarify) — it does not create
 * a new chat turn. Once the parent's message updates to PROCESSED, the
 * message no longer needs clarification and the caller stops rendering this
 * component; there's no separate "done" state to manage here.
 */
export function AssistantPrompt({
  message,
  disabled,
  onClarify,
}: AssistantPromptProps) {
  const [reply, setReply] = useState("");

  if (!message.failureCode) return null;
  const question = CLARIFYING_QUESTIONS[message.failureCode];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed) return;
    setReply("");
    await onClarify(message.id, trimmed);
  }

  return (
    <div className="assistant-prompt">
      <p className="assistant-prompt__question">{question}</p>
      <form className="assistant-prompt__form" onSubmit={handleSubmit}>
        <input
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Type your answer…"
          disabled={disabled}
          aria-label="Reply to assistant"
        />
        <button type="submit" disabled={disabled || !reply.trim()}>
          Reply
        </button>
      </form>
    </div>
  );
}
