// src/services/syncService.ts
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';

export async function runFullSync() {
  logger.info('Starting sync cycle...');

  const lastSyncTime = await db.getLastSyncTimestamp();
  
  const now = new Date();
  const searchParams = {
    submissionDateFrom: lastSyncTime.toISOString(),
    submissionDateTo: now.toISOString(),
    pageSize: config.worker.pageSize,
  };
  
  logger.info(`Fetching invoices from ${searchParams.submissionDateFrom} to ${searchParams.submissionDateTo}`);

  let continuationToken: string | undefined;
  let page = 1;
  let totalSaved = 0;

  do {
    logger.info(`Processing page ${page}...`);

    try {
      const searchResult = await eta.searchInvoices({
        ...searchParams,
        continuationToken,
      });
      
      if (!searchResult.result || searchResult.result.length === 0) {
        logger.info('No new documents found on this page. Ending sync.');
        break;
      }

      for (const summary of searchResult.result) {
        try {
          const rawData = await eta.getInvoiceRawData(summary.uuid);
          
          // --- FIX: Pass the 'summary' along with the 'rawData' ---
          await db.upsertInvoice(summary, rawData);
          totalSaved++;

        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to process a single document. Skipping to the next.");
        }
      }

      continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
        ? undefined 
        : searchResult.metadata.continuationToken;
      page++;

    } catch(error) {
        logger.error({ error }, "A fatal error occurred while searching for documents. Halting sync cycle.");
        break;
    }

  } while (continuationToken);

  logger.info(`Sync cycle finished. Successfully processed and saved ${totalSaved} documents.`);
  
  await db.updateLastSyncTimestamp();
}