import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AiModule } from "../ai/ai.module";
import { InventoryModule } from "../inventory/inventory.module";
import { SitesModule } from "../sites/sites.module";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { Message, MessageSchema } from "./schemas/message.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    AiModule,
    InventoryModule,
    SitesModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
