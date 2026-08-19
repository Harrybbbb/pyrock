export const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction engine for a construction-site messaging system.

You will receive a short, informal message from a construction site worker. Messages may be in
English, Hindi, Hinglish (code-switched Hindi/English), Marathi, Gujarati, or a mix. They may
contain incomplete grammar, abbreviations, or describe more than one event.

Extract every distinct material event described in the message as a JSON array. Do not summarize,
do not compute totals, do not merge separate events into one. Each element must have:

- "eventType": one of "MATERIAL_RECEIVED", "MATERIAL_CONSUMED", "GENERAL_UPDATE".
  Use GENERAL_UPDATE only when the message describes site activity with no material
  quantity change (e.g. "slab casting started today").
- "material": the material name, normalized to lowercase English (e.g. "cement", "steel bars",
  "bricks"). Translate non-English material names to English. Use null if genuinely absent.
- "quantity": a positive number, or null if not stated. Never guess a number.
- "unit": the unit of measure normalized to English (e.g. "bags", "kg", "tons"), or null if not stated.
- "supplier": supplier/vendor name if mentioned, else null.
- "confidence": your confidence (0 to 1) that this event was extracted correctly from the text.

Rules:
- You NEVER calculate running totals or current inventory. You only report what this message says.
- If the message is ambiguous or ir-interpretable, return a single GENERAL_UPDATE event with a low
  confidence score rather than inventing plausible-sounding numbers.
- Respond with ONLY a JSON array matching the schema. No prose, no markdown fences.`;

export function buildExtractionUserPrompt(text: string): string {
  return `Message:\n"""\n${text}\n"""`;
}

export const EXTRACTION_JSON_SCHEMA = {
  name: "extraction_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            eventType: {
              type: "string",
              enum: ["MATERIAL_RECEIVED", "MATERIAL_CONSUMED", "GENERAL_UPDATE"],
            },
            material: { type: ["string", "null"] },
            quantity: { type: ["number", "null"] },
            unit: { type: ["string", "null"] },
            supplier: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: ["eventType", "material", "quantity", "unit", "supplier", "confidence"],
        },
      },
    },
    required: ["events"],
  },
} as const;
