import { z } from "zod";

/**
 * Machine-readable classification of why a message didn't reach PROCESSED.
 * `failureReason` (free text) stays the audit trail for developers; this
 * code is what clients use to render a friendly message / ask a targeted
 * follow-up question without parsing prose.
 */
export const FAILURE_REASON_CODES = [
  "MISSING_MATERIAL",
  "MISSING_QUANTITY",
  "MISSING_UNIT",
  "LOW_CONFIDENCE",
  "NO_EVENTS_EXTRACTED",
  "PROVIDER_ERROR",
  "MALFORMED_OUTPUT",
  "UNKNOWN_ERROR",
] as const;

export const FailureReasonCodeSchema = z.enum(FAILURE_REASON_CODES);
export type FailureReasonCode = z.infer<typeof FailureReasonCodeSchema>;
