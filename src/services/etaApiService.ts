// src/services/etaApiService.ts
import PQueue from 'p-queue';
import etaApiClient from '../utils/httpClient';
import { IInvoiceDetails, IInvoiceSearchResult } from '../types/eta.types';
import { logger } from '../utils/logger';

// 2 requests per second queue
const twoRequestsPerSecondQueue = new PQueue({ interval: 1000, intervalCap: 2 });

export async function searchInvoices(
  params: {
    submissionDateFrom: string;
    submissionDateTo: string;
    continuationToken?: string;
    pageSize: number;
  }
): Promise<IInvoiceSearchResult> {
  logger.debug(`Searching for invoices with params:`, params);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get('/api/v1.0/documents/search', { params })
  ).then(response => response.data);
}

// Switch back to the /details endpoint.
export async function getInvoiceDetails(uuid: string): Promise<IInvoiceDetails> {
  logger.debug(`Fetching details for invoice UUID: ${uuid}`);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/details`)
  ).then(response => response.data);
}