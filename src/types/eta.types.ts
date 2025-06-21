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

// This models the response from GET .../details, where 'document' is OPTIONAL.
export interface IInvoiceDetails {
  uuid: string;
  status: string;
  document?: {
    totalSalesAmount: number;
    totalDiscountAmount: number;
    netAmount: number;
    invoiceLines?: IInvoiceLine[];
  };
}