import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { InventoryItemDto } from "@pyrock/shared";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@Controller("sites/:siteId/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "Get current material inventory for a site" })
  async getInventory(
    @Param("siteId") siteId: string,
  ): Promise<InventoryItemDto[]> {
    return this.inventoryService.getInventoryForSite(siteId);
  }
}
