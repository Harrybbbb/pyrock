import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { MessageDto } from "@pyrock/shared";
import { ClarifyMessageDto } from "./dto/clarify-message.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ListMessagesQuery } from "./dto/list-messages.query";
import { MessagesService } from "./messages.service";

@ApiTags("messages")
@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: "Submit a multilingual site update for AI extraction + inventory processing" })
  async create(@Body() dto: CreateMessageDto): Promise<MessageDto> {
    return this.messagesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List submitted messages and their processing status" })
  async findAll(@Query() query: ListMessagesQuery): Promise<MessageDto[]> {
    return this.messagesService.findAll(query.siteId);
  }

  @Patch(":id/clarify")
  @ApiOperation({ summary: "Answer a clarifying question on a NEEDS_REVIEW/FAILED message and re-run extraction" })
  async clarify(@Param("id") id: string, @Body() dto: ClarifyMessageDto): Promise<MessageDto> {
    return this.messagesService.clarify(id, dto);
  }
}
