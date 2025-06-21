// src/services/syncService.ts
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';
import { IInvoiceDetails, IInvoiceSummary } from '../types/eta.types';

// The local queue has been removed, as rate limiting is now handled
// inside the etaApiService, which is a cleaner separation of concerns.

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
  let totalProcessed = 0;

  do {
    logger.info(`Processing page ${page}...`);

    const currentPageParams: any = {
      ...searchParams,
      continuationToken,
    };
    
    // For subsequent pages, the API expects the date filters to be omitted.
    if (page > 1) {
      delete currentPageParams.submissionDateFrom;
      delete currentPageParams.submissionDateTo;
    }

    const searchResult = await eta.searchInvoices(currentPageParams);
    
    if (!searchResult.result || searchResult.result.length === 0) {
      logger.info('No new documents found.');
      break;
    }

    // Now, we simply map over the results and call the detail fetching function.
    // The rate limiting is handled automatically inside getInvoiceDetails.
    const detailPromises = searchResult.result.map(async (summary) => {
      try {
        const details = await eta.getInvoiceDetails(summary.uuid);
        
        if (details.document && !details.document.issuer?.id) {
          details.document.issuer = { id: summary.issuerId, name: summary.issuerName, type: '', address: {} };
          details.document.receiver = { id: summary.receiverId, name: summary.receiverName, type: '', address: {} };
        }
        
        // Save each document as soon as its details are fetched.
        await db.upsertInvoice(details);
        totalProcessed++;

      } catch (error) {
        logger.error({ uuid: summary.uuid, error }, "Failed to process a document. Skipping.");
      }
    });
    
    // Wait for all detail fetching and saving on this page to complete.
    await Promise.all(detailPromises);

    continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
      ? undefined 
      : searchResult.metadata.continuationToken;
    page++;

  } while (continuationToken);

  logger.info(`Sync cycle finished. Processed ${totalProcessed} documents.`);
  await db.updateLastSyncTimestamp();
}