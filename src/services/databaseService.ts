// src/services/databaseService.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { IInvoiceRawData } from '../types/eta.types';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

export async function upsertInvoice(rawData: IInvoiceRawData) {
  logger.debug(`Upserting invoice with UUID: ${rawData.uuid}`);

  const invoicePayload: Prisma.InvoiceCreateInput = {
    uuid: rawData.uuid,
    submissionUuid: rawData.submissionUUID,
    internalId: rawData.internalId,
    status: rawData.status,
    typeName: rawData.typeName,
    typeVersion: rawData.typeVersionName,
    issuerId: rawData.issuerId,
    issuerName: rawData.issuerName,
    // Safely handle potentially missing receiver info
    receiverId: rawData.receiverId || 'N/A',
    receiverName: rawData.receiverName || 'N/A',
    dateTimeIssued: new Date(rawData.dateTimeIssued),
    dateTimeReceived: new Date(rawData.dateTimeReceived),
    totalAmount: rawData.total,
    totalSales: rawData.totalSales,
    totalDiscount: rawData.totalDiscount,
    netAmount: rawData.netAmount,
  };

  // Safely get lines from the optional nested object
  const lines = rawData.document?.invoiceLines || [];
  const lineItemsPayload: Prisma.InvoiceLineCreateManyInput[] = lines.map(line => ({
    invoiceUuid: rawData.uuid,
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
        where: { uuid: rawData.uuid },
        update: invoicePayload,
        create: invoicePayload,
      });

      await tx.invoiceLine.deleteMany({ where: { invoiceUuid: rawData.uuid } });
      
      if (lineItemsPayload.length > 0) {
        await tx.invoiceLine.createMany({ data: lineItemsPayload });
      }
    });
    logger.info(`Successfully saved invoice ${rawData.uuid} with ${lineItemsPayload.length} lines.`);
  } catch (error) {
    logger.error(`Failed to save invoice ${rawData.uuid}`, { error });
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

export async function updateLastSyncTimestamp(): Promise<void> {
  const now = new Date();
  await prisma.syncStatus.upsert({
    where: { id: 1 },
    update: { lastSyncTimestamp: now },
    create: { id: 1, lastSyncTimestamp: now },
  });
  logger.info(`Updated last sync timestamp to: ${now.toISOString()}`);
}