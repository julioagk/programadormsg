import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private useLocalFallback = false;
  private localUploadsDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'whatsapp-attachments';
  }

  async onModuleInit() {
    // Ensure local fallback directory exists
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'localhost';
    const port = this.configService.get<number>('S3_PORT') || 9000;
    const useSsl = this.configService.get<string>('S3_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY');

    if (!accessKey || !secretKey) {
      this.logger.warn('S3 credentials not found. Falling back to local disk storage.');
      this.useLocalFallback = true;
      return;
    }

    const protocol = useSsl ? 'https' : 'http';
    const s3Endpoint = `${protocol}://${endpoint}:${port}`;

    this.s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: 'us-east-1', // Required by SDK even if MinIO is local
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Necessary for MinIO
    });

    // Test connection & ensure bucket exists
    try {
      this.logger.log(`Verifying S3 bucket: ${this.bucketName} at ${s3Endpoint}`);
      
      let bucketExists = false;
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        bucketExists = true;
      } catch (err) {
        // Bucket doesn't exist or is inaccessible
      }

      if (!bucketExists) {
        this.logger.log(`Bucket ${this.bucketName} does not exist, creating...`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket ${this.bucketName} created successfully.`);
      }
    } catch (err) {
      this.logger.warn(`Could not connect to S3/MinIO (${err.message}). Falling back to local disk storage.`);
      this.useLocalFallback = true;
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ fileUrl: string; fileName: string; mimeType: string; fileSize: number }> {
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;

    if (this.useLocalFallback || !this.s3Client) {
      this.logger.log(`Uploading file locally: ${file.originalname} -> ${uniqueFileName}`);
      const filePath = path.join(this.localUploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, file.buffer);

      const serverPort = this.configService.get<number>('PORT') || 4000;
      const fileUrl = `http://localhost:${serverPort}/storage/uploads/${uniqueFileName}`;

      return {
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      };
    }

    try {
      this.logger.log(`Uploading file to S3: ${file.originalname} -> ${uniqueFileName}`);
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: uniqueFileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'localhost';
      const port = this.configService.get<number>('S3_PORT') || 9000;
      const useSsl = this.configService.get<string>('S3_USE_SSL') === 'true';
      const protocol = useSsl ? 'https' : 'http';
      const fileUrl = `${protocol}://${endpoint}:${port}/${this.bucketName}/${uniqueFileName}`;

      return {
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      };
    } catch (err) {
      this.logger.error(`S3 upload failed: ${err.message}. Saving to local fallback instead.`);
      // Fallback
      const filePath = path.join(this.localUploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, file.buffer);

      const serverPort = this.configService.get<number>('PORT') || 4000;
      const fileUrl = `http://localhost:${serverPort}/storage/uploads/${uniqueFileName}`;

      return {
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      };
    }
  }

  getLocalFilePath(filename: string): string {
    return path.join(this.localUploadsDir, filename);
  }
}
