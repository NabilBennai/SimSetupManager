import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller';
import { GamesController } from './games.controller';
import { ReferencesService } from './references.service';
import { TracksController } from './tracks.controller';

@Module({
  controllers: [GamesController, CategoriesController, TracksController],
  providers: [ReferencesService],
})
export class ReferencesModule {}
