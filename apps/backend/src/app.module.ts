import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { AiModule } from "./modules/ai/ai.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { SitesModule } from "./modules/sites/sites.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    AiModule,
    InventoryModule,
    SitesModule,
    MessagesModule,
  ],
})
export class AppModule {}
