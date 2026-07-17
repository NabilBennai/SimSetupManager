import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';

@Module({
  imports: [ObservabilityModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
