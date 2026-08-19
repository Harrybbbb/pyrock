import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ValidatedEventSchema,
  type FailureReasonCode,
  type MessageDto,
  type RawExtractedEvent,
  type ValidatedEvent,
} from "@pyrock/shared";
import { isDuplicateKeyError } from "../../common/utils/mongo-errors";
import type { AppConfig } from "../../config/configuration";
import { AiExtractionService } from "../ai/ai-extraction.service";
import { AiMalformedOutputError, AiProviderError } from "../ai/ai.errors";
import { InventoryService } from "../inventory/inventory.service";
import { SitesService } from "../sites/sites.service";
import { ClarifyMessageDto } from "./dto/clarify-message.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { toMessageDto } from "./messages.mapper";
import { Message, MessageDocument } from "./schemas/message.schema";

type EventValidationResult =
  | { ok: true; events: ValidatedEvent[] }
  | { ok: false; reason: string; code: FailureReasonCode };

/** First failing field on ValidatedEventSchema, in the same priority order the schema checks them. */
const FIELD_TO_FAILURE_CODE: Record<string, FailureReasonCode> = {
  material: "MISSING_MATERIAL",
  quantity: "MISSING_QUANTITY",
  unit: "MISSING_UNIT",
};

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private readonly confidenceThreshold: number;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly aiExtractionService: AiExtractionService,
    private readonly inventoryService: InventoryService,
    private readonly sitesService: SitesService,
    configService: ConfigService,
  ) {
    this.confidenceThreshold = configService.get<AppConfig>("app")!.extraction.confidenceThreshold;
  }

  /**
   * Ingests a message and runs it through the full pipeline synchronously:
   * extract -> validate -> apply inventory -> persist final status.
   *
   * Idempotency is enforced here, at the DB layer: `messageId` has a unique
   * index, so a duplicate submission fails the insert with E11000 *before*
   * any AI call or inventory mutation happens. We catch that and return the
   * already-processed record instead of reprocessing it. No amount of
   * application-level "have I seen this before?" checking would be as safe
   * as this, since it closes the race between two concurrent duplicate
   * requests.
   */
  async create(dto: CreateMessageDto): Promise<MessageDto> {
    let message: MessageDocument;
    try {
      message = await this.messageModel.create({
        messageId: dto.messageId,
        siteId: dto.siteId,
        text: dto.text,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        status: "PENDING",
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing = await this.messageModel.findOne({ messageId: dto.messageId });
        if (existing) {
          this.logger.log(
            `Duplicate messageId="${dto.messageId}" received; returning existing record without reprocessing`,
          );
          return toMessageDto(existing);
        }
      }
      throw error;
    }

    // Best-effort: keeps the site directory populated with whatever sites are actually
    // in use, without letting a directory hiccup block the message pipeline itself.
    try {
      await this.sitesService.upsert(dto.siteId);
    } catch (error) {
      this.logger.warn(`Failed to register site="${dto.siteId}" from message ${dto.messageId}: ${error}`);
    }

    return this.process(message);
  }

  async findAll(siteId?: string): Promise<MessageDto[]> {
    const filter = siteId ? { siteId } : {};
    const messages = await this.messageModel.find(filter).sort({ createdAt: -1 });
    return messages.map(toMessageDto);
  }

  /**
   * Resolves a NEEDS_REVIEW/FAILED message with a follow-up answer (e.g. the
   * missing material name) — mutating that *same* message in place rather
   * than creating a new one, so answering a clarifying question updates
   * inventory directly instead of appearing as a separate chat turn.
   *
   * The status flip out of NEEDS_REVIEW/FAILED is the atomic claim: two
   * concurrent clarify calls for the same message race on this
   * `findOneAndUpdate`, and only the one that actually matches (status still
   * reviewable) proceeds to extraction + inventory. The loser sees a
   * non-matching filter and falls through to returning current state — the
   * same "let the DB decide" pattern as the messageId uniqueness index in
   * `create()`, applied to a status transition instead of an insert.
   */
  async clarify(id: string, dto: ClarifyMessageDto): Promise<MessageDto> {
    const claimed = await this.messageModel.findOneAndUpdate(
      { _id: id, status: { $in: ["NEEDS_REVIEW", "FAILED"] } },
      { $set: { status: "PENDING", clarification: dto.text } },
      { new: true },
    );

    if (!claimed) {
      const existing = await this.messageModel.findById(id);
      if (!existing) {
        throw new NotFoundException(`Message ${id} not found`);
      }
      // Already resolved, or a concurrent clarify claimed it first — idempotent no-op.
      return toMessageDto(existing);
    }

    const combinedText = `${claimed.text} — ${dto.text}`;
    return this.process(claimed, combinedText);
  }

  private async process(message: MessageDocument, extractionText: string = message.text): Promise<MessageDto> {
    let rawEvents: RawExtractedEvent[];
    try {
      rawEvents = await this.aiExtractionService.extractEvents(extractionText);
    } catch (error) {
      return this.failMessage(message, error);
    }

    const validation = this.validateEvents(rawEvents);
    if (!validation.ok) {
      message.status = "NEEDS_REVIEW";
      message.failureReason = validation.reason;
      message.failureCode = validation.code;
      message.rawExtraction = JSON.stringify(rawEvents);
      await message.save();
      return toMessageDto(message);
    }

    // Inventory mutation happens only after validation has fully passed —
    // this is the one and only path that touches InventoryBalance.
    await this.inventoryService.applyEvents(message.siteId, validation.events);

    message.status = "PROCESSED";
    message.events = validation.events;
    message.failureReason = null;
    message.failureCode = null;
    await message.save();
    return toMessageDto(message);
  }

  private async failMessage(message: MessageDocument, error: unknown): Promise<MessageDto> {
    const reason =
      error instanceof AiProviderError || error instanceof AiMalformedOutputError
        ? error.message
        : "Unexpected error during AI extraction";
    const code: FailureReasonCode =
      error instanceof AiProviderError
        ? "PROVIDER_ERROR"
        : error instanceof AiMalformedOutputError
          ? "MALFORMED_OUTPUT"
          : "UNKNOWN_ERROR";

    this.logger.error(`Extraction failed for messageId="${message.messageId}": ${reason}`);

    message.status = "FAILED";
    message.failureReason = reason;
    message.failureCode = code;
    await message.save();
    return toMessageDto(message);
  }

  /**
   * Runs raw LLM output through the Zod gate (ValidatedEventSchema) and a
   * confidence floor. Any single failing event fails the whole message into
   * NEEDS_REVIEW — better to surface ambiguity than to partially apply it.
   */
  private validateEvents(rawEvents: RawExtractedEvent[]): EventValidationResult {
    if (rawEvents.length === 0) {
      return {
        ok: false,
        reason: "AI extraction returned no events for this message",
        code: "NO_EVENTS_EXTRACTED",
      };
    }

    const events: ValidatedEvent[] = [];
    for (const raw of rawEvents) {
      const result = ValidatedEventSchema.safeParse(raw);
      if (!result.success) {
        const detail = result.error.issues.map((issue) => issue.message).join("; ");
        const firstField = result.error.issues[0]?.path[0];
        const code =
          typeof firstField === "string" ? (FIELD_TO_FAILURE_CODE[firstField] ?? "UNKNOWN_ERROR") : "UNKNOWN_ERROR";
        return { ok: false, reason: `Extraction failed schema validation: ${detail}`, code };
      }
      if (result.data.confidence < this.confidenceThreshold) {
        return {
          ok: false,
          reason:
            `Low-confidence extraction (${result.data.confidence.toFixed(2)}) for ` +
            `${result.data.material ?? "an unspecified material"}; below threshold ${this.confidenceThreshold}`,
          code: "LOW_CONFIDENCE",
        };
      }
      events.push(result.data);
    }

    return { ok: true, events };
  }
}
