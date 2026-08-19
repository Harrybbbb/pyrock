import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Message, MessageSchema } from "../messages/schemas/message.schema";
import {
  InventoryBalance,
  InventoryBalanceSchema,
} from "../inventory/schemas/inventory-balance.schema";
import { SitesController } from "./sites.controller";
import { SitesService } from "./sites.service";
import { Site, SiteSchema } from "./schemas/site.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: Message.name, schema: MessageSchema },
      { name: InventoryBalance.name, schema: InventoryBalanceSchema },
    ]),
  ],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
