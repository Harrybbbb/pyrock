import { z } from "zod";

export const MESSAGE_STATUSES = [
  "PENDING",
  "PROCESSED",
  "NEEDS_REVIEW",
  "FAILED",
] as const;

export const MessageStatusSchema = z.enum(MESSAGE_STATUSES);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

/**
 * Validated at the HTTP boundary on the backend, and reused on the
 * frontend to give the same validation feedback before a request is sent.
 */
export const CreateMessageSchema = z.object({
  messageId: z.string().trim().min(1).max(128),
  siteId: z.string().trim().min(1).max(128),
  text: z.string().trim().min(1).max(2000),
  timestamp: z.string().datetime({ offset: true }).optional(),
});
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
