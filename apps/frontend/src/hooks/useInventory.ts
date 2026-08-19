import { useCallback, useEffect, useState } from "react";
import type { InventoryItemDto } from "@pyrock/shared";
import { ApiError, fetchInventory } from "../api/client";

interface UseInventoryResult {
  inventory: InventoryItemDto[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInventory(siteId: string | null): UseInventoryResult {
  const [inventory, setInventory] = useState<InventoryItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) {
      setInventory([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchInventory(siteId);
      setInventory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { inventory, isLoading, error, refresh };
}
