import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { DeliveryService } from './delivery.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  
  private redisConnection: Redis | null = null;
  private messageQueue: Queue | null = null;
  private queueWorker: Worker | null = null;

  private useInMemory = false;
  private inMemoryJobs = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;

    this.logger.log(
      redisUrl 
        ? 'Attempting to connect to Redis using REDIS_URL' 
        : `Attempting to connect to Redis at ${host}:${port}`
    );

    let connection: Redis | null = null;
    try {
      if (redisUrl) {
        connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          connectTimeout: 5000,
        });
      } else {
        connection = new Redis({
          host,
          port,
          maxRetriesPerRequest: null,
          connectTimeout: 2000,
        });
      }

      // Bind error listener to avoid Unhandled error warnings
      connection.on('error', () => {});

      await new Promise<void>((resolve, reject) => {
        if (!connection) return reject(new Error('Connection not initialized'));
        connection.once('ready', () => resolve());
        connection.once('error', (err) => reject(err));
      });

      this.redisConnection = connection;
      this.logger.log('Redis connected successfully. Initializing BullMQ Queue and Worker...');

      // 2. Initialize BullMQ Queue
      this.messageQueue = new Queue('whatsapp-messages', {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000, // Retry after 10s, 20s, 40s...
          },
        },
      });

      // 3. Initialize BullMQ Worker
      this.queueWorker = new Worker(
        'whatsapp-messages',
        async (job: Job) => {
          this.logger.log(`BullMQ Worker executing job: ${job.id} for recipient: ${job.data.recipientId}`);
          await this.deliveryService.processDelivery(job.data.recipientId);
        },
        { connection: this.redisConnection },
      );

      this.queueWorker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed with error: ${err.message}`);
      });

    } catch (err) {
      this.logger.warn(`Could not connect to Redis (${err.message}). Falling back to In-Memory Scheduler.`);
      this.useInMemory = true;
      if (connection) {
        try {
          connection.disconnect();
        } catch (e) {}
      }
      this.redisConnection = null;
    }
  }

  async onModuleDestroy() {
    // Shutdown BullMQ connections
    if (this.queueWorker) {
      await this.queueWorker.close();
    }
    if (this.messageQueue) {
      await this.messageQueue.close();
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
    }

    // Clean up local timeouts
    for (const [recipientId, timeout] of this.inMemoryJobs.entries()) {
      clearTimeout(timeout);
      this.inMemoryJobs.delete(recipientId);
    }
  }

  async scheduleMessageRecipient(recipientId: string, delayMs: number): Promise<string> {
    if (this.useInMemory || !this.messageQueue) {
      this.logger.log(`Scheduling recipient ${recipientId} in-memory with delay: ${delayMs}ms`);
      
      // Clear existing if any (reschedule case)
      const existing = this.inMemoryJobs.get(recipientId);
      if (existing) {
        clearTimeout(existing);
      }

      const timeout = setTimeout(async () => {
        this.inMemoryJobs.delete(recipientId);
        try {
          await this.deliveryService.processDelivery(recipientId);
        } catch (err) {
          this.logger.error(`In-Memory job execution failed for recipient ${recipientId}:`, err);
        }
      }, Math.max(0, delayMs));

      const inMemoryJobId = `inmem-${recipientId}-${Date.now()}`;
      this.inMemoryJobs.set(recipientId, timeout);
      return inMemoryJobId;
    }

    // BullMQ enqueue
    this.logger.log(`Scheduling recipient ${recipientId} via BullMQ with delay: ${delayMs}ms`);
    const job = await this.messageQueue.add(
      'send-whatsapp',
      { recipientId },
      { delay: Math.max(0, delayMs) },
    );
    return job.id || '';
  }

  async cancelScheduledRecipient(recipientId: string, jobId: string): Promise<void> {
    this.logger.log(`Canceling scheduled recipient ${recipientId} (Job ID: ${jobId})`);

    // In-memory cancel
    if (jobId.startsWith('inmem-') || this.useInMemory || !this.messageQueue) {
      const timeout = this.inMemoryJobs.get(recipientId);
      if (timeout) {
        clearTimeout(timeout);
        this.inMemoryJobs.delete(recipientId);
        this.logger.log(`Cancelled in-memory job for recipient ${recipientId}`);
      }
      return;
    }

    // BullMQ cancel
    try {
      const job = await this.messageQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed BullMQ job ${jobId} from queue`);
      }
    } catch (err) {
      this.logger.error(`Failed to remove BullMQ job ${jobId}: ${err.message}`);
    }
  }
}
