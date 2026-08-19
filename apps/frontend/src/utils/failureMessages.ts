import type { FailureReasonCode } from "@pyrock/shared";

/** Plain-language version of a failure, shown by default instead of the raw technical reason. */
export const FRIENDLY_FAILURE_MESSAGES: Record<FailureReasonCode, string> = {
  MISSING_MATERIAL: "I couldn't tell which material this was about.",
  MISSING_QUANTITY: "I couldn't find a quantity in that message.",
  MISSING_UNIT: "I'm not sure what unit this was measured in.",
  LOW_CONFIDENCE: "I'm not confident I understood this correctly.",
  NO_EVENTS_EXTRACTED: "I couldn't find a material update in that message.",
  PROVIDER_ERROR: "I couldn't reach the AI service just now.",
  MALFORMED_OUTPUT: "I had trouble understanding that message.",
  UNKNOWN_ERROR: "Something went wrong while processing this message.",
};

/** Follow-up question the assistant "asks" under a message that needs more info. */
export const CLARIFYING_QUESTIONS: Record<FailureReasonCode, string> = {
  MISSING_MATERIAL: "Which material was this about? (e.g. cement, steel bars, bricks)",
  MISSING_QUANTITY: "How many, or how much? Please give me a number.",
  MISSING_UNIT: "What unit was that in? (e.g. bags, kg, tons)",
  LOW_CONFIDENCE: "Could you rephrase that with a bit more detail?",
  NO_EVENTS_EXTRACTED: "Could you rephrase that so I can pick out the material update?",
  PROVIDER_ERROR: "Want to try sending that again?",
  MALFORMED_OUTPUT: "Could you rephrase that?",
  UNKNOWN_ERROR: "Could you try again or rephrase that?",
};

export function friendlyFailureMessage(code: FailureReasonCode | null, fallback: string | null): string {
  if (code) return FRIENDLY_FAILURE_MESSAGES[code];
  return fallback ?? "Something went wrong.";
}
