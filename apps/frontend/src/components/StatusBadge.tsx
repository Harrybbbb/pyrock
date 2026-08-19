import type { MessageStatus } from "@pyrock/shared";

const STATUS_LABEL: Record<MessageStatus, string> = {
  PENDING: "Pending",
  PROCESSED: "Logged",
  NEEDS_REVIEW: "Needs input",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
