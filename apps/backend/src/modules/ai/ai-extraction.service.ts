import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ExtractionResultSchema, type RawExtractedEvent } from "@pyrock/shared";
import type { AppConfig } from "../../config/configuration";
import { AiMalformedOutputError, AiProviderError } from "./ai.errors";
import {
  EXTRACTION_JSON_SCHEMA,
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "./prompts/extraction.prompt";

/**
 * Owns the one call out to the LLM. Everything this service returns is still
 * "the model's opinion" — business validation (ValidatedEventSchema) and all
 * inventory arithmetic happen downstream in MessagesService/InventoryService,
 * never here.
 */
@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    const config = configService.get<AppConfig>("app")!;
    this.client = new OpenAI({ apiKey: config.openai.apiKey, timeout: config.openai.timeoutMs });
    this.model = config.openai.model;
    this.timeoutMs = config.openai.timeoutMs;
  }

  async extractEvents(messageText: string): Promise<RawExtractedEvent[]> {
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionUserPrompt(messageText) },
        ],
        temperature: 0,
        response_format: { type: "json_schema", json_schema: EXTRACTION_JSON_SCHEMA },
      });
    } catch (error) {
      this.logger.warn(`OpenAI request failed: ${(error as Error).message}`);
      throw new AiProviderError("The AI provider request failed or timed out", error);
    }

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new AiMalformedOutputError("The AI provider returned an empty response");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      throw new AiMalformedOutputError("The AI provider did not return valid JSON", rawContent);
    }

    const events =
      typeof parsedJson === "object" && parsedJson !== null && "events" in parsedJson
        ? (parsedJson as { events: unknown }).events
        : parsedJson;

    const result = ExtractionResultSchema.safeParse(events);
    if (!result.success) {
      throw new AiMalformedOutputError(
        `AI output did not match the expected extraction shape: ${result.error.message}`,
        rawContent,
      );
    }

    return result.data;
  }

  get timeoutMilliseconds(): number {
    return this.timeoutMs;
  }
}
