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
      // THE PAGINATION FIX: We MUST keep sending the date filters on every request.
      const searchResult = await eta.searchInvoices({
        ...searchParams,
        continuationToken,
      });
      
      if (!searchResult.result || searchResult.result.length === 0) {
        logger.info('No new documents found on this page. Ending sync.');
        break;
      }

      // THE GRAND FIX: A simple `for...of` loop is more robust than Promise.all for this task.
      // It processes one document at a time, allowing the rate-limiting queue in `etaApiService`
      // to work perfectly without bursting.
      for (const summary of searchResult.result) {
        try {
          const details = await eta.getInvoiceDetails(summary.uuid);
          
          // Defensive data merge
          if (details.document && !details.document.issuer?.id) {
            details.document.issuer = { id: summary.issuerId, name: summary.issuerName, type: '', address: {} };
            details.document.receiver = { id: summary.receiverId, name: summary.receiverName, type: '', address: {} };
          }
          
          // The upsert function already contains safety checks for missing `document` objects.
          await db.upsertInvoice(details);
          totalSaved++;

        } catch (error) {
          logger.error({ uuid: summary.uuid, error }, "Failed to process a single document. Skipping to the next.");
          // This catch block ensures that if one document fails, the whole loop doesn't crash.
        }
      }

      continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
        ? undefined 
        : searchResult.metadata.continuationToken;
      page++;

    } catch(error) {
        logger.error({ error }, "A fatal error occurred while searching for documents. Halting sync cycle.");
        // If the search itself fails (like the 400 error), we break the main loop.
        break;
    }

  } while (continuationToken);

  logger.info(`Sync cycle finished. Successfully saved ${totalSaved} documents.`);
  // Only update the timestamp if the process didn't end in a fatal search error.
  if (totalSaved > 0 || !continuationToken) {
    await db.updateLastSyncTimestamp();
  }
}