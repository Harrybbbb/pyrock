import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ListSitesQuery {
  @ApiPropertyOptional({ description: "Case-insensitive search against siteId/name, for a search box or dropdown" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
}
