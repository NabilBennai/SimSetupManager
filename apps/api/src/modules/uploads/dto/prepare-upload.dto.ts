import { IsInt, IsString, Min } from 'class-validator';

export class PrepareUploadDto {
  @IsString()
  gameId!: string;

  @IsString()
  originalName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
