import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from './pagination-query.dto';

export class ListTracksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
