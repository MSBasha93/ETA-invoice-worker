// src/worker.ts

import { CronJob } from 'cron';
import { config } from './config';
import { logger } from './utils/logger';
import { runFullSync } from './services/syncService'; // Make sure this file exists and is correct

logger.info('ETA Invoice Worker starting up...');

const job = new CronJob(
  config.worker.cronSchedule,
  async () => {
    logger.info('Cron job triggered by schedule.');
    // Explicitly type 'err' as 'unknown' and handle it
    await runFullSync().catch((err: unknown) => {
      logger.error('Sync cycle failed with an error', { error: err });
    });
  },
  null,
  true,
  'UTC'
);

logger.info(`Worker scheduled with cron pattern: ${job.cronTime.source}. Waiting for trigger...`);