import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSetupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  gameId!: string;

  @IsString()
  carId!: string;

  @IsString()
  trackId!: string;

  @IsString()
  fileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionPublic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notesPrivate?: string;

  @IsOptional()
  @IsString()
  sessionType?: string;

  @IsOptional()
  @IsString()
  weather?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  trackTemperatureC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  airTemperatureC?: number;

  @IsOptional()
  @IsString()
  gameVersion?: string;
}
