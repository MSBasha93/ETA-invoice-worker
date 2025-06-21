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
  
  // --- CORRECTED LOGIC: Add an end date for the query ---
  const now = new Date();
  const searchParams = {
    submissionDateFrom: lastSyncTime.toISOString(),
    submissionDateTo: now.toISOString(), // Always provide an end date
    pageSize: config.worker.pageSize,
  };
  // --- END OF CORRECTION ---

  logger.info(`Fetching invoices from ${searchParams.submissionDateFrom} to ${searchParams.submissionDateTo}`);

  let continuationToken: string | undefined;
  let page = 1;
  let totalProcessed = 0;

  do {
    logger.info(`Processing page ${page}...`);

    // The API requires that the date filters are NOT sent on subsequent paginated requests.
    // So we'll build the parameters for each loop iteration.
    const currentPageParams: any = {
      pageSize: config.worker.pageSize,
      continuationToken,
    };

    if (page === 1) {
      currentPageParams.submissionDateFrom = searchParams.submissionDateFrom;
      currentPageParams.submissionDateTo = searchParams.submissionDateTo;
    }

    const searchResult = await eta.searchInvoices(currentPageParams);
    
    if (searchResult.result.length === 0) {
      logger.info('No new documents found on this page.');
      break;
    }

    const allDetails: IInvoiceDetails[] = [];
    
    const tasks = searchResult.result.map((summary: IInvoiceSummary) => 
      detailFetchQueue.add(async () => {
        const details = await eta.getInvoiceDetails(summary.uuid);
        
        if (summary && !details.document?.issuer?.id) {
          if (!details.document) {
            // @ts-ignore
            details.document = {}; 
          }
          details.document.issuer = { id: summary.issuerId, name: summary.issuerName, type: '', address: {} };
          details.document.receiver = { id: summary.receiverId, name: summary.receiverName, type: '', address: {} };
        }
        
        allDetails.push(details);
      })
    );
    
    await Promise.all(tasks);

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