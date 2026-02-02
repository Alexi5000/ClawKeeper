/**
 * Plaid Integration Types
 * Bank connections and transaction data
 */

// Environment configuration
export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: PlaidEnvironment;
}

// Link Token
export interface CreateLinkTokenRequest {
  userId: string;
  clientName: string;
  products: PlaidProduct[];
  countryCodes: string[];
  language: string;
  webhook?: string;
  redirectUri?: string;
}

export interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export type PlaidProduct = 
  | 'transactions'
  | 'auth'
  | 'identity'
  | 'assets'
  | 'investments'
  | 'liabilities'
  | 'payment_initiation';

// Token Exchange
export interface ExchangePublicTokenRequest {
  publicToken: string;
}

export interface ExchangePublicTokenResponse {
  accessToken: string;
  itemId: string;
  requestId: string;
}

// Accounts
export interface PlaidAccount {
  accountId: string;
  balances: AccountBalances;
  mask: string | null;
  name: string;
  officialName: string | null;
  type: AccountType;
  subtype: string | null;
}

export interface AccountBalances {
  available: number | null;
  current: number | null;
  limit: number | null;
  isoCurrencyCode: string | null;
  unofficialCurrencyCode: string | null;
}

export type AccountType = 
  | 'investment'
  | 'credit'
  | 'depository'
  | 'loan'
  | 'brokerage'
  | 'other';

export interface GetAccountsRequest {
  accessToken: string;
  accountIds?: string[];
}

export interface GetAccountsResponse {
  accounts: PlaidAccount[];
  item: PlaidItem;
  requestId: string;
}

export interface PlaidItem {
  itemId: string;
  institutionId: string | null;
  webhook: string | null;
  error: PlaidError | null;
  availableProducts: PlaidProduct[];
  billedProducts: PlaidProduct[];
  consentExpirationTime: string | null;
}

// Transactions
export interface GetTransactionsRequest {
  accessToken: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  accountIds?: string[];
  count?: number;
  offset?: number;
}

export interface GetTransactionsResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  totalTransactions: number;
  requestId: string;
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  isoCurrencyCode: string | null;
  unofficialCurrencyCode: string | null;
  category: string[] | null;
  categoryId: string | null;
  date: string;
  authorizedDate: string | null;
  location: TransactionLocation;
  name: string;
  merchantName: string | null;
  paymentMeta: PaymentMeta;
  pending: boolean;
  pendingTransactionId: string | null;
  transactionType: TransactionType;
}

export interface TransactionLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  storeNumber: string | null;
}

export interface PaymentMeta {
  byOrderOf: string | null;
  payee: string | null;
  payer: string | null;
  paymentMethod: string | null;
  paymentProcessor: string | null;
  ppdId: string | null;
  reason: string | null;
  referenceNumber: string | null;
}

export type TransactionType = 
  | 'digital'
  | 'place'
  | 'special'
  | 'unresolved';

// Errors
export interface PlaidError {
  errorType: PlaidErrorType;
  errorCode: string;
  errorMessage: string;
  displayMessage: string | null;
  requestId: string;
  causes?: PlaidError[];
}

export type PlaidErrorType =
  | 'INVALID_REQUEST'
  | 'INVALID_RESULT'
  | 'INVALID_INPUT'
  | 'INSTITUTION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_ERROR'
  | 'ITEM_ERROR'
  | 'ASSET_REPORT_ERROR'
  | 'RECAPTCHA_ERROR'
  | 'OAUTH_ERROR'
  | 'PAYMENT_ERROR'
  | 'BANK_TRANSFER_ERROR';
