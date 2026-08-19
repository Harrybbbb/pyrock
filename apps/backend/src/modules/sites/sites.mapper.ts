import type { SiteDto } from "@pyrock/shared";
import type { SiteDocument } from "./schemas/site.schema";

export function toSiteDto(site: SiteDocument): SiteDto {
  return {
    id: site._id.toString(),
    siteId: site.siteId,
    name: site.name,
    createdAt: (site as unknown as { createdAt: Date }).createdAt.toISOString(),
    updatedAt: (site as unknown as { updatedAt: Date }).updatedAt.toISOString(),
  };
}
