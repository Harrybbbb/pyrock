import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type InventoryBalanceDocument = HydratedDocument<InventoryBalance>;

@Schema({ timestamps: true, collection: "inventory_balances" })
export class InventoryBalance {
  @Prop({ required: true, index: true })
  siteId!: string;

  /** Normalized (lowercase, trimmed) material name — the join key with events. */
  @Prop({ required: true })
  material!: string;

  @Prop({ required: true })
  unit!: string;

  @Prop({ required: true, default: 0 })
  received!: number;

  @Prop({ required: true, default: 0 })
  consumed!: number;

  /** received - consumed. Denormalized for cheap reads; always derived, never set directly by a client. */
  @Prop({ required: true, default: 0 })
  quantity!: number;
}

export const InventoryBalanceSchema =
  SchemaFactory.createForClass(InventoryBalance);
InventoryBalanceSchema.index({ siteId: 1, material: 1 }, { unique: true });
