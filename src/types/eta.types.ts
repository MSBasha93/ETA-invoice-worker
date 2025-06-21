// Based on the 'Search Documents' API response
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

// Based on the 'Get Document Details' API response you provided
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
  lineTaxableItems?: Array<{
    taxType: string;
    amount: number;
    subType: string;
    rate: number;
  }>;
}

export interface IInvoiceDetails {
  submissionUUID: string;
  dateTimeRecevied: string; // The typo is in the API
  status: string;
  uuid: string;
  // The 'document' object contains the core invoice data. We model this based on the docs and your old SQL schema.
  document: {
    issuer: {
      name: string;
      type: string;
      id: string;
      address: any; // Storing as JSON
    };
    receiver: {
      name: string;
      type: string;
      id: string;
      address: any; // Storing as JSON
    };
    documentType: string;
    documentTypeVersion: string;
    dateTimeIssued: string;
    internalId: string;
    totalSalesAmount: number;
    totalDiscountAmount: number;
    netAmount: number;
    totalAmount: number;
    taxTotals: Array<{
      taxType: string;
      amount: number;
    }>;
    invoiceLines: IInvoiceLine[];
  };
  validationResults?: {
    status: string;
  };
}