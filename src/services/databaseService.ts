// src/services/databaseService.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { IInvoiceRawData, IInvoiceSummary } from '../types/eta.types';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

export async function upsertInvoice(
  summary: IInvoiceSummary,
  rawData: IInvoiceRawData | null
) {
  logger.debug(`Upserting invoice with UUID: ${summary.uuid}`);

  const invoicePayload: Prisma.InvoiceCreateInput = {
    // Data from the reliable summary object
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
    
    // Use detailed financials from /raw if available, otherwise fallback to summary total.
    totalAmount: rawData?.total ?? summary.total,
    totalSales: rawData?.totalSales ?? 0,
    totalDiscount: rawData?.totalDiscount ?? 0,
    netAmount: rawData?.netAmount ?? 0,
  };

  const lines = rawData?.document?.invoiceLines || [];
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

export async function getLastSyncTimestamp(): Promise<Date> {
  const status = await prisma.syncStatus.findUnique({ where: { id: 1 } });
  if (status) { return status.lastSyncTimestamp; }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

// This is the single, correct version of this function.
export async function updateLastSyncTimestamp(syncTime: Date): Promise<void> {
  await prisma.syncStatus.upsert({
    where: { id: 1 },
    update: { lastSyncTimestamp: syncTime },
    create: { id: 1, lastSyncTimestamp: syncTime },
  });
  logger.info(`Updated last sync timestamp to: ${syncTime.toISOString()}`);
}