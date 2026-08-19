import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { InventoryItemDto, ValidatedEvent } from "@pyrock/shared";
import {
  InventoryBalance,
  InventoryBalanceDocument,
} from "./schemas/inventory-balance.schema";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryBalance.name)
    private readonly inventoryModel: Model<InventoryBalanceDocument>,
  ) {}

  /**
   * Applies validated events to a site's inventory. Each material's balance is
   * updated with a single atomic `$inc`, so concurrent messages touching the
   * same material can never race each other into a lost update — no
   * multi-document transaction is needed for this step.
   *
   * Design decision: consumption is allowed to drive quantity negative rather
   * than being rejected. Site reporting lags reality (a consumption message
   * can arrive before its matching receipt), and silently dropping the event
   * would hide real activity. Negative balances stay visible in the API/UI as
   * a signal to reconcile, rather than being clamped or blocked. See README.
   */
  async applyEvents(siteId: string, events: ValidatedEvent[]): Promise<void> {
    for (const event of events) {
      if (event.eventType === "GENERAL_UPDATE") continue;
      await this.applyEvent(siteId, event);
    }
  }

  private async applyEvent(
    siteId: string,
    event: ValidatedEvent,
  ): Promise<void> {
    const material = event.material!.trim().toLowerCase();
    const unit = event.unit!.trim().toLowerCase();
    const quantity = event.quantity!;

    const received = event.eventType === "MATERIAL_RECEIVED" ? quantity : 0;
    const consumed = event.eventType === "MATERIAL_CONSUMED" ? quantity : 0;
    const delta = received - consumed;

    const updated = await this.inventoryModel.findOneAndUpdate(
      { siteId, material },
      {
        $inc: { received, consumed, quantity: delta },
        $setOnInsert: { unit },
      },
      { upsert: true, new: true },
    );

    if (updated && updated.quantity < 0) {
      this.logger.warn(
        `Inventory for site=${siteId} material=${material} went negative (${updated.quantity}). ` +
          "Allowed by design; flag for reconciliation.",
      );
    }
  }

  async getInventoryForSite(siteId: string): Promise<InventoryItemDto[]> {
    const balances = await this.inventoryModel
      .find({ siteId })
      .sort({ material: 1 })
      .lean();
    return balances.map((balance) => ({
      siteId: balance.siteId,
      material: balance.material,
      unit: balance.unit,
      received: balance.received,
      consumed: balance.consumed,
      quantity: balance.quantity,
    }));
  }
}
