/**
 * QuickBooks API Client
 * Accounting sync and invoice management
 * 
 * Rate Limiting Considerations:
 * - QuickBooks has a rate limit of 500 requests per minute per realm
 * - Throttling occurs at 10 requests per second burst
 * - Implement request queuing and exponential backoff
 * - Use batch operations where available
 * - Cache frequently accessed data (Chart of Accounts, Items)
 */

import type {
  QuickBooksConfig,
  QuickBooksEnvironment,
  OAuthTokens,
  AuthorizationUrlParams,
  QuickBooksScope,
  QuickBooksInvoice,
  CreateInvoiceRequest,
  GetInvoicesRequest,
  GetInvoicesResponse,
  QuickBooksAccount,
  GetAccountsRequest,
  GetAccountsResponse,
  SyncTransactionsRequest,
  SyncTransactionsResponse,
  QuickBooksError,
  QuickBooksErrorType,
} from './types';

// Custom error class for QuickBooks-specific errors
export class QuickBooksClientError extends Error {
  readonly errorType: QuickBooksErrorType;
  readonly errorCode: string;
  readonly detail: string;
  readonly element?: string;

  constructor(error: QuickBooksError) {
    const firstError = error.fault.error[0];
    super(firstError?.message ?? 'Unknown QuickBooks error');
    this.name = 'QuickBooksClientError';
    this.errorType = error.fault.type;
    this.errorCode = firstError?.code ?? 'UNKNOWN';
    this.detail = firstError?.detail ?? '';
    this.element = firstError?.element;
  }

  isValidationError(): boolean {
    return this.errorType === 'ValidationFault';
  }

  isAuthError(): boolean {
    return this.errorType === 'AuthenticationFault' || this.errorType === 'AuthorizationFault';
  }

  isSystemError(): boolean {
    return this.errorType === 'SystemFault';
  }
}

// Environment URL mapping
const QUICKBOOKS_URLS: Record<QuickBooksEnvironment, { auth: string; api: string }> = {
  sandbox: {
    auth: 'https://appcenter.intuit.com/connect/oauth2',
    api: 'https://sandbox-quickbooks.api.intuit.com/v3',
  },
  production: {
    auth: 'https://appcenter.intuit.com/connect/oauth2',
    api: 'https://quickbooks.api.intuit.com/v3',
  },
};

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

export class QuickBooksClient {
  private readonly config: QuickBooksConfig;
  private readonly authUrl: string;
  private readonly apiUrl: string;

  constructor(config?: Partial<QuickBooksConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env.QUICKBOOKS_CLIENT_ID ?? '',
      clientSecret: config?.clientSecret ?? process.env.QUICKBOOKS_CLIENT_SECRET ?? '',
      redirectUri: config?.redirectUri ?? process.env.QUICKBOOKS_REDIRECT_URI ?? '',
      environment: config?.environment ?? (process.env.QUICKBOOKS_ENV as QuickBooksEnvironment) ?? 'sandbox',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('QuickBooks client requires QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET');
    }

    const urls = QUICKBOOKS_URLS[this.config.environment];
    this.authUrl = urls.auth;
    this.apiUrl = urls.api;
  }

  // ==================== OAuth Flow ====================

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scope ?? ['com.intuit.quickbooks.accounting'];
    const searchParams = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state: params.state,
    });

    return `${this.authUrl}?${searchParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, realmId: string): Promise<OAuthTokens> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      realmId,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, realmId: string): Promise<OAuthTokens> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      realmId,
    };
  }

  /**
   * Revoke tokens
   */
  async revokeToken(token: string): Promise<void> {
    const response = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to revoke token: ${error}`);
    }
  }

  // ==================== API Requests ====================

  /**
   * Make an authenticated request to the QuickBooks API
   */
  private async request<T>(
    realmId: string,
    accessToken: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.apiUrl}/company/${realmId}${endpoint}`;
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as T | QuickBooksError;

    if (!response.ok) {
      throw new QuickBooksClientError(data as QuickBooksError);
    }

    return data as T;
  }

  /**
   * Execute a query against the QuickBooks API
   */
  private async query<T>(
    realmId: string,
    accessToken: string,
    query: string
  ): Promise<T> {
    const encodedQuery = encodeURIComponent(query);
    return this.request<T>(realmId, accessToken, `/query?query=${encodedQuery}`, 'GET');
  }

  // ==================== Invoices ====================

  /**
   * Get invoices with optional filtering
   */
  async getInvoices(request: GetInvoicesRequest): Promise<GetInvoicesResponse> {
    const { realmId, accessToken, query, startPosition = 1, maxResults = 100 } = request;
    
    const baseQuery = query ?? 'SELECT * FROM Invoice';
    const paginatedQuery = `${baseQuery} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await this.query<{
      QueryResponse: {
        Invoice?: Array<Record<string, unknown>>;
        startPosition: number;
        maxResults: number;
        totalCount?: number;
      };
    }>(realmId, accessToken, paginatedQuery);

    return {
      invoices: (response.QueryResponse.Invoice ?? []).map(this.mapInvoice),
      startPosition: response.QueryResponse.startPosition,
      maxResults: response.QueryResponse.maxResults,
      totalCount: response.QueryResponse.totalCount,
    };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    realmId: string,
    accessToken: string,
    request: CreateInvoiceRequest
  ): Promise<QuickBooksInvoice> {
    const invoiceData = {
      CustomerRef: { value: request.customerId },
      Line: request.lines.map((line, index) => ({
        Id: String(index + 1),
        LineNum: index + 1,
        Description: line.description,
        Amount: line.amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: line.itemId ? {
          ItemRef: { value: line.itemId },
          UnitPrice: line.unitPrice,
          Qty: line.quantity,
        } : undefined,
      })),
      TxnDate: request.txnDate,
      DueDate: request.dueDate,
      DocNumber: request.docNumber,
      PrivateNote: request.privateNote,
      CustomerMemo: request.customerMemo ? { value: request.customerMemo } : undefined,
      BillEmail: request.billEmail ? { Address: request.billEmail } : undefined,
      BillAddr: request.billAddr,
      ShipAddr: request.shipAddr,
    };

    const response = await this.request<{
      Invoice: Record<string, unknown>;
    }>(realmId, accessToken, '/invoice', 'POST', invoiceData);

    return this.mapInvoice(response.Invoice);
  }

  // ==================== Accounts ====================

  /**
   * Get chart of accounts
   */
  async getAccounts(request: GetAccountsRequest): Promise<GetAccountsResponse> {
    const { realmId, accessToken, query, startPosition = 1, maxResults = 100 } = request;
    
    const baseQuery = query ?? 'SELECT * FROM Account';
    const paginatedQuery = `${baseQuery} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await this.query<{
      QueryResponse: {
        Account?: Array<Record<string, unknown>>;
        startPosition: number;
        maxResults: number;
        totalCount?: number;
      };
    }>(realmId, accessToken, paginatedQuery);

    return {
      accounts: (response.QueryResponse.Account ?? []).map(this.mapAccount),
      startPosition: response.QueryResponse.startPosition,
      maxResults: response.QueryResponse.maxResults,
      totalCount: response.QueryResponse.totalCount,
    };
  }

  // ==================== Transactions Sync ====================

  /**
   * Sync transactions for reconciliation
   * Fetches various transaction types within a date range
   */
  async syncTransactions(request: SyncTransactionsRequest): Promise<SyncTransactionsResponse> {
    const { realmId, accessToken, startDate, endDate } = request;
    
    // Query multiple transaction types
    const transactionTypes = [
      'Purchase',
      'Deposit',
      'Transfer',
      'JournalEntry',
      'Payment',
      'Bill',
      'BillPayment',
    ];

    const transactions: SyncTransactionsResponse['transactions'] = [];

    for (const txnType of transactionTypes) {
      const query = `SELECT * FROM ${txnType} WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
      
      try {
        const response = await this.query<{
          QueryResponse: Record<string, Array<Record<string, unknown>>>;
        }>(realmId, accessToken, query);

        const items = response.QueryResponse[txnType] ?? [];
        
        for (const item of items) {
          transactions.push({
            id: String(item.Id ?? ''),
            txnType: txnType as SyncTransactionsResponse['transactions'][0]['txnType'],
            txnDate: String(item.TxnDate ?? ''),
            amount: Number(item.TotalAmt ?? item.Amount ?? 0),
            accountRef: {
              value: String((item.AccountRef as Record<string, unknown>)?.value ?? ''),
              name: String((item.AccountRef as Record<string, unknown>)?.name ?? ''),
            },
            entityRef: item.EntityRef ? {
              value: String((item.EntityRef as Record<string, unknown>)?.value ?? ''),
              name: String((item.EntityRef as Record<string, unknown>)?.name ?? ''),
            } : null,
            description: item.PrivateNote as string | null ?? null,
            metaData: {
              createTime: String((item.MetaData as Record<string, unknown>)?.CreateTime ?? ''),
              lastUpdatedTime: String((item.MetaData as Record<string, unknown>)?.LastUpdatedTime ?? ''),
            },
          });
        }
      } catch {
        // Some transaction types may not exist or may fail - continue with others
        continue;
      }
    }

    return {
      transactions,
      syncedAt: new Date(),
      hasMore: false, // Simplified - real implementation would handle pagination
    };
  }

  // ==================== Mapping Helpers ====================

  private mapInvoice(raw: Record<string, unknown>): QuickBooksInvoice {
    const customerRef = raw.CustomerRef as Record<string, unknown> | undefined;
    const currencyRef = raw.CurrencyRef as Record<string, unknown> | undefined;
    const metaData = raw.MetaData as Record<string, unknown> | undefined;
    const billEmail = raw.BillEmail as Record<string, unknown> | undefined;
    const customerMemo = raw.CustomerMemo as Record<string, unknown> | undefined;
    const depositAccountRef = raw.DepositToAccountRef as Record<string, unknown> | undefined;
    const lines = raw.Line as Array<Record<string, unknown>> | undefined;

    return {
      id: String(raw.Id ?? ''),
      syncToken: String(raw.SyncToken ?? '0'),
      docNumber: (raw.DocNumber as string) ?? null,
      txnDate: String(raw.TxnDate ?? ''),
      dueDate: (raw.DueDate as string) ?? null,
      totalAmt: Number(raw.TotalAmt ?? 0),
      balance: Number(raw.Balance ?? 0),
      customerRef: {
        value: String(customerRef?.value ?? ''),
        name: customerRef?.name as string | undefined,
      },
      line: (lines ?? []).map((line) => {
        const salesDetail = line.SalesItemLineDetail as Record<string, unknown> | undefined;
        const itemRef = salesDetail?.ItemRef as Record<string, unknown> | undefined;
        const taxRef = salesDetail?.TaxCodeRef as Record<string, unknown> | undefined;

        return {
          id: String(line.Id ?? ''),
          lineNum: Number(line.LineNum ?? 0),
          description: (line.Description as string) ?? null,
          amount: Number(line.Amount ?? 0),
          detailType: line.DetailType as 'SalesItemLineDetail' | 'SubTotalLineDetail' | 'DiscountLineDetail',
          salesItemLineDetail: salesDetail ? {
            itemRef: {
              value: String(itemRef?.value ?? ''),
              name: itemRef?.name as string | undefined,
            },
            unitPrice: Number(salesDetail.UnitPrice ?? 0),
            qty: Number(salesDetail.Qty ?? 0),
            taxCodeRef: taxRef ? {
              value: String(taxRef.value ?? ''),
              name: taxRef.name as string | undefined,
            } : undefined,
          } : undefined,
        };
      }),
      currencyRef: {
        value: String(currencyRef?.value ?? 'USD'),
        name: currencyRef?.name as string | undefined,
      },
      emailStatus: (raw.EmailStatus as QuickBooksInvoice['emailStatus']) ?? 'NotSet',
      printStatus: (raw.PrintStatus as QuickBooksInvoice['printStatus']) ?? 'NotSet',
      billingEmail: (billEmail?.Address as string) ?? null,
      shipAddr: this.mapAddress(raw.ShipAddr as Record<string, unknown> | undefined),
      billAddr: this.mapAddress(raw.BillAddr as Record<string, unknown> | undefined),
      privateNote: (raw.PrivateNote as string) ?? null,
      customerMemo: customerMemo ? { value: String(customerMemo.value ?? '') } : null,
      depositToAccountRef: depositAccountRef ? {
        value: String(depositAccountRef.value ?? ''),
        name: depositAccountRef.name as string | undefined,
      } : null,
      deposit: Number(raw.Deposit ?? 0),
      metaData: {
        createTime: String(metaData?.CreateTime ?? ''),
        lastUpdatedTime: String(metaData?.LastUpdatedTime ?? ''),
      },
    };
  }

  private mapAccount(raw: Record<string, unknown>): QuickBooksAccount {
    const currencyRef = raw.CurrencyRef as Record<string, unknown> | undefined;
    const parentRef = raw.ParentRef as Record<string, unknown> | undefined;
    const metaData = raw.MetaData as Record<string, unknown> | undefined;

    return {
      id: String(raw.Id ?? ''),
      syncToken: String(raw.SyncToken ?? '0'),
      name: String(raw.Name ?? ''),
      accountType: raw.AccountType as QuickBooksAccount['accountType'],
      accountSubType: String(raw.AccountSubType ?? ''),
      currentBalance: Number(raw.CurrentBalance ?? 0),
      currentBalanceWithSubAccounts: Number(raw.CurrentBalanceWithSubAccounts ?? 0),
      active: Boolean(raw.Active ?? true),
      classification: raw.Classification as QuickBooksAccount['classification'],
      currencyRef: {
        value: String(currencyRef?.value ?? 'USD'),
        name: currencyRef?.name as string | undefined,
      },
      fullyQualifiedName: String(raw.FullyQualifiedName ?? ''),
      description: (raw.Description as string) ?? null,
      parentRef: parentRef ? {
        value: String(parentRef.value ?? ''),
        name: parentRef.name as string | undefined,
      } : null,
      metaData: {
        createTime: String(metaData?.CreateTime ?? ''),
        lastUpdatedTime: String(metaData?.LastUpdatedTime ?? ''),
      },
    };
  }

  private mapAddress(raw: Record<string, unknown> | undefined): QuickBooksInvoice['billAddr'] {
    if (!raw) return null;

    return {
      line1: raw.Line1 as string | undefined,
      line2: raw.Line2 as string | undefined,
      line3: raw.Line3 as string | undefined,
      city: raw.City as string | undefined,
      countrySubDivisionCode: raw.CountrySubDivisionCode as string | undefined,
      postalCode: raw.PostalCode as string | undefined,
      country: raw.Country as string | undefined,
    };
  }
}

// Singleton instance
let quickbooksClientInstance: QuickBooksClient | null = null;

export function getQuickBooksClient(config?: Partial<QuickBooksConfig>): QuickBooksClient {
  if (!quickbooksClientInstance) {
    quickbooksClientInstance = new QuickBooksClient(config);
  }
  return quickbooksClientInstance;
}

export function resetQuickBooksClient(): void {
  quickbooksClientInstance = null;
}
