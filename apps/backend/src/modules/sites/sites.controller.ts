import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { SiteDto } from "@pyrock/shared";
import { CreateSiteDto } from "./dto/create-site.dto";
import { ListSitesQuery } from "./dto/list-sites.query";
import { SitesService } from "./sites.service";

@ApiTags("sites")
@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @ApiOperation({
    summary: "Register a new site (409 if the siteId is already taken)",
  })
  async create(@Body() dto: CreateSiteDto): Promise<SiteDto> {
    return this.sitesService.create(dto.siteId, dto.name);
  }

  @Get()
  @ApiOperation({
    summary:
      "List known sites, optionally filtered by a search term — powers the site picker",
  })
  async findAll(@Query() query: ListSitesQuery): Promise<SiteDto[]> {
    return this.sitesService.findAll(query.q);
  }

  @Delete(":siteId")
  @HttpCode(200)
  @ApiOperation({
    summary: "Delete a site and all of its messages and inventory data",
  })
  async remove(@Param("siteId") siteId: string): Promise<void> {
    await this.sitesService.remove(siteId);
  }
}
