import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SiteDocument = HydratedDocument<Site>;

@Schema({ timestamps: true, collection: "sites" })
export class Site {
  @Prop({ required: true, unique: true, trim: true })
  siteId!: string;

  @Prop({ type: String, default: null, trim: true })
  name!: string | null;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
