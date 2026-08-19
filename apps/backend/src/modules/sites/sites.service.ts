import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { SiteDto } from "@pyrock/shared";
import { escapeRegExp } from "../../common/utils/regex";
import { isDuplicateKeyError } from "../../common/utils/mongo-errors";
import { Message, MessageDocument } from "../messages/schemas/message.schema";
import {
  InventoryBalance,
  InventoryBalanceDocument,
} from "../inventory/schemas/inventory-balance.schema";
import { toSiteDto } from "./sites.mapper";
import { Site, SiteDocument } from "./schemas/site.schema";

@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<SiteDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(InventoryBalance.name)
    private readonly inventoryModel: Model<InventoryBalanceDocument>,
  ) {}

  /**
   * Registers a brand-new site. Unlike `upsert`, this is for the explicit
   * "add site" action a user takes — so an already-taken siteId is a real
   * error (409), not a silent no-op.
   */
  async create(siteId: string, name?: string | null): Promise<SiteDto> {
    const trimmedId = siteId.trim();
    try {
      const site = await this.siteModel.create({
        siteId: trimmedId,
        name: name?.trim() || null,
      });
      return toSiteDto(site);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(`Site "${trimmedId}" already exists`);
      }
      throw err;
    }
  }

  /**
   * Deletes a site and everything filed under it — messages and inventory
   * balances — since neither is meaningful once the site itself is gone.
   * Dependent data is cleared before the site record so a failure mid-way
   * leaves the site (and thus the delete action) still visible, rather than
   * orphaning data under a siteId nothing references anymore.
   */
  async remove(siteId: string): Promise<void> {
    const trimmedId = siteId.trim();
    const site = await this.siteModel.findOne({ siteId: trimmedId });
    if (!site) {
      throw new NotFoundException(`Site "${trimmedId}" not found`);
    }

    await Promise.all([
      this.messageModel.deleteMany({ siteId: trimmedId }),
      this.inventoryModel.deleteMany({ siteId: trimmedId }),
    ]);
    await this.siteModel.deleteOne({ _id: site._id });
  }

  /**
   * Registers a site, or updates its label if it already exists. Upsert
   * rather than insert-then-catch-duplicate: this is also called on every
   * message submission (see MessagesService.create) to keep the directory
   * populated with whatever sites are actually in use, so it has to be a
   * cheap no-conflict no-op on the common "site already known" path.
   */
  async upsert(siteId: string, name?: string | null): Promise<SiteDto> {
    const trimmedId = siteId.trim();
    const update: Record<string, unknown> = { $setOnInsert: { siteId: trimmedId } };
    if (name) {
      update.$set = { name: name.trim() };
    }

    const site = await this.siteModel.findOneAndUpdate({ siteId: trimmedId }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    return toSiteDto(site!);
  }

  /** Lists known sites, optionally narrowed to a search term for a dropdown/search box. */
  async findAll(q?: string): Promise<SiteDto[]> {
    const filter = q?.trim() ? { siteId: { $regex: escapeRegExp(q.trim()), $options: "i" } } : {};
    const sites = await this.siteModel.find(filter).sort({ siteId: 1 }).limit(50);
    return sites.map(toSiteDto);
  }
}
