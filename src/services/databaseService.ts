import { Prisma, PrismaClient, PrismaPromise } from '@prisma/client';
import { IInvoiceDetails } from '../types/eta.types';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

export async function upsertInvoice(invoiceData: IInvoiceDetails) {
  const doc = invoiceData.document;
  const invoicePayload: Prisma.InvoiceCreateInput = {
    uuid: invoiceData.uuid,
    submissionUuid: invoiceData.submissionUUID,
    internalId: doc.internalId,
    status: invoiceData.status,
    typeName: doc.documentType,
    typeVersion: doc.documentTypeVersion,
    issuerId: doc.issuer.id,
    issuerName: doc.issuer.name,
    issuerType: doc.issuer.type,
    issuerAddress: doc.issuer.address,
    receiverId: doc.receiver.id,
    receiverName: doc.receiver.name,
    receiverType: doc.receiver.type,
    receiverAddress: doc.receiver.address,
    dateTimeIssued: new Date(doc.dateTimeIssued),
    dateTimeReceived: new Date(invoiceData.dateTimeRecevied), // Correcting API typo
    totalSales: doc.totalSalesAmount,
    totalDiscount: doc.totalDiscountAmount,
    netAmount: doc.netAmount,
    totalAmount: doc.totalAmount,
    taxTotals: doc.taxTotals,
    validationResults: invoiceData.validationResults,
  };

  const lineItemsPayload: Prisma.InvoiceLineCreateManyInput[] = doc.invoiceLines.map(line => ({
    invoiceUuid: invoiceData.uuid,
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
    taxableItems: line.lineTaxableItems || [],
  }));

  try {
    // --- CHANGE 2: Add the correct type for the transaction client 'tx' ---
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.invoice.upsert({
        where: { uuid: invoiceData.uuid },
        update: invoicePayload,
        create: invoicePayload,
      });

      await tx.invoiceLine.deleteMany({ where: { invoiceUuid: invoiceData.uuid } });
      await tx.invoiceLine.createMany({ data: lineItemsPayload });
    });
    logger.debug(`Successfully saved invoice ${invoiceData.uuid}`);
  } catch (error) {
    logger.error(`Failed to save invoice ${invoiceData.uuid}`, { error });
    throw error;
  }
}

export async function getLastSyncTimestamp(): Promise<Date> {
  const status = await prisma.syncStatus.findUnique({ where: { id: 1 } });
  if (status) {
    return status.lastSyncTimestamp;
  }
  // If no record exists, go back 30 days for the initial sync
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