import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import * as fs from 'fs';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.storageService.uploadFile(file);
  }

  @Get('uploads/:filename')
  async serveLocalFile(@Param('filename') filename: string, @Res() res: express.Response) {
    const filePath = this.storageService.getLocalFilePath(filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Guess content type from extension
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'png') contentType = 'image/png';
    else if (extension === 'pdf') contentType = 'application/pdf';
    else if (extension === 'zip') contentType = 'application/zip';
    else if (extension === 'mp3') contentType = 'audio/mpeg';
    else if (extension === 'mp4') contentType = 'video/mp4';
    else if (extension === 'doc' || extension === 'docx') contentType = 'application/msword';
    else if (extension === 'xls' || extension === 'xlsx') contentType = 'application/vnd.ms-excel';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    fs.createReadStream(filePath).pipe(res);
  }
}
