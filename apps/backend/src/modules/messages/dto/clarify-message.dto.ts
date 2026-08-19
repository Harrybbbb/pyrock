import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ClarifyMessageDto {
  @ApiProperty({ example: "cement", description: "Free-text answer to the assistant's clarifying question" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}
