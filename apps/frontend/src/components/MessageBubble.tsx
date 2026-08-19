import { useState } from "react";
import type { MessageDto } from "@pyrock/shared";
import { friendlyFailureMessage } from "../utils/failureMessages";
import { StatusBadge } from "./StatusBadge";

function formatEvent(event: MessageDto["events"][number]): string {
  const sign =
    event.eventType === "MATERIAL_RECEIVED"
      ? "+"
      : event.eventType === "MATERIAL_CONSUMED"
        ? "-"
        : "";
  if (event.eventType === "GENERAL_UPDATE") return "General update";
  return `${sign}${event.quantity ?? "?"} ${event.material ?? "material"} (${event.unit ?? "unit"})`;
}

interface MessageBubbleProps {
  message: MessageDto;
  disabled: boolean;
  onRetry: (text: string) => void;
}

export function MessageBubble({
  message,
  disabled,
  onRetry,
}: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const canBlindRetry = message.failureCode === "PROVIDER_ERROR";

  return (
    <div className="message-bubble">
      <div className="message-bubble__header">
        <span className="message-bubble__time">
          {new Date(message.timestamp).toLocaleString()}
        </span>
        <StatusBadge status={message.status} />
      </div>
      <p className="message-bubble__text">{message.text}</p>

      {message.clarification && (
        <p className="message-bubble__clarification">
          + {message.clarification}
        </p>
      )}

      {message.events.length > 0 && (
        <ul className="message-bubble__events">
          {message.events.map((event, index) => (
            <li key={index}>{formatEvent(event)}</li>
          ))}
        </ul>
      )}

      {message.failureReason && (
        <div className="message-bubble__failure">
          <p className="message-bubble__failure-reason" role="alert">
            {friendlyFailureMessage(message.failureCode, message.failureReason)}{" "}
            <button
              type="button"
              className="text-button text-button--muted"
              onClick={() => setShowDetails((value) => !value)}
            >
              {showDetails ? "hide details" : "details"}
            </button>
          </p>
          {showDetails && (
            <p className="message-bubble__failure-detail">
              {message.failureReason}
            </p>
          )}
        </div>
      )}

      {canBlindRetry && (
        <div className="message-bubble__actions">
          <button
            type="button"
            className="text-button text-button--retry"
            disabled={disabled}
            onClick={() => onRetry(message.text)}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
