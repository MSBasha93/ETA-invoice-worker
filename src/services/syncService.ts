// src/services/syncService.ts
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';
import { IInvoiceDetails } from '../types/eta.types';

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
    logger.info(`--- Processing Page ${page} ---`);

    try {
      // PHASE 1: Get reliable summaries
      const searchResult = await eta.searchInvoices({
        ...searchParams,
        continuationToken,
      });
      
      if (!searchResult.result || searchResult.result.length === 0) {
        logger.info('No new documents found on this page. Ending sync.');
        break;
      }

      // PHASE 2 & 3: For each summary, get details and save immediately.
      for (const summary of searchResult.result) {
        let details: IInvoiceDetails | null = null;
        try {
          details = await eta.getInvoiceDetails(summary.uuid);
        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to fetch details for document. Saving header info only.");
          // If the details call fails, `details` remains null, which is handled by upsertInvoice.
        }
        
        // Save the merged data.
        await db.upsertInvoice(summary, details);
        totalSaved++;
      }

      continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
        ? undefined 
        : searchResult.metadata.continuationToken;
      page++;

    } catch(error) {
        logger.error({ error }, "A fatal error occurred during the search phase. Halting sync cycle.");
        break;
    }

  } while (continuationToken);

  logger.info(`--- Sync Cycle Finished ---`);
  logger.info(`Successfully processed and saved ${totalSaved} documents.`);
  
  await db.updateLastSyncTimestamp();
}