import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Vérifie que l'API répond." })
  @ApiOkResponse({ description: 'API disponible.', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
