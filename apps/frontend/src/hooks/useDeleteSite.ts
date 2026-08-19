import { useState } from "react";
import { ApiError, deleteSite } from "../api/client";

interface UseDeleteSiteResult {
  isDeleting: boolean;
  error: string | null;
  remove: (siteId: string) => Promise<boolean>;
}

export function useDeleteSite(): UseDeleteSiteResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(siteId: string): Promise<boolean> {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSite(siteId);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete site");
      return false;
    } finally {
      setIsDeleting(false);
    }
  }

  return { isDeleting, error, remove };
}
