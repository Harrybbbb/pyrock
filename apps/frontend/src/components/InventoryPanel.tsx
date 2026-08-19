import type { InventoryItemDto } from "@pyrock/shared";
import { Icon, type IconName } from "./Icon";

interface InventoryPanelProps {
  inventory: InventoryItemDto[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const MATERIAL_ICONS: Record<string, IconName> = {
  cement: "cement",
  bricks: "bricks",
  brick: "bricks",
  steel: "steel",
  rebar: "steel",
  sand: "sand",
  aggregate: "sand",
};

function materialIcon(material: string): IconName {
  return MATERIAL_ICONS[material.toLowerCase()] ?? "stack";
}

const LOW_STOCK_THRESHOLD = 10;

function toneFor(quantity: number): "negative" | "low" | "ok" {
  if (quantity < 0) return "negative";
  if (quantity < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export function InventoryPanel({
  inventory,
  isLoading,
  error,
  onRefresh,
}: InventoryPanelProps) {
  const needsAttention = inventory.filter(
    (item) => toneFor(item.quantity) !== "ok",
  ).length;
  const showList = inventory.length > 0;

  return (
    <aside className="inventory-panel">
      <div className="inventory-panel__header">
        <div className="inventory-panel__title">
          <span className="inventory-panel__title-icon">
            <Icon name="chart" size={17} />
          </span>
          <div>
            <h2>Inventory</h2>
            <p className="inventory-panel__subtitle">Live material balance</p>
          </div>
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
            <Icon name="refresh" size={16} />
          </span>
        </button>
      </div>

      {error && (
        <p className="inventory-panel__error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}

      {showList && (
        <div className="inventory-panel__stats">
          <div className="stat-tile">
            <div className="stat-tile__value">{inventory.length}</div>
            <div className="stat-tile__label">Materials</div>
          </div>
          <div
            className={
              needsAttention > 0 ? "stat-tile stat-tile--alert" : "stat-tile"
            }
          >
            <div className="stat-tile__value">{needsAttention}</div>
            <div className="stat-tile__label">Running low</div>
          </div>
        </div>
      )}

      {isLoading && !showList && !error && (
        <div className="inventory-panel__list">
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
        </div>
      )}

      {!isLoading && !showList && !error && (
        <p className="inventory-panel__hint">
          <Icon name="stack" size={30} />
          Nothing tracked yet. Log an update and the balance builds itself.
        </p>
      )}

      {showList && (
        <ul className="inventory-panel__list">
          {inventory.map((item) => {
            const tone = toneFor(item.quantity);
            return (
              <li
                key={item.material}
                className={
                  tone === "ok" ? "material-row" : `material-row material-row--${tone}`
                }
              >
                <span className="material-row__icon">
                  <Icon name={materialIcon(item.material)} size={17} />
                </span>
                <div className="material-row__body">
                  <div className="material-row__name">{item.material}</div>
                  <div className="material-row__flow">
                    <span>
                      in <span className="material-row__in">{item.received}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      used <span className="material-row__out">{item.consumed}</span>
                    </span>
                  </div>
                </div>
                <div className="material-row__balance">
                  <span className="material-row__qty">{item.quantity}</span>
                  <span className="material-row__unit">{item.unit}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
