/**
 * QuickBooks Integration Types
 * Accounting sync and invoice management
 */

// Configuration
export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: QuickBooksEnvironment;
}

export type QuickBooksEnvironment = 'sandbox' | 'production';

// OAuth
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  realmId: string; // Company ID
}

export interface AuthorizationUrlParams {
  state: string;
  scope?: QuickBooksScope[];
}

export type QuickBooksScope =
  | 'com.intuit.quickbooks.accounting'
  | 'com.intuit.quickbooks.payment'
  | 'openid'
  | 'profile'
  | 'email'
  | 'phone'
  | 'address';

// Invoice
export interface QuickBooksInvoice {
  id: string;
  syncToken: string;
  docNumber: string | null;
  txnDate: string;
  dueDate: string | null;
  totalAmt: number;
  balance: number;
  customerRef: EntityRef;
  line: InvoiceLine[];
  currencyRef: CurrencyRef;
  emailStatus: EmailStatus;
  printStatus: PrintStatus;
  billingEmail: string | null;
  shipAddr: Address | null;
  billAddr: Address | null;
  privateNote: string | null;
  customerMemo: CustomerMemo | null;
  depositToAccountRef: EntityRef | null;
  deposit: number;
  metaData: MetaData;
}

export interface InvoiceLine {
  id: string;
  lineNum: number;
  description: string | null;
  amount: number;
  detailType: 'SalesItemLineDetail' | 'SubTotalLineDetail' | 'DiscountLineDetail';
  salesItemLineDetail?: {
    itemRef: EntityRef;
    unitPrice: number;
    qty: number;
    taxCodeRef?: EntityRef;
  };
}

export interface EntityRef {
  value: string;
  name?: string;
}

export interface CurrencyRef {
  value: string;
  name?: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  countrySubDivisionCode?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerMemo {
  value: string;
}

export interface MetaData {
  createTime: string;
  lastUpdatedTime: string;
}

export type EmailStatus = 'NotSet' | 'NeedToSend' | 'EmailSent';
export type PrintStatus = 'NotSet' | 'NeedToPrint' | 'PrintComplete';

// Create Invoice
export interface CreateInvoiceRequest {
  customerId: string;
  lines: CreateInvoiceLineRequest[];
  txnDate?: string;
  dueDate?: string;
  docNumber?: string;
  privateNote?: string;
  customerMemo?: string;
  billEmail?: string;
  billAddr?: Address;
  shipAddr?: Address;
}

export interface CreateInvoiceLineRequest {
  description?: string;
  amount: number;
  itemId?: string;
  unitPrice?: number;
  quantity?: number;
}

// Get Invoices
export interface GetInvoicesRequest {
  realmId: string;
  accessToken: string;
  query?: string;
  startPosition?: number;
  maxResults?: number;
}

export interface GetInvoicesResponse {
  invoices: QuickBooksInvoice[];
  startPosition: number;
  maxResults: number;
  totalCount?: number;
}

// Accounts
export interface QuickBooksAccount {
  id: string;
  syncToken: string;
  name: string;
  accountType: AccountType;
  accountSubType: string;
  currentBalance: number;
  currentBalanceWithSubAccounts: number;
  active: boolean;
  classification: AccountClassification;
  currencyRef: CurrencyRef;
  fullyQualifiedName: string;
  description: string | null;
  parentRef: EntityRef | null;
  metaData: MetaData;
}

export type AccountType =
  | 'Bank'
  | 'Other Current Asset'
  | 'Fixed Asset'
  | 'Other Asset'
  | 'Accounts Receivable'
  | 'Equity'
  | 'Expense'
  | 'Other Expense'
  | 'Cost of Goods Sold'
  | 'Accounts Payable'
  | 'Credit Card'
  | 'Long Term Liability'
  | 'Other Current Liability'
  | 'Income'
  | 'Other Income';

export type AccountClassification =
  | 'Asset'
  | 'Equity'
  | 'Expense'
  | 'Liability'
  | 'Revenue';

export interface GetAccountsRequest {
  realmId: string;
  accessToken: string;
  query?: string;
  startPosition?: number;
  maxResults?: number;
}

export interface GetAccountsResponse {
  accounts: QuickBooksAccount[];
  startPosition: number;
  maxResults: number;
  totalCount?: number;
}

// Transactions Sync
export interface SyncTransactionsRequest {
  realmId: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  accountIds?: string[];
}

export interface SyncTransactionsResponse {
  transactions: QuickBooksTransaction[];
  syncedAt: Date;
  hasMore: boolean;
}

export interface QuickBooksTransaction {
  id: string;
  txnType: TransactionType;
  txnDate: string;
  amount: number;
  accountRef: EntityRef;
  entityRef: EntityRef | null;
  description: string | null;
  metaData: MetaData;
}

export type TransactionType =
  | 'Bill'
  | 'BillPayment'
  | 'CreditMemo'
  | 'Deposit'
  | 'Estimate'
  | 'Invoice'
  | 'JournalEntry'
  | 'Payment'
  | 'Purchase'
  | 'PurchaseOrder'
  | 'RefundReceipt'
  | 'SalesReceipt'
  | 'TimeActivity'
  | 'Transfer'
  | 'VendorCredit';

// Errors
export interface QuickBooksError {
  fault: {
    error: Array<{
      message: string;
      detail: string;
      code: string;
      element?: string;
    }>;
    type: QuickBooksErrorType;
  };
}

export type QuickBooksErrorType =
  | 'ValidationFault'
  | 'SystemFault'
  | 'AuthenticationFault'
  | 'AuthorizationFault';
