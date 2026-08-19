import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({ example: "wa-msg-001", description: "Client-supplied idempotency key" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  messageId!: string;

  @ApiProperty({ example: "site-42" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  siteId!: string;

  @ApiProperty({ example: "Kal 100 cement bags aaye the, usme se aaj 35 use hue." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;

  @ApiProperty({ required: false, example: "2026-08-19T09:30:00.000Z" })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}
