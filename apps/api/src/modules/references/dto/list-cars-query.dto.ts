import { IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from './pagination-query.dto';

export class ListCarsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;
}
