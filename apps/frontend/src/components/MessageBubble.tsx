import { useState } from "react";
import type { MessageDto } from "@pyrock/shared";
import { friendlyFailureMessage } from "../utils/failureMessages";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";

type EventDto = MessageDto["events"][number];

/** received → credit, consumed → debit, anything else → a plain note on the log. */
function eventTone(event: EventDto): "in" | "out" | "note" {
  if (event.eventType === "MATERIAL_RECEIVED") return "in";
  if (event.eventType === "MATERIAL_CONSUMED") return "out";
  return "note";
}

function EventLine({ event }: { event: EventDto }) {
  const tone = eventTone(event);
  const sign = tone === "in" ? "+" : tone === "out" ? "−" : "•";

  return (
    <li className={`event-line event-line--${tone}`}>
      <span className="event-line__sign" aria-hidden="true">
        {sign}
      </span>
      {tone === "note" ? (
        <span className="event-line__material">General update</span>
      ) : (
        <>
          <span className="event-line__qty">{event.quantity ?? "?"}</span>
          <span className="event-line__material">
            {event.material ?? "material"}
          </span>
          <span className="event-line__unit">{event.unit ?? "unit"}</span>
        </>
      )}
    </li>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return time;
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })} · ${time}`;
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
    <article
      className={`message-bubble message-bubble--${message.status.toLowerCase()}`}
    >
      <div className="message-bubble__header">
        <span
          className="message-bubble__time"
          title={new Date(message.timestamp).toLocaleString()}
        >
          {formatTime(message.timestamp)}
        </span>
        <StatusBadge status={message.status} />
      </div>

      <p className="message-bubble__text">{message.text}</p>

      {message.clarification && (
        <p className="message-bubble__clarification">
          {message.clarification}
        </p>
      )}

      {message.events.length > 0 && (
        <ul className="message-bubble__events">
          {message.events.map((event, index) => (
            <EventLine key={index} event={event} />
          ))}
        </ul>
      )}

      {message.failureReason && (
        <div className="message-bubble__failure">
          <p className="message-bubble__failure-reason" role="alert">
            <Icon name="alert" size={14} />
            <span>
              {friendlyFailureMessage(message.failureCode, message.failureReason)}{" "}
              <button
                type="button"
                className="text-button text-button--muted"
                onClick={() => setShowDetails((value) => !value)}
              >
                {showDetails ? "hide details" : "details"}
              </button>
            </span>
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
            <Icon name="retry" size={13} />
            Try again
          </button>
        </div>
      )}
    </article>
  );
}
