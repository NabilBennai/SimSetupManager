import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { SetupsController } from './setups.controller';
import { SetupsService } from './setups.service';

@Module({
  imports: [StorageModule, forwardRef(() => AuthModule)],
  controllers: [SetupsController],
  providers: [SetupsService],
})
export class SetupsModule {}
