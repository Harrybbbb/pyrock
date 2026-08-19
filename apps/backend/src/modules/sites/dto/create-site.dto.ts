import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { SITE_ID_PATTERN } from "@pyrock/shared";

export class CreateSiteDto {
  @ApiProperty({ example: "site-204", description: "Short identifier used elsewhere (messages, inventory)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(SITE_ID_PATTERN, { message: "siteId may only contain letters, numbers, - and _" })
  siteId!: string;

  @ApiPropertyOptional({ example: "Andheri East — Tower B" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;
}
