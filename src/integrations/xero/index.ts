/**
 * Xero Integration
 * Accounting sync and invoice management
 */

export { XeroClient, XeroClientError, getXeroClient, resetXeroClient } from './client';

export type {
  // Config
  XeroConfig,
  
  // OAuth
  XeroOAuthTokens,
  XeroTenant,
  AuthorizationUrlParams,
  XeroScope,
  
  // Invoice
  XeroInvoice,
  InvoiceType,
  InvoiceStatus,
  LineAmountType,
  XeroLineItem,
  XeroTrackingCategory,
  XeroPayment,
  XeroCreditNote,
  XeroPrepayment,
  XeroOverpayment,
  CreateInvoiceRequest,
  CreateLineItemRequest,
  GetInvoicesRequest,
  GetInvoicesResponse,
  XeroPagination,
  
  // Contact
  XeroContact,
  ContactStatus,
  XeroAddress,
  XeroPhone,
  XeroContactPerson,
  ContactBalances,
  BalanceDetails,
  GetContactsRequest,
  GetContactsResponse,
  
  // Bank Transactions
  XeroBankTransaction,
  BankTransactionType,
  BankTransactionStatus,
  BankAccount,
  GetBankTransactionsRequest,
  GetBankTransactionsResponse,
  
  // Errors
  XeroError,
  XeroErrorType,
} from './types';
