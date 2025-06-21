// src/services/etaApiService.ts
import PQueue from 'p-queue';
import etaApiClient from '../utils/httpClient';
import { IInvoiceRawData, IInvoiceSearchResult } from '../types/eta.types';
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

// Switched from getInvoiceDetails to getInvoiceRawData
export async function getInvoiceRawData(uuid: string): Promise<IInvoiceRawData> {
  logger.debug(`Fetching raw data for invoice UUID: ${uuid}`);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/raw`)
  ).then(response => response.data);
}