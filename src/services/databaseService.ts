// src/services/databaseService.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { IInvoiceSummary, IAPIDocumentResponse } from '../types/eta.types';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

export async function upsertInvoice(
  summary: IInvoiceSummary,
  details: IAPIDocumentResponse | null
) {
  logger.debug(`Upserting invoice with UUID: ${summary.uuid}`);

  // The nested invoice object, or null if it doesn't exist
  const nestedDoc = details?.document;

  const invoicePayload: Prisma.InvoiceCreateInput = {
    // Start with the reliable data from the summary
    uuid: summary.uuid,
    submissionUuid: summary.submissionUUID,
    internalId: summary.internalId,
    status: summary.status,
    typeName: summary.typeName,
    typeVersion: summary.typeVersionName,
    issuerId: summary.issuerId,
    issuerName: summary.issuerName,
    issuerType: summary.issuerType,
    receiverId: summary.receiverId || 'N/A',
    receiverName: summary.receiverName || 'N/A',
    receiverType: summary.receiverType || 'N/A',
    dateTimeIssued: new Date(summary.dateTimeIssued),
    dateTimeReceived: new Date(summary.dateTimeReceived),
    
    // Enhance with details from the nested object if it exists, otherwise use summary total.
    totalAmount: nestedDoc?.totalAmount ?? summary.total,
    totalSales: nestedDoc?.totalSalesAmount ?? 0,
    totalDiscount: nestedDoc?.totalDiscountAmount ?? 0,
    netAmount: nestedDoc?.netAmount ?? 0,
  };

  // Get lines ONLY from the nested document object.
  const lines = nestedDoc?.invoiceLines || [];
  const lineItemsPayload: Prisma.InvoiceLineCreateManyInput[] = lines.map(line => ({
    invoiceUuid: summary.uuid,
    description: line.description,
    itemCode: line.itemCode,
    itemType: line.itemType,
    internalCode: line.internalCode,
    quantity: line.quantity,
    unitType: line.unitType,
    unitPrice: line.unitValue.amountEGP,
    salesTotal: line.salesTotal,
    discountAmount: line.discount.amount,
    discountRate: line.discount.rate,
    netTotal: line.netTotal,
    totalAmount: line.total,
  }));

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.invoice.upsert({
        where: { uuid: summary.uuid },
        update: invoicePayload,
        create: invoicePayload,
      });

      await tx.invoiceLine.deleteMany({ where: { invoiceUuid: summary.uuid } });
      
      if (lineItemsPayload.length > 0) {
        await tx.invoiceLine.createMany({ data: lineItemsPayload });
      }
    });
    logger.info(`Successfully saved invoice ${summary.uuid} with ${lineItemsPayload.length} lines.`);
  } catch (error) {
    logger.error(`Failed to save invoice ${summary.uuid}`, { error });
    throw error;
  }
}

// ... getLastSyncTimestamp and updateLastSyncTimestamp are correct and unchanged ...
export async function getLastSyncTimestamp(): Promise<Date> {
  const status = await prisma.syncStatus.findUnique({ where: { id: 1 } });
  if (status) { return status.lastSyncTimestamp; }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

export async function updateLastSyncTimestamp(): Promise<void> {
  const now = new Date();
  await prisma.syncStatus.upsert({
    where: { id: 1 },
    update: { lastSyncTimestamp: now },
    create: { id: 1, lastSyncTimestamp: now },
  });
  logger.info(`Updated last sync timestamp to: ${now.toISOString()}`);
}