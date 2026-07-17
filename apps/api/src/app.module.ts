import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { AuthModule } from './modules/auth/auth.module';
import { ReferencesModule } from './modules/references/references.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [ObservabilityModule, DatabaseModule, AuthModule, UsersModule, ReferencesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
