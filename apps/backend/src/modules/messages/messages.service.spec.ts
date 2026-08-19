import type { ConfigService } from "@nestjs/config";
import type { Model } from "mongoose";
import type { RawExtractedEvent } from "@pyrock/shared";
import type { AiExtractionService } from "../ai/ai-extraction.service";
import { AiProviderError } from "../ai/ai.errors";
import type { InventoryService } from "../inventory/inventory.service";
import type { SitesService } from "../sites/sites.service";
import { MessagesService } from "./messages.service";
import type { CreateMessageDto } from "./dto/create-message.dto";
import type { MessageDocument } from "./schemas/message.schema";

function buildMockDoc(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    _id: { toString: () => "mock-id" },
    messageId: "msg-1",
    siteId: "site-1",
    text: "Kal 100 cement bags aaye the, usme se aaj 35 use hue.",
    timestamp: new Date("2026-08-19T00:00:00.000Z"),
    status: "PENDING",
    events: [],
    failureReason: null,
    failureCode: null,
    rawExtraction: null,
    clarification: null,
    createdAt: new Date("2026-08-19T00:00:00.000Z"),
    updatedAt: new Date("2026-08-19T00:00:00.000Z"),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return doc as unknown as MessageDocument;
}

function buildDto(overrides: Partial<CreateMessageDto> = {}): CreateMessageDto {
  return { messageId: "msg-1", siteId: "site-1", text: "some update", ...overrides };
}

describe("MessagesService", () => {
  let messageModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let aiExtractionService: { extractEvents: jest.Mock };
  let inventoryService: { applyEvents: jest.Mock };
  let sitesService: { upsert: jest.Mock };
  let configService: { get: jest.Mock };
  let service: MessagesService;

  beforeEach(() => {
    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    aiExtractionService = { extractEvents: jest.fn() };
    inventoryService = { applyEvents: jest.fn().mockResolvedValue(undefined) };
    sitesService = { upsert: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue({ extraction: { confidenceThreshold: 0.55 } }) };

    service = new MessagesService(
      messageModel as unknown as Model<MessageDocument>,
      aiExtractionService as unknown as AiExtractionService,
      inventoryService as unknown as InventoryService,
      sitesService as unknown as SitesService,
      configService as unknown as ConfigService,
    );
  });

  describe("duplicate messageId protection", () => {
    it("processes a new message exactly once", async () => {
      const doc = buildMockDoc();
      messageModel.create.mockResolvedValue(doc);
      const events: RawExtractedEvent[] = [
        { eventType: "MATERIAL_RECEIVED", material: "cement", quantity: 100, unit: "bags", supplier: null, confidence: 0.9 },
        { eventType: "MATERIAL_CONSUMED", material: "cement", quantity: 35, unit: "bags", supplier: null, confidence: 0.9 },
      ];
      aiExtractionService.extractEvents.mockResolvedValue(events);

      const result = await service.create(buildDto());

      expect(aiExtractionService.extractEvents).toHaveBeenCalledTimes(1);
      expect(inventoryService.applyEvents).toHaveBeenCalledWith("site-1", events);
      expect(result.status).toBe("PROCESSED");
    });

    it("does not reprocess or double-apply inventory when the same messageId is submitted twice", async () => {
      const processedDoc = buildMockDoc({ status: "PROCESSED" });

      // First submission: insert succeeds.
      messageModel.create.mockResolvedValueOnce(processedDoc);
      aiExtractionService.extractEvents.mockResolvedValue([
        { eventType: "MATERIAL_RECEIVED", material: "cement", quantity: 100, unit: "bags", supplier: null, confidence: 0.9 },
      ]);
      await service.create(buildDto());

      // Second submission with the same messageId: unique index rejects the insert.
      const duplicateKeyError = Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
      messageModel.create.mockRejectedValueOnce(duplicateKeyError);
      messageModel.findOne.mockResolvedValueOnce(processedDoc);

      const secondResult = await service.create(buildDto());

      // AI was only ever called once — the duplicate never reached extraction or inventory.
      expect(aiExtractionService.extractEvents).toHaveBeenCalledTimes(1);
      expect(inventoryService.applyEvents).toHaveBeenCalledTimes(1);
      expect(secondResult.status).toBe("PROCESSED");
    });
  });

  describe("extraction failure paths", () => {
    it("marks the message NEEDS_REVIEW when a required field is missing, without touching inventory", async () => {
      const doc = buildMockDoc();
      messageModel.create.mockResolvedValue(doc);
      aiExtractionService.extractEvents.mockResolvedValue([
        { eventType: "MATERIAL_RECEIVED", material: "cement", quantity: null, unit: "bags", supplier: null, confidence: 0.9 },
      ]);

      const result = await service.create(buildDto({ text: "Received cement today" }));

      expect(inventoryService.applyEvents).not.toHaveBeenCalled();
      expect(result.status).toBe("NEEDS_REVIEW");
      expect(result.failureReason).toMatch(/quantity/i);
      expect(result.failureCode).toBe("MISSING_QUANTITY");
    });

    it("marks the message NEEDS_REVIEW when the model returns the literal string \"null\" for material instead of JSON null, without touching inventory", async () => {
      // Regression: observed live with gpt-4o-mini on "Used 15 bags" — the model emitted
      // material: "null" (a string) rather than an actual null, which would otherwise have
      // slipped past a naive `!event.material` check and created a fake "null" material.
      const doc = buildMockDoc();
      messageModel.create.mockResolvedValue(doc);
      aiExtractionService.extractEvents.mockResolvedValue([
        { eventType: "MATERIAL_CONSUMED", material: "null", quantity: 15, unit: "bags", supplier: null, confidence: 0.9 },
      ]);

      const result = await service.create(buildDto({ text: "Used 15 bags" }));

      expect(inventoryService.applyEvents).not.toHaveBeenCalled();
      expect(result.status).toBe("NEEDS_REVIEW");
      expect(result.failureReason).toMatch(/material/i);
      expect(result.failureCode).toBe("MISSING_MATERIAL");
    });

    it("marks the message NEEDS_REVIEW when confidence is below the threshold", async () => {
      const doc = buildMockDoc();
      messageModel.create.mockResolvedValue(doc);
      aiExtractionService.extractEvents.mockResolvedValue([
        { eventType: "MATERIAL_RECEIVED", material: "cement", quantity: 20, unit: "bags", supplier: null, confidence: 0.2 },
      ]);

      const result = await service.create(buildDto());

      expect(inventoryService.applyEvents).not.toHaveBeenCalled();
      expect(result.status).toBe("NEEDS_REVIEW");
      expect(result.failureReason).toMatch(/low-confidence/i);
      expect(result.failureCode).toBe("LOW_CONFIDENCE");
    });

    it("marks the message FAILED when the AI provider errors or times out", async () => {
      const doc = buildMockDoc();
      messageModel.create.mockResolvedValue(doc);
      aiExtractionService.extractEvents.mockRejectedValue(new AiProviderError("timeout"));

      const result = await service.create(buildDto());

      expect(inventoryService.applyEvents).not.toHaveBeenCalled();
      expect(result.status).toBe("FAILED");
      expect(result.failureReason).toBe("timeout");
      expect(result.failureCode).toBe("PROVIDER_ERROR");
    });
  });

  describe("clarify", () => {
    it("resolves a NEEDS_REVIEW message in place — no new message is created, inventory applied once", async () => {
      const claimedDoc = buildMockDoc({
        status: "PENDING",
        text: "Used 15 bags",
        clarification: "cement",
      });
      messageModel.findOneAndUpdate.mockResolvedValue(claimedDoc);
      aiExtractionService.extractEvents.mockResolvedValue([
        { eventType: "MATERIAL_CONSUMED", material: "cement", quantity: 15, unit: "bags", supplier: null, confidence: 0.9 },
      ]);

      const result = await service.clarify("mock-id", { text: "cement" });

      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "mock-id", status: { $in: ["NEEDS_REVIEW", "FAILED"] } },
        { $set: { status: "PENDING", clarification: "cement" } },
        { new: true },
      );
      expect(aiExtractionService.extractEvents).toHaveBeenCalledWith("Used 15 bags — cement");
      expect(inventoryService.applyEvents).toHaveBeenCalledTimes(1);
      expect(messageModel.create).not.toHaveBeenCalled();
      expect(result.status).toBe("PROCESSED");
    });

    it("is idempotent when the message was already resolved (or claimed by a concurrent clarify)", async () => {
      const alreadyProcessed = buildMockDoc({ status: "PROCESSED" });
      messageModel.findOneAndUpdate.mockResolvedValue(null);
      messageModel.findById.mockResolvedValue(alreadyProcessed);

      const result = await service.clarify("mock-id", { text: "cement" });

      expect(aiExtractionService.extractEvents).not.toHaveBeenCalled();
      expect(inventoryService.applyEvents).not.toHaveBeenCalled();
      expect(result.status).toBe("PROCESSED");
    });

    it("throws NotFoundException when the message id doesn't exist", async () => {
      messageModel.findOneAndUpdate.mockResolvedValue(null);
      messageModel.findById.mockResolvedValue(null);

      await expect(service.clarify("missing-id", { text: "cement" })).rejects.toThrow("missing-id");
    });
  });
});
