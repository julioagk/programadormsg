import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class TemplateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  fileSize: number;
}

export class CreateTemplateDto {
  @IsString({ message: 'El nombre de la plantilla es requerido' })
  @IsNotEmpty({ message: 'El nombre de la plantilla no puede estar vacío' })
  name: string;

  @IsString({ message: 'El cuerpo de la plantilla es requerido' })
  @IsNotEmpty({ message: 'El cuerpo de la plantilla no puede estar vacío' })
  message: string;

  @IsArray({ message: 'Los archivos adjuntos deben ser una lista' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TemplateAttachmentDto)
  attachments?: TemplateAttachmentDto[];
}
