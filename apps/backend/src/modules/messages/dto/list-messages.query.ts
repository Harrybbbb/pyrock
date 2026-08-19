import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ListMessagesQuery {
  @ApiPropertyOptional({ description: "Filter messages to a single site" })
  @IsOptional()
  @IsString()
  siteId?: string;
}
