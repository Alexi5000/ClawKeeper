/**
 * Xero Integration Types
 * Accounting sync and invoice management
 */

// Configuration
export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// OAuth
export interface XeroOAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  idToken?: string;
  scope: string;
}

export interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: 'ORGANISATION' | 'PRACTICE';
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

export interface AuthorizationUrlParams {
  state: string;
  scope?: XeroScope[];
}

export type XeroScope =
  | 'openid'
  | 'profile'
  | 'email'
  | 'offline_access'
  | 'accounting.transactions'
  | 'accounting.transactions.read'
  | 'accounting.contacts'
  | 'accounting.contacts.read'
  | 'accounting.settings'
  | 'accounting.settings.read'
  | 'accounting.reports.read'
  | 'accounting.journals.read'
  | 'accounting.attachments'
  | 'accounting.attachments.read';

// Invoice
export interface XeroInvoice {
  invoiceId: string;
  type: InvoiceType;
  contact: XeroContact;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lineAmountTypes: LineAmountType;
  lineItems: XeroLineItem[];
  subTotal: number;
  totalTax: number;
  total: number;
  totalDiscount?: number;
  updatedDateUtc: string;
  currencyCode: string;
  currencyRate?: number;
  invoiceNumber?: string;
  reference?: string;
  brandingThemeId?: string;
  url?: string;
  sentToContact: boolean;
  expectedPaymentDate?: string;
  plannedPaymentDate?: string;
  hasAttachments: boolean;
  payments?: XeroPayment[];
  creditNotes?: XeroCreditNote[];
  prepayments?: XeroPrepayment[];
  overpayments?: XeroOverpayment[];
  amountDue: number;
  amountPaid: number;
  amountCredited: number;
}

export type InvoiceType = 'ACCPAY' | 'ACCREC';
export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED' | 'DELETED';
export type LineAmountType = 'Exclusive' | 'Inclusive' | 'NoTax';

export interface XeroLineItem {
  lineItemId?: string;
  description: string;
  quantity: number;
  unitAmount: number;
  itemCode?: string;
  accountCode?: string;
  taxType?: string;
  taxAmount?: number;
  lineAmount: number;
  discountRate?: number;
  discountAmount?: number;
  tracking?: XeroTrackingCategory[];
}

export interface XeroTrackingCategory {
  trackingCategoryId: string;
  trackingOptionId?: string;
  name: string;
  option?: string;
}

export interface XeroPayment {
  paymentId: string;
  date: string;
  amount: number;
  reference?: string;
  currencyRate?: number;
  hasAccount: boolean;
  hasValidationErrors: boolean;
}

export interface XeroCreditNote {
  creditNoteId: string;
  creditNoteNumber: string;
  appliedAmount: number;
}

export interface XeroPrepayment {
  prepaymentId: string;
  appliedAmount: number;
}

export interface XeroOverpayment {
  overpaymentId: string;
  appliedAmount: number;
}

// Create Invoice
export interface CreateInvoiceRequest {
  type: InvoiceType;
  contactId: string;
  lineItems: CreateLineItemRequest[];
  date?: string;
  dueDate?: string;
  lineAmountTypes?: LineAmountType;
  invoiceNumber?: string;
  reference?: string;
  brandingThemeId?: string;
  currencyCode?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
}

export interface CreateLineItemRequest {
  description: string;
  quantity: number;
  unitAmount: number;
  itemCode?: string;
  accountCode?: string;
  taxType?: string;
  discountRate?: number;
  tracking?: Array<{ trackingCategoryId: string; trackingOptionId: string }>;
}

// Get Invoices
export interface GetInvoicesRequest {
  tenantId: string;
  accessToken: string;
  page?: number;
  where?: string;
  order?: string;
  ids?: string[];
  invoiceNumbers?: string[];
  contactIds?: string[];
  statuses?: InvoiceStatus[];
  createdByMyApp?: boolean;
}

export interface GetInvoicesResponse {
  invoices: XeroInvoice[];
  pagination?: XeroPagination;
}

export interface XeroPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  itemCount: number;
}

// Contact
export interface XeroContact {
  contactId: string;
  contactNumber?: string;
  accountNumber?: string;
  contactStatus: ContactStatus;
  name: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  bankAccountDetails?: string;
  taxNumber?: string;
  accountsReceivableTaxType?: string;
  accountsPayableTaxType?: string;
  addresses?: XeroAddress[];
  phones?: XeroPhone[];
  isSupplier: boolean;
  isCustomer: boolean;
  defaultCurrency?: string;
  updatedDateUtc: string;
  contactPersons?: XeroContactPerson[];
  hasAttachments: boolean;
  hasValidationErrors: boolean;
  balances?: ContactBalances;
}

export type ContactStatus = 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST';

export interface XeroAddress {
  addressType: 'POBOX' | 'STREET' | 'DELIVERY';
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  attentionTo?: string;
}

export interface XeroPhone {
  phoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX';
  phoneNumber?: string;
  phoneAreaCode?: string;
  phoneCountryCode?: string;
}

export interface XeroContactPerson {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  includeInEmails?: boolean;
}

export interface ContactBalances {
  accountsReceivable?: BalanceDetails;
  accountsPayable?: BalanceDetails;
}

export interface BalanceDetails {
  outstanding: number;
  overdue: number;
}

// Get Contacts
export interface GetContactsRequest {
  tenantId: string;
  accessToken: string;
  page?: number;
  where?: string;
  order?: string;
  ids?: string[];
  includeArchived?: boolean;
}

export interface GetContactsResponse {
  contacts: XeroContact[];
  pagination?: XeroPagination;
}

// Bank Transactions
export interface XeroBankTransaction {
  bankTransactionId: string;
  type: BankTransactionType;
  contact?: XeroContact;
  lineItems: XeroLineItem[];
  bankAccount: BankAccount;
  isReconciled: boolean;
  date: string;
  reference?: string;
  currencyCode: string;
  currencyRate?: number;
  url?: string;
  status: BankTransactionStatus;
  lineAmountTypes: LineAmountType;
  subTotal: number;
  totalTax: number;
  total: number;
  prepaymentId?: string;
  overpaymentId?: string;
  updatedDateUtc: string;
  hasAttachments: boolean;
}

export type BankTransactionType =
  | 'RECEIVE'
  | 'RECEIVE-OVERPAYMENT'
  | 'RECEIVE-PREPAYMENT'
  | 'SPEND'
  | 'SPEND-OVERPAYMENT'
  | 'SPEND-PREPAYMENT'
  | 'RECEIVE-TRANSFER'
  | 'SPEND-TRANSFER';

export type BankTransactionStatus = 'AUTHORISED' | 'DELETED';

export interface BankAccount {
  accountId: string;
  code?: string;
  name?: string;
}

// Get Bank Transactions
export interface GetBankTransactionsRequest {
  tenantId: string;
  accessToken: string;
  page?: number;
  where?: string;
  order?: string;
  bankAccountId?: string;
}

export interface GetBankTransactionsResponse {
  bankTransactions: XeroBankTransaction[];
  pagination?: XeroPagination;
}

// Errors
export interface XeroError {
  errorNumber: number;
  type: XeroErrorType;
  message: string;
  elements?: Array<{
    validationErrors?: Array<{
      message: string;
    }>;
  }>;
}

export type XeroErrorType =
  | 'ValidationException'
  | 'PostDataInvalidException'
  | 'NoDataProcessedException'
  | 'NotFoundException'
  | 'InternalError'
  | 'RateLimitExceeded'
  | 'UnauthorizedException';
