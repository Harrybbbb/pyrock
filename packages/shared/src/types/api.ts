import type { EventType, FailureReasonCode, MessageStatus } from "../schemas/index.js";

export interface EventDto {
  eventType: EventType;
  material: string | null;
  quantity: number | null;
  unit: string | null;
  supplier?: string | null;
  confidence: number;
}

export interface MessageDto {
  id: string;
  messageId: string;
  siteId: string;
  text: string;
  timestamp: string;
  status: MessageStatus;
  events: EventDto[];
  failureReason: string | null;
  failureCode: FailureReasonCode | null;
  /** Free-text follow-up the user supplied when resolving a NEEDS_REVIEW/FAILED message, if any. */
  clarification: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDto {
  id: string;
  siteId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  siteId: string;
  material: string;
  unit: string;
  received: number;
  consumed: number;
  quantity: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
