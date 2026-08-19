import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import {
  InventoryBalance,
  InventoryBalanceSchema,
} from "./schemas/inventory-balance.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryBalance.name, schema: InventoryBalanceSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
