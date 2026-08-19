import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  EVENT_TYPES,
  FAILURE_REASON_CODES,
  MESSAGE_STATUSES,
  type EventType,
  type FailureReasonCode,
  type MessageStatus,
} from "@pyrock/shared";

export type MessageDocument = HydratedDocument<Message>;

@Schema({ _id: false })
export class MessageEvent {
  @Prop({ required: true, enum: EVENT_TYPES })
  eventType!: EventType;

  @Prop({ type: String, default: null })
  material!: string | null;

  @Prop({ type: Number, default: null })
  quantity!: number | null;

  @Prop({ type: String, default: null })
  unit!: string | null;

  @Prop({ type: String, default: null })
  supplier?: string | null;

  @Prop({ required: true })
  confidence!: number;
}
export const MessageEventSchema = SchemaFactory.createForClass(MessageEvent);

@Schema({ timestamps: true, collection: "messages" })
export class Message {
  /** Client-supplied idempotency key. Unique index is the DB-level guard against double-processing. */
  @Prop({ required: true, unique: true })
  messageId!: string;

  @Prop({ required: true, index: true })
  siteId!: string;

  /** The raw, unmodified text as submitted — preserved separately from whatever the AI extracts. */
  @Prop({ required: true })
  text!: string;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ required: true, enum: MESSAGE_STATUSES, default: "PENDING" })
  status!: MessageStatus;

  @Prop({ type: [MessageEventSchema], default: [] })
  events!: MessageEvent[];

  @Prop({ type: String, default: null })
  failureReason!: string | null;

  /** Machine-readable classification of failureReason — drives friendly UI copy and follow-up prompts. */
  @Prop({ type: String, enum: FAILURE_REASON_CODES, default: null })
  failureCode!: FailureReasonCode | null;

  /** Raw model output, kept only when a message lands in NEEDS_REVIEW, for debugging/audit. */
  @Prop({ type: String, default: null })
  rawExtraction!: string | null;

  /** Free-text follow-up supplied via the clarify flow — appended to `text` for re-extraction, never overwrites it. */
  @Prop({ type: String, default: null })
  clarification!: string | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
