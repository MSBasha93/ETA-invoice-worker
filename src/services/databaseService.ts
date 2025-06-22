// src/services/databaseService.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { IInvoiceRawData, IInvoiceSummary } from '../types/eta.types';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

// This interface represents the complete, merged data for a single invoice.
export interface IProcessedInvoice {
  summary: IInvoiceSummary;
  rawData: IInvoiceRawData | null;
}

// NEW BATCH FUNCTION: Takes an array of processed invoices and saves them all.
export async function upsertInvoiceBatch(batch: IProcessedInvoice[]) {
  if (batch.length === 0) {
    return;
  }
  
  logger.info(`Upserting a batch of ${batch.length} invoices...`);

  try {
    // A single large transaction for the entire batch ensures data integrity.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const { summary, rawData } of batch) {
        
        const invoicePayload: Prisma.InvoiceCreateInput = {
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
          valueDifference: line.valueDifference,
          totalTaxableFees: line.totalTaxableFees,
          itemsDiscount: line.itemsDiscount,
          taxableItems: line.taxableItems || [],
        }));

        await tx.invoice.upsert({
          where: { uuid: summary.uuid },
          update: invoicePayload,
          create: invoicePayload,
        });

        await tx.invoiceLine.deleteMany({ where: { invoiceUuid: summary.uuid } });
        
        if (lineItemsPayload.length > 0) {
          await tx.invoiceLine.createMany({ data: lineItemsPayload });
        }
      }
    });
    logger.info(`Successfully saved batch of ${batch.length} invoices.`);
  } catch (error) {
    logger.error(`Failed to save invoice batch.`, { error });
    throw error;
  }
}

// ... other functions are correct and unchanged ...
export async function getLastSyncTimestamp(): Promise<Date> {
  const status = await prisma.syncStatus.findUnique({ where: { id: 1 } });
  if (status) { return status.lastSyncTimestamp; }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

export async function updateLastSyncTimestamp(syncTime: Date): Promise<void> {
  await prisma.syncStatus.upsert({
    where: { id: 1 },
    update: { lastSyncTimestamp: syncTime },
    create: { id: 1, lastSyncTimestamp: syncTime },
  });
  logger.info(`Updated last sync timestamp to: ${syncTime.toISOString()}`);
}