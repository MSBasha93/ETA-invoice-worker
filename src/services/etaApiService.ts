// src/services/etaApiService.ts
import PQueue from 'p-queue';
import etaApiClient from '../utils/httpClient';
import { IInvoiceDetails, IInvoiceSearchResult } from '../types/eta.types';
import { logger } from '../utils/logger';

// --- Create dedicated queues for each API rate limit ---

// Limit: 2 requests per second (1000ms / 2 = 500ms interval)
const twoRequestsPerSecondQueue = new PQueue({ interval: 1000, intervalCap: 2 });

// --- End of queue definitions ---


export async function searchInvoices(
  params: {
    submissionDateFrom: string;
    submissionDateTo: string;
    continuationToken?: string;
    pageSize: number;
  }
): Promise<IInvoiceSearchResult> {
  logger.debug(`Searching for invoices with params:`, params);

  // Wrap the API call in the appropriate queue
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get('/api/v1.0/documents/search', { params })
  ).then(response => response.data);
}

export async function getInvoiceDetails(uuid: string): Promise<IInvoiceDetails> {
  logger.debug(`Fetching details for invoice UUID: ${uuid}`);

  // Wrap the API call in the appropriate queue
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/details`)
  ).then(response => response.data);
}