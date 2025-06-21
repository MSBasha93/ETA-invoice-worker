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

// Models the response from the GET /.../raw endpoint, where the 'document' object is optional.
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