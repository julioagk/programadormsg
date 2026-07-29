import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class RecipientDto {
  @IsString({ message: 'El número de WhatsApp es requerido' })
  @IsNotEmpty({ message: 'El número de WhatsApp no puede estar vacío' })
  whatsappNumber: string;

  @IsString({ message: 'El nombre del contacto debe ser un texto' })
  @IsOptional()
  contactName?: string;
}

class AttachmentDto {
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

export class CreateScheduleDto {
  @IsString({ message: 'El título debe ser un texto' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'El cuerpo del mensaje es requerido' })
  @IsNotEmpty({ message: 'El cuerpo del mensaje no puede estar vacío' })
  message: string;

  @IsDateString({}, { message: 'La fecha de programación no es válida' })
  scheduledAt: string;

  @IsString({ message: 'La zona horaria es requerida' })
  @IsNotEmpty({ message: 'La zona horaria no puede estar vacía' })
  timezone: string;

  @IsArray({ message: 'Los destinatarios deben ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];

  @IsArray({ message: 'Los adjuntos deben ser una lista' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  templateId?: string; // If this comes from a template, we can link it
}
