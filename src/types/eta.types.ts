// src/types/eta.types.ts

export interface IInvoiceSummary {
  uuid: string;
  submissionUUID: string;
  internalId: string;
  typeName: string;
  typeVersionName: string;
  issuerId: string;
  issuerName: string;
  receiverId: string;
  receiverName: string;
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

// A single line item, matching the structure inside the API response
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
  netTotal: number;
  total: number;
  discount: {
    rate: number;
    amount: number;
  };
  internalCode: string;
}

// This now models the response from the GET .../documents/{uuid}/raw endpoint
export interface IInvoiceRawData {
  uuid: string;
  submissionUUID: string;
  internalId: string;
  typeName: string;
  typeVersionName: string;
  issuerId: string;
  issuerName: string;
  // Use optional chaining for receiver as it might not always exist
  receiverId?: string;
  receiverName?: string;
  dateTimeIssued: string;
  dateTimeReceived: string;
  totalSales: number;
  totalDiscount: number;
  netAmount: number;
  total: number;
  status: string;
  // The 'document' object is optional and may only contain invoiceLines
  document?: {
    invoiceLines?: IInvoiceLine[];
  };
}