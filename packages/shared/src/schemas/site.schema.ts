import { z } from "zod";

export const SITE_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/i;

/**
 * Validated at the HTTP boundary on the backend, and reused on the
 * frontend to give the same validation feedback before a request is sent.
 */
export const CreateSiteSchema = z.object({
  siteId: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(SITE_ID_PATTERN, "siteId may only contain letters, numbers, - and _"),
  name: z.string().trim().min(1).max(128).optional(),
});
export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
