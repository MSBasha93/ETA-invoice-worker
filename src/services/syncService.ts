// src/services/syncService.ts - DIAGNOSTIC SUPER-LOGGER VERSION

import { logger } from '../utils/logger';
import * as eta from './etaApiService';

export async function runFullSync() {
  logger.info('--- RUNNING IN DIAGNOSTIC MODE ---');

  try {
    // --- Step 1: Search for one single document using issueDate ---
    // We will search for documents issued in a known recent period.
    const searchEndDate = new Date();
    const searchStartDate = new Date();
    searchStartDate.setDate(searchEndDate.getDate() - 5); // Search the last 5 days

    logger.info(`Searching for one document issued between ${searchStartDate.toISOString()} and ${searchEndDate.toISOString()}`);

    const searchResult = await eta.searchInvoices({
      issueDateFrom: searchStartDate.toISOString(),
      issueDateTo: searchEndDate.toISOString(),
      pageSize: 1, // We only want one document to test with
    });

    if (!searchResult.result || searchResult.result.length === 0) {
      logger.error('DIAGNOSTIC FAILED: Could not find a single document in the date range to test with.');
      process.exit(1);
    }

    const testSummary = searchResult.result[0];
    const testUuid = testSummary.uuid;
    logger.info(`Found test document with UUID: ${testUuid}`);
    console.log('\n\n--- DOCUMENT SUMMARY OBJECT ---');
    console.log(JSON.stringify(testSummary, null, 2));


    // --- Step 2: Get the response from the /details endpoint ---
    logger.info(`Fetching from /details endpoint for UUID: ${testUuid}`);
    const detailsResponse = await eta.getInvoiceDetails(testUuid);
    
    console.log('\n\n--- FULL /details RESPONSE ---');
    console.log(JSON.stringify(detailsResponse, null, 2));
    

    // --- Step 3: Get the response from the /raw endpoint ---
    logger.info(`Fetching from /raw endpoint for UUID: ${testUuid}`);
    const rawResponse = await eta.getInvoiceRawData(testUuid);

    console.log('\n\n--- FULL /raw RESPONSE ---');
    console.log(JSON.stringify(rawResponse, null, 2));


    // --- Step 4: Exit successfully ---
    logger.info('--- DIAGNOSTIC COMPLETE ---');
    process.exit(0);

  } catch (error) {
    logger.error({ error }, "A fatal error occurred during the diagnostic run.");
    process.exit(1);
  }
}