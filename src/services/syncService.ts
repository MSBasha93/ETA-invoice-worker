// src/services/syncService.ts
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';

export async function runFullSync() {
  logger.info('Starting sync cycle...');

  const lastSyncTime = await db.getLastSyncTimestamp();
  
  const now = new Date();
  // Using issueDate as requested
  const searchParams = {
    issueDateFrom: lastSyncTime.toISOString(),
    issueDateTo: now.toISOString(),
    pageSize: config.worker.pageSize,
  };
  
  logger.info(`Fetching invoices issued from ${searchParams.issueDateFrom} to ${searchParams.issueDateTo}`);

  let continuationToken: string | undefined;
  let page = 1;
  let totalSaved = 0;

  do {
    logger.info(`--- Processing Page ${page} ---`);

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
        let rawData = null;
        try {
          rawData = await eta.getInvoiceRawData(summary.uuid);
        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to fetch raw data for document. Saving header info only.");
        }
        
        await db.upsertInvoice(summary, rawData);
        totalSaved++;
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

  logger.info(`--- Sync Cycle Finished ---`);
  logger.info(`Successfully processed and saved ${totalSaved} documents.`);
  
  // We update the timestamp based on the end of our search window.
  await db.updateLastSyncTimestamp(now);
}