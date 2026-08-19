import { useCallback, useEffect, useState } from "react";
import type { SiteDto } from "@pyrock/shared";
import { ApiError, fetchSites } from "../api/client";

interface UseSitesResult {
  sites: SiteDto[];
  isLoading: boolean;
  error: string | null;
  search: (q: string) => Promise<void>;
}

export function useSites(): UseSitesResult {
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const data = await fetchSites(q);
      setSites(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load sites");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  return { sites, isLoading, error, search };
}
