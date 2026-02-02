/**
 * QuickBooks Integration
 * Accounting sync and invoice management
 */

export { QuickBooksClient, QuickBooksClientError, getQuickBooksClient, resetQuickBooksClient } from './client';

export type {
  // Config
  QuickBooksConfig,
  QuickBooksEnvironment,
  
  // OAuth
  OAuthTokens,
  AuthorizationUrlParams,
  QuickBooksScope,
  
  // Invoice
  QuickBooksInvoice,
  InvoiceLine,
  CreateInvoiceRequest,
  CreateInvoiceLineRequest,
  GetInvoicesRequest,
  GetInvoicesResponse,
  EmailStatus,
  PrintStatus,
  
  // Common
  EntityRef,
  CurrencyRef,
  Address,
  CustomerMemo,
  MetaData,
  
  // Accounts
  QuickBooksAccount,
  AccountType,
  AccountClassification,
  GetAccountsRequest,
  GetAccountsResponse,
  
  // Transactions
  SyncTransactionsRequest,
  SyncTransactionsResponse,
  QuickBooksTransaction,
  TransactionType,
  
  // Errors
  QuickBooksError,
  QuickBooksErrorType,
} from './types';
