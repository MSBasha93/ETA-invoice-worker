// src/types/eta.types.ts

export interface IInvoiceSummary {
  uuid: string;
  submissionUUID: string;
  internalId: string;
  typeName: string;
  typeVersionName: string;
  issuerId: string;
  issuerName: string;
  issuerType: string;
  receiverId: string;
  receiverName: string;
  receiverType: string;
  dateTimeIssued: string;
  dateTimeReceived: string;
  total: number;
  status: string;
}

export interface IInvoiceSearchResult {
  result: IInvoiceSummary[];
  metadata: {
    continuationToken: string | 'EndofResultSet';
  };
}

// --- THIS INTERFACE IS NOW CORRECT AND COMPLETE ---
export interface IInvoiceLine {
  description: string;
  itemType: string;
  itemCode: string;
  unitType: string;
  quantity: number;
  unitValue: {
    amountEGP: number;
  };
  salesTotal: number;
  total: number;
  valueDifference: number;
  totalTaxableFees: number;
  netTotal: number;
  itemsDiscount: number;
  discount: {
    rate: number;
    amount: number;
  };
  taxableItems?: any[]; // The '?' makes it optional
  internalCode: string;
}

// This models the response from the GET .../raw endpoint
export interface IInvoiceRawData {
  uuid: string;
  submissionUUID: string;
  internalId: string;
  typeName: string;
  typeVersionName: string;
  issuerId: string;
  issuerName: string;
  receiverId?: string;
  receiverName?: string;
  dateTimeIssued: string;
  dateTimeReceived: string;
  totalSales: number;
  totalDiscount: number;
  netAmount: number;
  total: number;
  status: string;
  document?: {
    invoiceLines?: IInvoiceLine[];
  };
}