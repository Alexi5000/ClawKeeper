/**
 * Plaid Integration
 * Bank connections and transaction data
 */

export { PlaidClient, PlaidClientError, getPlaidClient, resetPlaidClient } from './client';

export type {
  // Config
  PlaidConfig,
  PlaidEnvironment,
  PlaidProduct,
  
  // Link Token
  CreateLinkTokenRequest,
  CreateLinkTokenResponse,
  
  // Token Exchange
  ExchangePublicTokenRequest,
  ExchangePublicTokenResponse,
  
  // Accounts
  PlaidAccount,
  AccountBalances,
  AccountType,
  GetAccountsRequest,
  GetAccountsResponse,
  PlaidItem,
  
  // Transactions
  GetTransactionsRequest,
  GetTransactionsResponse,
  PlaidTransaction,
  TransactionLocation,
  PaymentMeta,
  TransactionType,
  
  // Errors
  PlaidError,
  PlaidErrorType,
} from './types';
