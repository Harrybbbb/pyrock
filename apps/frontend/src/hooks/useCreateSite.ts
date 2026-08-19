import { useState } from "react";
import type { SiteDto } from "@pyrock/shared";
import { ApiError, createSite } from "../api/client";

interface UseCreateSiteResult {
  isCreating: boolean;
  error: string | null;
  create: (siteId: string) => Promise<SiteDto | null>;
}

export function useCreateSite(): UseCreateSiteResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(siteId: string): Promise<SiteDto | null> {
    setIsCreating(true);
    setError(null);
    try {
      return await createSite({ siteId });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add site");
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  return { isCreating, error, create };
}
