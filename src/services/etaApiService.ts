import etaApiClient from '../utils/httpClient';
import { IInvoiceDetails, IInvoiceSearchResult } from '../types/eta.types';
import { logger } from '../utils/logger';

export async function searchInvoices(
  params: { submissionDateFrom: string; continuationToken?: string; pageSize: number }
): Promise<IInvoiceSearchResult> {
  logger.debug(`Searching for invoices with params:`, params);
  const response = await etaApiClient.get('/api/v1.0/documents/search', { params });
  return response.data;
}

export async function getInvoiceDetails(uuid: string): Promise<IInvoiceDetails> {
  logger.debug(`Fetching details for invoice UUID: ${uuid}`);
  const response = await etaApiClient.get(`/api/v1.0/documents/${uuid}/details`);
  return response.data;
}