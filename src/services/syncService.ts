import PQueue from 'p-queue';
import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';
import { IInvoiceDetails, IInvoiceSummary } from '../types/eta.types';

const detailFetchQueue = new PQueue({
  interval: config.worker.rateLimitInterval,
  intervalCap: config.worker.rateLimitRequests,
});

export async function runFullSync() {
  logger.info('Starting sync cycle...');

  const lastSyncTime = await db.getLastSyncTimestamp();
  logger.info(`Fetching invoices since ${lastSyncTime.toISOString()}`);

  let continuationToken: string | undefined;
  let page = 1;
  let totalProcessed = 0;

  do {
    logger.info(`Processing page ${page}...`);
    const searchResult = await eta.searchInvoices({
      submissionDateFrom: lastSyncTime.toISOString(),
      continuationToken,
      pageSize: config.worker.pageSize,
    });
    
    if (searchResult.result.length === 0) {
      logger.info('No new documents found on this page.');
      break;
    }

    // --- CORRECTED LOGIC ---
    const allDetails: IInvoiceDetails[] = [];
    
    // Create an array of tasks to be executed by the queue.
    // As each task finishes, it will push its result into the 'allDetails' array.
    const tasks = searchResult.result.map((summary: IInvoiceSummary) => 
      detailFetchQueue.add(async () => {
        const details = await eta.getInvoiceDetails(summary.uuid);
        
        // Sometimes the details object is missing issuer/receiver if you are not the issuer.
        // We merge the data from the summary list to ensure it's complete.
        if (summary && !details.document?.issuer?.id) {
          if (!details.document) {
            // @ts-ignore - Create the document object if it's completely missing
            details.document = {}; 
          }
          details.document.issuer = { id: summary.issuerId, name: summary.issuerName, type: '', address: {} };
          details.document.receiver = { id: summary.receiverId, name: summary.receiverName, type: '', address: {} };
        }
        
        allDetails.push(details);
      })
    );
    
    // Wait for all the detail-fetching tasks on this page to complete.
    await Promise.all(tasks);
    // --- END OF CORRECTION ---

    // Now, save all the fully fetched details to the database.
    for (const invoiceDetail of allDetails) {
        await db.upsertInvoice(invoiceDetail);
    }

    totalProcessed += searchResult.result.length;
    continuationToken = searchResult.metadata.continuationToken === 'EndofResultSet' 
      ? undefined 
      : searchResult.metadata.continuationToken;
    page++;

  } while (continuationToken);

  logger.info(`Sync cycle finished. Processed ${totalProcessed} documents.`);
  await db.updateLastSyncTimestamp();
}