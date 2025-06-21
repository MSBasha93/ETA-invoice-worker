// src/services/etaApiService.ts
import PQueue from 'p-queue';
import etaApiClient from '../utils/httpClient';
import { IAPIDocumentResponse, IInvoiceRawData, IInvoiceSearchResult } from '../types/eta.types';
import { logger } from '../utils/logger';

const twoRequestsPerSecondQueue = new PQueue({ interval: 1000, intervalCap: 2 });

// searchInvoices now uses issueDateFrom and issueDateTo
export async function searchInvoices(
  params: {
    issueDateFrom: string;
    issueDateTo: string;
    continuationToken?: string;
    pageSize: number;
  }
): Promise<IInvoiceSearchResult> {
  logger.debug(`Searching for invoices with params:`, params);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get('/api/v1.0/documents/search', { params })
  ).then(response => response.data);
}

export async function getInvoiceDetails(uuid: string): Promise<IAPIDocumentResponse> {
  logger.debug(`Fetching details for invoice UUID: ${uuid}`);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/details`)
  ).then(response => response.data);
}

export async function getInvoiceRawData(uuid: string): Promise<IInvoiceRawData> {
  logger.debug(`Fetching raw data for invoice UUID: ${uuid}`);
  return twoRequestsPerSecondQueue.add(() => 
    etaApiClient.get(`/api/v1.0/documents/${uuid}/raw`)
  ).then(response => response.data);
}