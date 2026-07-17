import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddSetupVersionDto {
  @IsString()
  fileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNotes?: string;
}
