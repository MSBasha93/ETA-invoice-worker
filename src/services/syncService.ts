// src/services/syncService.ts
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';

// Define the batch size
const BATCH_SIZE = 50;

export async function runFullSync() {
  logger.info('Starting sync cycle...');

  const lastSyncTime = await db.getLastSyncTimestamp();
  
  const now = new Date();
  const searchParams = {
    issueDateFrom: lastSyncTime.toISOString(),
    issueDateTo: now.toISOString(),
    pageSize: config.worker.pageSize,
  };
  
  logger.info(`Fetching invoices issued from ${searchParams.issueDateFrom} to ${searchParams.issueDateTo}`);

  let continuationToken: string | undefined;
  let page = 1;
  let totalSaved = 0;
  
  // This array will hold our invoices until it's time to save them.
  let invoiceBatch: db.IProcessedInvoice[] = [];

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

      // Loop through all summaries on the current page
      for (const summary of searchResult.result) {
        let rawData = null;
        try {
          // Process one invoice fully (fetch raw data)
          rawData = await eta.getInvoiceRawData(summary.uuid);
        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to fetch raw data for document. It will be saved with header info only.");
        }
        
        // Add the processed invoice to our batch
        invoiceBatch.push({ summary, rawData });
        
        // If the batch is full, save it to the database and clear it.
        if (invoiceBatch.length >= BATCH_SIZE) {
          await db.upsertInvoiceBatch(invoiceBatch);
          totalSaved += invoiceBatch.length;
          invoiceBatch = []; // Reset the batch
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
  
  // After the loop, save any remaining invoices in the final batch.
  if (invoiceBatch.length > 0) {
    logger.info(`Saving final batch of ${invoiceBatch.length} invoices...`);
    await db.upsertInvoiceBatch(invoiceBatch);
    totalSaved += invoiceBatch.length;
    invoiceBatch = [];
  }

  logger.info(`--- Sync Cycle Finished ---`);
  logger.info(`Successfully processed and saved ${totalSaved} documents in total.`);
  
  await db.updateLastSyncTimestamp(now);
}