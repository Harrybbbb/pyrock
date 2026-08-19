import { z } from "zod";

export const EVENT_TYPES = [
  "MATERIAL_RECEIVED",
  "MATERIAL_CONSUMED",
  "GENERAL_UPDATE",
] as const;

export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * LLMs occasionally emit the literal string "null" (or "n/a", "none"...)
 * instead of the JSON null value when a field genuinely doesn't apply —
 * observed in practice with gpt-4o-mini on "Used 15 bags" (material came
 * back as the string "null" rather than null, which would otherwise have
 * silently become a real "null" material in inventory). Collapsing these
 * placeholder tokens to actual null keeps the "required" checks below
 * effective regardless of which shape the model chooses.
 */
const NULL_PLACEHOLDER_TOKENS = new Set(["null", "n/a", "na", "none", "unknown", "undefined", ""]);

function sanitizeNullableString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return NULL_PLACEHOLDER_TOKENS.has(trimmed.toLowerCase()) ? null : trimmed;
}

function sanitizeNullableNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (NULL_PLACEHOLDER_TOKENS.has(trimmed.toLowerCase())) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
}

const NullableTrimmedString = z.preprocess(sanitizeNullableString, z.string().trim().min(1).nullable());
const NullableFiniteNumber = z.preprocess(sanitizeNullableNumber, z.number().finite().nullable());

/**
 * Shape the LLM is asked to emit, before validation. Fields are nullable
 * because the model must be able to say "not present" rather than invent
 * a value to satisfy a required field.
 */
export const RawExtractedEventSchema = z.object({
  eventType: EventTypeSchema,
  material: NullableTrimmedString,
  quantity: NullableFiniteNumber,
  unit: NullableTrimmedString,
  supplier: NullableTrimmedString.optional(),
  confidence: z.number().min(0).max(1),
});
export type RawExtractedEvent = z.infer<typeof RawExtractedEventSchema>;

/**
 * The gate that raw model output must pass before it can touch inventory.
 * MATERIAL_RECEIVED / MATERIAL_CONSUMED require material + a positive
 * quantity + unit; GENERAL_UPDATE carries no inventory impact so those
 * fields are optional. This is the boundary called out in the assignment:
 * everything left of here is "the LLM's opinion", everything right of it
 * is trusted application state.
 */
export const ValidatedEventSchema = RawExtractedEventSchema.superRefine((event, ctx) => {
  if (event.eventType === "GENERAL_UPDATE") return;

  if (!event.material) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["material"],
      message: `material is required for ${event.eventType}`,
    });
  }
  if (event.quantity === null || event.quantity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: `quantity must be a positive number for ${event.eventType}`,
    });
  }
  if (!event.unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unit"],
      message: `unit is required for ${event.eventType}`,
    });
  }
});
export type ValidatedEvent = z.infer<typeof ValidatedEventSchema>;

export const ExtractionResultSchema = z.array(RawExtractedEventSchema);

export const CONFIDENCE_REVIEW_THRESHOLD = 0.55;
