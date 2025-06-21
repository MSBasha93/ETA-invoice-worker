-- CreateTable
CREATE TABLE "Invoice" (
    "uuid" TEXT NOT NULL,
    "submissionUuid" TEXT,
    "internalId" TEXT,
    "status" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "typeVersion" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuerType" TEXT NOT NULL,
    "issuerAddress" JSONB,
    "receiverId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverType" TEXT NOT NULL,
    "receiverAddress" JSONB,
    "dateTimeIssued" TIMESTAMP(3) NOT NULL,
    "dateTimeReceived" TIMESTAMP(3) NOT NULL,
    "totalSales" DECIMAL(18,5) NOT NULL,
    "totalDiscount" DECIMAL(18,5) NOT NULL,
    "netAmount" DECIMAL(18,5) NOT NULL,
    "totalAmount" DECIMAL(18,5) NOT NULL,
    "taxTotals" JSONB,
    "validationResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" SERIAL NOT NULL,
    "invoiceUuid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "internalCode" TEXT,
    "quantity" DECIMAL(18,5) NOT NULL,
    "unitType" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,5) NOT NULL,
    "salesTotal" DECIMAL(18,5) NOT NULL,
    "discountAmount" DECIMAL(18,5) NOT NULL,
    "discountRate" DECIMAL(18,5) NOT NULL,
    "netTotal" DECIMAL(18,5) NOT NULL,
    "totalAmount" DECIMAL(18,5) NOT NULL,
    "taxableItems" JSONB,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncStatus" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastSyncTimestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_submissionUuid_key" ON "Invoice"("submissionUuid");

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceUuid_fkey" FOREIGN KEY ("invoiceUuid") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
