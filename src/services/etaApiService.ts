// src/services/etaApiService.ts
import PQueue from 'p-queue';
import etaApiClient from '../utils/httpClient';
import { IInvoiceRawData, IInvoiceSearchResult } from '../types/eta.types';
import { logger } from '../utils/logger';

// A single queue for ALL ETA API calls to ensure the global rate limit is respected.
// 2 requests per 1 second.
const apiQueue = new PQueue({ interval: 1000, intervalCap: 2 });

// searchInvoices now uses issueDateFrom as requested.
export async function searchInvoices(
  params: {
    issueDateFrom: string;
    issueDateTo: string;
    continuationToken?: string;
    pageSize: number;
  }
): Promise<IInvoiceSearchResult> {
  logger.debug(`Queueing search for invoices with params:`, params);
  return apiQueue.add(() => 
    etaApiClient.get('/api/v1.0/documents/search', { params })
  ).then(response => response.data);
}

// Uses the /raw endpoint.
export async function getInvoiceRawData(uuid: string): Promise<IInvoiceRawData> {
  logger.debug(`Queueing fetch for raw data for invoice UUID: ${uuid}`);
  return apiQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/raw`)
  ).then(response => response.data);
}