import { IsEmail, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'El nombre debe ser un texto' })
  @IsOptional()
  name?: string;

  @IsNumber({}, { message: 'El retraso mínimo debe ser un número' })
  @Min(0, { message: 'El retraso mínimo debe ser mayor o igual a 0' })
  @IsOptional()
  minDelay?: number;

  @IsNumber({}, { message: 'El retraso máximo debe ser un número' })
  @Min(0, { message: 'El retraso máximo debe ser mayor o igual a 0' })
  @IsOptional()
  maxDelay?: number;

  @IsString({ message: 'La zona horaria debe ser un texto' })
  @IsOptional()
  timezone?: string;
}
