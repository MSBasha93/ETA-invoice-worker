import { logger } from '../utils/logger';
import * as db from './databaseService';
import * as eta from './etaApiService';
import { config } from '../config';
import { IInvoiceRawData } from '../types/eta.types';

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
      // PHASE 1: EXTRACT SUMMARIES
      logger.info(`Phase 1: Fetching document summaries for page ${page}...`);
      const searchResult = await eta.searchInvoices({
        ...searchParams,
        continuationToken,
      });
      
      if (!searchResult.result || searchResult.result.length === 0) {
        logger.info('No new documents found on this page. Ending sync.');
        break;
      }

      // PHASE 2: EXTRACT DETAILS
      logger.info(`Phase 2: Fetching raw data for ${searchResult.result.length} documents...`);
      const detailPromises = searchResult.result.map(summary => 
        eta.getInvoiceRawData(summary.uuid)
          .catch(err => {
            logger.error({ uuid: summary.uuid, err }, "Giving up on fetching details for document after retries.");
            return null; // Return null if fetching fails after all retries
          })
      );
      const allRawData = await Promise.all(detailPromises);


      // PHASE 3: LOAD TO DATABASE
      logger.info(`Phase 3: Saving ${allRawData.filter(d => d).length} documents to the database...`);
      const allSummaries = searchResult.result;
      
      for (let i = 0; i < allSummaries.length; i++) {
        const summary = allSummaries[i];
        const rawData = allRawData[i];

        if (rawData) {
          // If we got the details, save them.
          await db.upsertInvoice(summary, rawData);
          totalSaved++;
        } else {
          // If fetching details failed permanently, we could choose to save header-only info here if needed.
          // For now, we log that it was skipped.
          logger.warn(`Skipping database save for ${summary.uuid} due to earlier fetch failure.`);
        }
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
  logger.info(`Successfully saved ${totalSaved} documents in total.`);
  
  await db.updateLastSyncTimestamp();
}