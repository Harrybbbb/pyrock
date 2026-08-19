import type { Model } from "mongoose";
import type { ValidatedEvent } from "@pyrock/shared";
import { InventoryService } from "./inventory.service";
import type { InventoryBalanceDocument } from "./schemas/inventory-balance.schema";

function buildEvent(overrides: Partial<ValidatedEvent>): ValidatedEvent {
  return {
    eventType: "MATERIAL_RECEIVED",
    material: "cement",
    quantity: 10,
    unit: "bags",
    supplier: null,
    confidence: 0.9,
    ...overrides,
  };
}

describe("InventoryService", () => {
  let findOneAndUpdate: jest.Mock;
  let model: Model<InventoryBalanceDocument>;
  let service: InventoryService;

  beforeEach(() => {
    findOneAndUpdate = jest.fn().mockResolvedValue({ quantity: 0 });
    model = { findOneAndUpdate } as unknown as Model<InventoryBalanceDocument>;
    service = new InventoryService(model);
  });

  it("increments received and quantity for MATERIAL_RECEIVED", async () => {
    await service.applyEvents("site-1", [
      buildEvent({ eventType: "MATERIAL_RECEIVED", quantity: 100 }),
    ]);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { siteId: "site-1", material: "cement" },
      { $inc: { received: 100, consumed: 0, quantity: 100 }, $setOnInsert: { unit: "bags" } },
      { upsert: true, new: true },
    );
  });

  it("increments consumed and decrements quantity for MATERIAL_CONSUMED", async () => {
    await service.applyEvents("site-1", [
      buildEvent({ eventType: "MATERIAL_CONSUMED", quantity: 35 }),
    ]);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { siteId: "site-1", material: "cement" },
      { $inc: { received: 0, consumed: 35, quantity: -35 }, $setOnInsert: { unit: "bags" } },
      { upsert: true, new: true },
    );
  });

  it("matches the assignment's worked example: 100 received then 35 consumed nets 65", async () => {
    await service.applyEvents("site-1", [
      buildEvent({ eventType: "MATERIAL_RECEIVED", quantity: 100 }),
      buildEvent({ eventType: "MATERIAL_CONSUMED", quantity: 35 }),
    ]);

    const deltas = findOneAndUpdate.mock.calls.map((call) => call[1].$inc.quantity as number);
    expect(deltas.reduce((sum, d) => sum + d, 0)).toBe(65);
  });

  it("skips GENERAL_UPDATE events entirely — no inventory mutation", async () => {
    await service.applyEvents("site-1", [
      buildEvent({ eventType: "GENERAL_UPDATE", material: null, quantity: null, unit: null }),
    ]);

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("normalizes material and unit casing so 'Cement' and 'cement' share one balance", async () => {
    await service.applyEvents("site-1", [
      buildEvent({ material: "Cement", unit: "Bags" }),
    ]);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { siteId: "site-1", material: "cement" },
      expect.objectContaining({ $setOnInsert: { unit: "bags" } }),
      { upsert: true, new: true },
    );
  });
});
