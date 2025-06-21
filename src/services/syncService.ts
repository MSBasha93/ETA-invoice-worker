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

      // Use a simple, sequential loop for maximum robustness against rate-limiting bursts.
      for (const summary of searchResult.result) {
        try {
          // Fetch the full, reliable data from the /raw endpoint
          const rawData = await eta.getInvoiceRawData(summary.uuid);
          
          // Save the data. The upsert function handles the logic of checking for lines.
          await db.upsertInvoice(rawData);
          totalSaved++;

        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to process a single document. Skipping to the next.");
          // This ensures that if one document fails, the entire sync doesn't crash.
        }
      }

      continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
        ? undefined 
        : searchResult.metadata.continuationToken;
      page++;

    } catch(error) {
        logger.error({ error }, "A fatal error occurred while searching for documents. Halting sync cycle.");
        // If the main search itself fails, break the loop.
        break;
    }

  } while (continuationToken);

  logger.info(`Sync cycle finished. Successfully processed and saved ${totalSaved} documents.`);
  
  // Update the timestamp to avoid re-processing records, even if some failed individually.
  await db.updateLastSyncTimestamp();
}