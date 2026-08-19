import type { InventoryItemDto } from "@pyrock/shared";

interface InventoryPanelProps {
  inventory: InventoryItemDto[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const MATERIAL_ICONS: Record<string, string> = {
  cement: "🏗️",
  bricks: "🧱",
  steel: "🔩",
  sand: "⏳",
};

function materialIcon(material: string): string {
  return MATERIAL_ICONS[material.toLowerCase()] ?? "📦";
}

const LOW_STOCK_THRESHOLD = 10;

export function InventoryPanel({
  inventory,
  isLoading,
  error,
  onRefresh,
}: InventoryPanelProps) {
  return (
    <aside className="inventory-panel">
      <div className="inventory-panel__header">
        <div className="inventory-panel__title">
          <span className="inventory-panel__title-icon" aria-hidden="true">
            📊
          </span>
          <h2>Inventory</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh inventory"
          title="Refresh"
        >
          <span className={isLoading ? "icon-button__spinner" : undefined}>
            ⟳
          </span>
        </button>
      </div>
      {error && <p className="inventory-panel__error">{error}</p>}
      {!isLoading && inventory.length === 0 && !error && (
        <p className="inventory-panel__hint">No materials tracked yet.</p>
      )}
      {inventory.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Received</th>
              <th>Used</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const isNegative = item.quantity < 0;
              const isLow = !isNegative && item.quantity < LOW_STOCK_THRESHOLD;
              return (
                <tr key={item.material}>
                  <td>
                    <span className="inventory-panel__material">
                      <span
                        className="inventory-panel__material-icon"
                        aria-hidden="true"
                      >
                        {materialIcon(item.material)}
                      </span>
                      {item.material}
                    </span>
                  </td>
                  <td>{item.received}</td>
                  <td>{item.consumed}</td>
                  <td
                    className={
                      isNegative
                        ? "inventory-panel__available inventory-panel__negative"
                        : isLow
                          ? "inventory-panel__available inventory-panel__low"
                          : "inventory-panel__available"
                    }
                  >
                    {item.quantity} {item.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </aside>
  );
}
