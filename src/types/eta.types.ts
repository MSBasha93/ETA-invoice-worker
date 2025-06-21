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

// This represents the nested "document" object, which is the actual Invoice v1.0
export interface IInvoiceV1 {
  issuer: { id: string; name: string; type: string; address?: any };
  receiver: { id: string; name: string; type: string; address?: any };
  documentType: string;
  documentTypeVersion: string;
  dateTimeIssued: string;
  internalId: string;
  totalSalesAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
  totalAmount: number;
  invoiceLines: IInvoiceLine[];
}

// This represents the full response from the GET /.../raw or /.../details endpoint
export interface IAPIDocumentResponse {
  uuid: string;
  submissionUUID: string;
  status: string;
  dateTimeReceived: string;
  // The crucial part: the document object is nested and optional
  document?: IInvoiceV1;
}