/**
 * Plaid API Client
 * Handles bank connections, account data, and transaction retrieval
 * 
 * Rate Limiting Considerations:
 * - Plaid has different rate limits per endpoint and plan
 * - Development: 100 requests/minute
 * - Production: Varies by endpoint (typically 100-1000/minute)
 * - Implement exponential backoff on 429 responses
 * - Consider request queuing for bulk operations
 */

import type {
  PlaidConfig,
  PlaidEnvironment,
  CreateLinkTokenRequest,
  CreateLinkTokenResponse,
  ExchangePublicTokenRequest,
  ExchangePublicTokenResponse,
  GetAccountsRequest,
  GetAccountsResponse,
  GetTransactionsRequest,
  GetTransactionsResponse,
  PlaidError,
  PlaidErrorType,
} from './types';

// Custom error class for Plaid-specific errors
export class PlaidClientError extends Error {
  readonly errorType: PlaidErrorType;
  readonly errorCode: string;
  readonly requestId: string;
  readonly displayMessage: string | null;

  constructor(error: PlaidError) {
    super(error.errorMessage);
    this.name = 'PlaidClientError';
    this.errorType = error.errorType;
    this.errorCode = error.errorCode;
    this.requestId = error.requestId;
    this.displayMessage = error.displayMessage;
  }

  isRateLimited(): boolean {
    return this.errorType === 'RATE_LIMIT_EXCEEDED';
  }

  isItemError(): boolean {
    return this.errorType === 'ITEM_ERROR';
  }

  isInstitutionError(): boolean {
    return this.errorType === 'INSTITUTION_ERROR';
  }
}

// Environment URL mapping
const PLAID_URLS: Record<PlaidEnvironment, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

export class PlaidClient {
  private readonly config: PlaidConfig;
  private readonly baseUrl: string;

  constructor(config?: Partial<PlaidConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env.PLAID_CLIENT_ID ?? '',
      secret: config?.secret ?? process.env.PLAID_SECRET ?? '',
      env: (config?.env ?? process.env.PLAID_ENV ?? 'sandbox') as PlaidEnvironment,
    };

    if (!this.config.clientId || !this.config.secret) {
      throw new Error('Plaid client requires PLAID_CLIENT_ID and PLAID_SECRET');
    }

    this.baseUrl = PLAID_URLS[this.config.env];
  }

  /**
   * Make an authenticated request to the Plaid API
   */
  private async request<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': this.config.clientId,
        'PLAID-SECRET': this.config.secret,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as T | PlaidError;

    if (!response.ok) {
      throw new PlaidClientError(data as PlaidError);
    }

    return data as T;
  }

  /**
   * Create a Link token for initializing Plaid Link
   * Link tokens expire after 4 hours
   */
  async createLinkToken(request: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse> {
    const response = await this.request<{
      link_token: string;
      expiration: string;
      request_id: string;
    }>('/link/token/create', {
      client_name: request.clientName,
      user: { client_user_id: request.userId },
      products: request.products,
      country_codes: request.countryCodes,
      language: request.language,
      webhook: request.webhook,
      redirect_uri: request.redirectUri,
    });

    return {
      linkToken: response.link_token,
      expiration: response.expiration,
      requestId: response.request_id,
    };
  }

  /**
   * Exchange a public token from Plaid Link for an access token
   * The access token is used for all subsequent API calls for this Item
   */
  async exchangePublicToken(request: ExchangePublicTokenRequest): Promise<ExchangePublicTokenResponse> {
    const response = await this.request<{
      access_token: string;
      item_id: string;
      request_id: string;
    }>('/item/public_token/exchange', {
      public_token: request.publicToken,
    });

    return {
      accessToken: response.access_token,
      itemId: response.item_id,
      requestId: response.request_id,
    };
  }

  /**
   * Retrieve accounts associated with an Item
   */
  async getAccounts(request: GetAccountsRequest): Promise<GetAccountsResponse> {
    const response = await this.request<{
      accounts: Array<{
        account_id: string;
        balances: {
          available: number | null;
          current: number | null;
          limit: number | null;
          iso_currency_code: string | null;
          unofficial_currency_code: string | null;
        };
        mask: string | null;
        name: string;
        official_name: string | null;
        type: string;
        subtype: string | null;
      }>;
      item: {
        item_id: string;
        institution_id: string | null;
        webhook: string | null;
        error: PlaidError | null;
        available_products: string[];
        billed_products: string[];
        consent_expiration_time: string | null;
      };
      request_id: string;
    }>('/accounts/get', {
      access_token: request.accessToken,
      options: request.accountIds ? { account_ids: request.accountIds } : undefined,
    });

    return {
      accounts: response.accounts.map((acc) => ({
        accountId: acc.account_id,
        balances: {
          available: acc.balances.available,
          current: acc.balances.current,
          limit: acc.balances.limit,
          isoCurrencyCode: acc.balances.iso_currency_code,
          unofficialCurrencyCode: acc.balances.unofficial_currency_code,
        },
        mask: acc.mask,
        name: acc.name,
        officialName: acc.official_name,
        type: acc.type as GetAccountsResponse['accounts'][0]['type'],
        subtype: acc.subtype,
      })),
      item: {
        itemId: response.item.item_id,
        institutionId: response.item.institution_id,
        webhook: response.item.webhook,
        error: response.item.error,
        availableProducts: response.item.available_products as GetAccountsResponse['item']['availableProducts'],
        billedProducts: response.item.billed_products as GetAccountsResponse['item']['billedProducts'],
        consentExpirationTime: response.item.consent_expiration_time,
      },
      requestId: response.request_id,
    };
  }

  /**
   * Retrieve transactions for an Item
   * Note: Use pagination for large date ranges (count/offset)
   * Consider using /transactions/sync for incremental updates
   */
  async getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    const response = await this.request<{
      accounts: Array<{
        account_id: string;
        balances: {
          available: number | null;
          current: number | null;
          limit: number | null;
          iso_currency_code: string | null;
          unofficial_currency_code: string | null;
        };
        mask: string | null;
        name: string;
        official_name: string | null;
        type: string;
        subtype: string | null;
      }>;
      transactions: Array<{
        transaction_id: string;
        account_id: string;
        amount: number;
        iso_currency_code: string | null;
        unofficial_currency_code: string | null;
        category: string[] | null;
        category_id: string | null;
        date: string;
        authorized_date: string | null;
        location: {
          address: string | null;
          city: string | null;
          region: string | null;
          postal_code: string | null;
          country: string | null;
          lat: number | null;
          lon: number | null;
          store_number: string | null;
        };
        name: string;
        merchant_name: string | null;
        payment_meta: {
          by_order_of: string | null;
          payee: string | null;
          payer: string | null;
          payment_method: string | null;
          payment_processor: string | null;
          ppd_id: string | null;
          reason: string | null;
          reference_number: string | null;
        };
        pending: boolean;
        pending_transaction_id: string | null;
        transaction_type: string;
      }>;
      total_transactions: number;
      request_id: string;
    }>('/transactions/get', {
      access_token: request.accessToken,
      start_date: request.startDate,
      end_date: request.endDate,
      options: {
        account_ids: request.accountIds,
        count: request.count ?? 100,
        offset: request.offset ?? 0,
      },
    });

    return {
      accounts: response.accounts.map((acc) => ({
        accountId: acc.account_id,
        balances: {
          available: acc.balances.available,
          current: acc.balances.current,
          limit: acc.balances.limit,
          isoCurrencyCode: acc.balances.iso_currency_code,
          unofficialCurrencyCode: acc.balances.unofficial_currency_code,
        },
        mask: acc.mask,
        name: acc.name,
        officialName: acc.official_name,
        type: acc.type as GetAccountsResponse['accounts'][0]['type'],
        subtype: acc.subtype,
      })),
      transactions: response.transactions.map((tx) => ({
        transactionId: tx.transaction_id,
        accountId: tx.account_id,
        amount: tx.amount,
        isoCurrencyCode: tx.iso_currency_code,
        unofficialCurrencyCode: tx.unofficial_currency_code,
        category: tx.category,
        categoryId: tx.category_id,
        date: tx.date,
        authorizedDate: tx.authorized_date,
        location: {
          address: tx.location.address,
          city: tx.location.city,
          region: tx.location.region,
          postalCode: tx.location.postal_code,
          country: tx.location.country,
          lat: tx.location.lat,
          lon: tx.location.lon,
          storeNumber: tx.location.store_number,
        },
        name: tx.name,
        merchantName: tx.merchant_name,
        paymentMeta: {
          byOrderOf: tx.payment_meta.by_order_of,
          payee: tx.payment_meta.payee,
          payer: tx.payment_meta.payer,
          paymentMethod: tx.payment_meta.payment_method,
          paymentProcessor: tx.payment_meta.payment_processor,
          ppdId: tx.payment_meta.ppd_id,
          reason: tx.payment_meta.reason,
          referenceNumber: tx.payment_meta.reference_number,
        },
        pending: tx.pending,
        pendingTransactionId: tx.pending_transaction_id,
        transactionType: tx.transaction_type as GetTransactionsResponse['transactions'][0]['transactionType'],
      })),
      totalTransactions: response.total_transactions,
      requestId: response.request_id,
    };
  }
}

// Singleton instance
let plaidClientInstance: PlaidClient | null = null;

export function getPlaidClient(config?: Partial<PlaidConfig>): PlaidClient {
  if (!plaidClientInstance) {
    plaidClientInstance = new PlaidClient(config);
  }
  return plaidClientInstance;
}

export function resetPlaidClient(): void {
  plaidClientInstance = null;
}
