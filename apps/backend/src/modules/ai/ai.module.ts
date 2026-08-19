import { Module } from "@nestjs/common";
import { AiExtractionService } from "./ai-extraction.service";

@Module({
  providers: [AiExtractionService],
  exports: [AiExtractionService],
})
export class AiModule {}
