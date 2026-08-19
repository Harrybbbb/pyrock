import type { MessageDto } from "@pyrock/shared";
import type { MessageDocument } from "./schemas/message.schema";

export function toMessageDto(message: MessageDocument): MessageDto {
  return {
    id: message._id.toString(),
    messageId: message.messageId,
    siteId: message.siteId,
    text: message.text,
    timestamp: message.timestamp.toISOString(),
    status: message.status,
    events: message.events.map((event) => ({
      eventType: event.eventType,
      material: event.material,
      quantity: event.quantity,
      unit: event.unit,
      supplier: event.supplier ?? null,
      confidence: event.confidence,
    })),
    failureReason: message.failureReason,
    failureCode: message.failureCode,
    clarification: message.clarification,
    createdAt: (message as unknown as { createdAt: Date }).createdAt.toISOString(),
    updatedAt: (message as unknown as { updatedAt: Date }).updatedAt.toISOString(),
  };
}
