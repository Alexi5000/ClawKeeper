/**
 * Xero API Client
 * Accounting sync and invoice management
 * 
 * Rate Limiting Considerations:
 * - Xero has a rate limit of 60 calls per minute per tenant
 * - Daily limit of 5000 calls per tenant
 * - Minute limit resets every 60 seconds
 * - Implement exponential backoff on 429 responses
 * - Use If-Modified-Since header for polling endpoints
 * - Batch operations where possible (max 50 items per request)
 */

import type {
  XeroConfig,
  XeroOAuthTokens,
  XeroTenant,
  AuthorizationUrlParams,
  XeroScope,
  XeroInvoice,
  CreateInvoiceRequest,
  GetInvoicesRequest,
  GetInvoicesResponse,
  XeroContact,
  GetContactsRequest,
  GetContactsResponse,
  XeroBankTransaction,
  GetBankTransactionsRequest,
  GetBankTransactionsResponse,
  XeroError,
  XeroErrorType,
  XeroAddress,
  XeroPhone,
} from './types';

// Custom error class for Xero-specific errors
export class XeroClientError extends Error {
  readonly errorType: XeroErrorType;
  readonly errorNumber: number;
  readonly validationErrors: string[];

  constructor(error: XeroError) {
    super(error.message);
    this.name = 'XeroClientError';
    this.errorType = error.type;
    this.errorNumber = error.errorNumber;
    this.validationErrors = error.elements?.flatMap(
      (e) => e.validationErrors?.map((v) => v.message) ?? []
    ) ?? [];
  }

  isRateLimited(): boolean {
    return this.errorType === 'RateLimitExceeded';
  }

  isValidationError(): boolean {
    return this.errorType === 'ValidationException';
  }

  isNotFound(): boolean {
    return this.errorType === 'NotFoundException';
  }

  isUnauthorized(): boolean {
    return this.errorType === 'UnauthorizedException';
  }
}

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';
const XERO_API_URL = 'https://api.xero.com/api.xro/2.0';

export class XeroClient {
  private readonly config: XeroConfig;

  constructor(config?: Partial<XeroConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env.XERO_CLIENT_ID ?? '',
      clientSecret: config?.clientSecret ?? process.env.XERO_CLIENT_SECRET ?? '',
      redirectUri: config?.redirectUri ?? process.env.XERO_REDIRECT_URI ?? '',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Xero client requires XERO_CLIENT_ID and XERO_CLIENT_SECRET');
    }
  }

  // ==================== OAuth Flow ====================

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scope ?? [
      'openid',
      'profile',
      'email',
      'offline_access',
      'accounting.transactions',
      'accounting.contacts.read',
      'accounting.settings.read',
    ];

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state: params.state,
    });

    return `${XERO_AUTH_URL}?${searchParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<XeroOAuthTokens> {
    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
      id_token?: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      idToken: data.id_token,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<XeroOAuthTokens> {
    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
      id_token?: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      idToken: data.id_token,
      scope: data.scope,
    };
  }

  /**
   * Get connected tenants (organisations)
   */
  async getTenants(accessToken: string): Promise<XeroTenant[]> {
    const response = await fetch(XERO_CONNECTIONS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get tenants: ${error}`);
    }

    const data = await response.json() as Array<{
      id: string;
      authEventId: string;
      tenantId: string;
      tenantType: string;
      tenantName: string;
      createdDateUtc: string;
      updatedDateUtc: string;
    }>;

    return data.map((t) => ({
      id: t.id,
      authEventId: t.authEventId,
      tenantId: t.tenantId,
      tenantType: t.tenantType as XeroTenant['tenantType'],
      tenantName: t.tenantName,
      createdDateUtc: t.createdDateUtc,
      updatedDateUtc: t.updatedDateUtc,
    }));
  }

  /**
   * Revoke a connection
   */
  async revokeConnection(accessToken: string, connectionId: string): Promise<void> {
    const response = await fetch(`${XERO_CONNECTIONS_URL}/${connectionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to revoke connection: ${error}`);
    }
  }

  // ==================== API Requests ====================

  /**
   * Make an authenticated request to the Xero API
   */
  private async request<T>(
    tenantId: string,
    accessToken: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${XERO_API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        errorNumber: response.status,
        type: 'InternalError' as XeroErrorType,
        message: response.statusText,
      })) as XeroError;
      
      throw new XeroClientError(errorData);
    }

    return response.json() as Promise<T>;
  }

  // ==================== Invoices ====================

  /**
   * Get invoices with optional filtering
   */
  async getInvoices(request: GetInvoicesRequest): Promise<GetInvoicesResponse> {
    const { tenantId, accessToken, page, where, order, ids, invoiceNumbers, contactIds, statuses } = request;
    
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (where) params.append('where', where);
    if (order) params.append('order', order);
    if (ids?.length) params.append('IDs', ids.join(','));
    if (invoiceNumbers?.length) params.append('InvoiceNumbers', invoiceNumbers.join(','));
    if (contactIds?.length) params.append('ContactIDs', contactIds.join(','));
    if (statuses?.length) params.append('Statuses', statuses.join(','));

    const queryString = params.toString();
    const endpoint = `/Invoices${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      Invoices: Array<Record<string, unknown>>;
      pagination?: {
        page: number;
        pageSize: number;
        pageCount: number;
        itemCount: number;
      };
    }>(tenantId, accessToken, endpoint);

    return {
      invoices: response.Invoices.map(this.mapInvoice),
      pagination: response.pagination,
    };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    tenantId: string,
    accessToken: string,
    request: CreateInvoiceRequest
  ): Promise<XeroInvoice> {
    const invoiceData = {
      Type: request.type,
      Contact: { ContactID: request.contactId },
      LineItems: request.lineItems.map((line) => ({
        Description: line.description,
        Quantity: line.quantity,
        UnitAmount: line.unitAmount,
        ItemCode: line.itemCode,
        AccountCode: line.accountCode,
        TaxType: line.taxType,
        DiscountRate: line.discountRate,
        Tracking: line.tracking?.map((t) => ({
          TrackingCategoryID: t.trackingCategoryId,
          TrackingOptionID: t.trackingOptionId,
        })),
      })),
      Date: request.date,
      DueDate: request.dueDate,
      LineAmountTypes: request.lineAmountTypes,
      InvoiceNumber: request.invoiceNumber,
      Reference: request.reference,
      BrandingThemeID: request.brandingThemeId,
      CurrencyCode: request.currencyCode,
      Status: request.status,
    };

    const response = await this.request<{
      Invoices: Array<Record<string, unknown>>;
    }>(tenantId, accessToken, '/Invoices', 'POST', { Invoices: [invoiceData] });

    return this.mapInvoice(response.Invoices[0]);
  }

  // ==================== Contacts ====================

  /**
   * Get contacts with optional filtering
   */
  async getContacts(request: GetContactsRequest): Promise<GetContactsResponse> {
    const { tenantId, accessToken, page, where, order, ids, includeArchived } = request;
    
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (where) params.append('where', where);
    if (order) params.append('order', order);
    if (ids?.length) params.append('IDs', ids.join(','));
    if (includeArchived) params.append('includeArchived', 'true');

    const queryString = params.toString();
    const endpoint = `/Contacts${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      Contacts: Array<Record<string, unknown>>;
      pagination?: {
        page: number;
        pageSize: number;
        pageCount: number;
        itemCount: number;
      };
    }>(tenantId, accessToken, endpoint);

    return {
      contacts: response.Contacts.map(this.mapContact),
      pagination: response.pagination,
    };
  }

  // ==================== Bank Transactions ====================

  /**
   * Get bank transactions with optional filtering
   */
  async getBankTransactions(request: GetBankTransactionsRequest): Promise<GetBankTransactionsResponse> {
    const { tenantId, accessToken, page, where, order, bankAccountId } = request;
    
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (where) params.append('where', where);
    if (order) params.append('order', order);
    if (bankAccountId) params.append('where', `BankAccount.AccountID=GUID("${bankAccountId}")`);

    const queryString = params.toString();
    const endpoint = `/BankTransactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      BankTransactions: Array<Record<string, unknown>>;
      pagination?: {
        page: number;
        pageSize: number;
        pageCount: number;
        itemCount: number;
      };
    }>(tenantId, accessToken, endpoint);

    return {
      bankTransactions: response.BankTransactions.map(this.mapBankTransaction),
      pagination: response.pagination,
    };
  }

  // ==================== Mapping Helpers ====================

  private mapInvoice(raw: Record<string, unknown>): XeroInvoice {
    const contact = raw.Contact as Record<string, unknown> | undefined;
    const lineItems = raw.LineItems as Array<Record<string, unknown>> | undefined;
    const payments = raw.Payments as Array<Record<string, unknown>> | undefined;
    const creditNotes = raw.CreditNotes as Array<Record<string, unknown>> | undefined;
    const prepayments = raw.Prepayments as Array<Record<string, unknown>> | undefined;
    const overpayments = raw.Overpayments as Array<Record<string, unknown>> | undefined;

    return {
      invoiceId: String(raw.InvoiceID ?? ''),
      type: raw.Type as XeroInvoice['type'],
      contact: contact ? {
        contactId: String(contact.ContactID ?? ''),
        name: String(contact.Name ?? ''),
        contactStatus: (contact.ContactStatus as XeroContact['contactStatus']) ?? 'ACTIVE',
        isSupplier: Boolean(contact.IsSupplier),
        isCustomer: Boolean(contact.IsCustomer),
        updatedDateUtc: String(contact.UpdatedDateUTC ?? ''),
        hasAttachments: Boolean(contact.HasAttachments),
        hasValidationErrors: Boolean(contact.HasValidationErrors),
      } : {
        contactId: '',
        name: '',
        contactStatus: 'ACTIVE',
        isSupplier: false,
        isCustomer: false,
        updatedDateUtc: '',
        hasAttachments: false,
        hasValidationErrors: false,
      },
      date: String(raw.Date ?? ''),
      dueDate: String(raw.DueDate ?? ''),
      status: raw.Status as XeroInvoice['status'],
      lineAmountTypes: raw.LineAmountTypes as XeroInvoice['lineAmountTypes'],
      lineItems: (lineItems ?? []).map((line) => ({
        lineItemId: line.LineItemID as string | undefined,
        description: String(line.Description ?? ''),
        quantity: Number(line.Quantity ?? 0),
        unitAmount: Number(line.UnitAmount ?? 0),
        itemCode: line.ItemCode as string | undefined,
        accountCode: line.AccountCode as string | undefined,
        taxType: line.TaxType as string | undefined,
        taxAmount: line.TaxAmount as number | undefined,
        lineAmount: Number(line.LineAmount ?? 0),
        discountRate: line.DiscountRate as number | undefined,
        discountAmount: line.DiscountAmount as number | undefined,
        tracking: (line.Tracking as Array<Record<string, unknown>> | undefined)?.map((t) => ({
          trackingCategoryId: String(t.TrackingCategoryID ?? ''),
          trackingOptionId: t.TrackingOptionID as string | undefined,
          name: String(t.Name ?? ''),
          option: t.Option as string | undefined,
        })),
      })),
      subTotal: Number(raw.SubTotal ?? 0),
      totalTax: Number(raw.TotalTax ?? 0),
      total: Number(raw.Total ?? 0),
      totalDiscount: raw.TotalDiscount as number | undefined,
      updatedDateUtc: String(raw.UpdatedDateUTC ?? ''),
      currencyCode: String(raw.CurrencyCode ?? 'USD'),
      currencyRate: raw.CurrencyRate as number | undefined,
      invoiceNumber: raw.InvoiceNumber as string | undefined,
      reference: raw.Reference as string | undefined,
      brandingThemeId: raw.BrandingThemeID as string | undefined,
      url: raw.Url as string | undefined,
      sentToContact: Boolean(raw.SentToContact),
      expectedPaymentDate: raw.ExpectedPaymentDate as string | undefined,
      plannedPaymentDate: raw.PlannedPaymentDate as string | undefined,
      hasAttachments: Boolean(raw.HasAttachments),
      payments: payments?.map((p) => ({
        paymentId: String(p.PaymentID ?? ''),
        date: String(p.Date ?? ''),
        amount: Number(p.Amount ?? 0),
        reference: p.Reference as string | undefined,
        currencyRate: p.CurrencyRate as number | undefined,
        hasAccount: Boolean(p.HasAccount),
        hasValidationErrors: Boolean(p.HasValidationErrors),
      })),
      creditNotes: creditNotes?.map((cn) => ({
        creditNoteId: String(cn.CreditNoteID ?? ''),
        creditNoteNumber: String(cn.CreditNoteNumber ?? ''),
        appliedAmount: Number(cn.AppliedAmount ?? 0),
      })),
      prepayments: prepayments?.map((pp) => ({
        prepaymentId: String(pp.PrepaymentID ?? ''),
        appliedAmount: Number(pp.AppliedAmount ?? 0),
      })),
      overpayments: overpayments?.map((op) => ({
        overpaymentId: String(op.OverpaymentID ?? ''),
        appliedAmount: Number(op.AppliedAmount ?? 0),
      })),
      amountDue: Number(raw.AmountDue ?? 0),
      amountPaid: Number(raw.AmountPaid ?? 0),
      amountCredited: Number(raw.AmountCredited ?? 0),
    };
  }

  private mapContact(raw: Record<string, unknown>): XeroContact {
    const addresses = raw.Addresses as Array<Record<string, unknown>> | undefined;
    const phones = raw.Phones as Array<Record<string, unknown>> | undefined;
    const contactPersons = raw.ContactPersons as Array<Record<string, unknown>> | undefined;
    const balances = raw.Balances as Record<string, unknown> | undefined;
    const ar = balances?.AccountsReceivable as Record<string, unknown> | undefined;
    const ap = balances?.AccountsPayable as Record<string, unknown> | undefined;

    return {
      contactId: String(raw.ContactID ?? ''),
      contactNumber: raw.ContactNumber as string | undefined,
      accountNumber: raw.AccountNumber as string | undefined,
      contactStatus: (raw.ContactStatus as XeroContact['contactStatus']) ?? 'ACTIVE',
      name: String(raw.Name ?? ''),
      firstName: raw.FirstName as string | undefined,
      lastName: raw.LastName as string | undefined,
      emailAddress: raw.EmailAddress as string | undefined,
      bankAccountDetails: raw.BankAccountDetails as string | undefined,
      taxNumber: raw.TaxNumber as string | undefined,
      accountsReceivableTaxType: raw.AccountsReceivableTaxType as string | undefined,
      accountsPayableTaxType: raw.AccountsPayableTaxType as string | undefined,
      addresses: addresses?.map((a) => ({
        addressType: a.AddressType as XeroAddress['addressType'],
        addressLine1: a.AddressLine1 as string | undefined,
        addressLine2: a.AddressLine2 as string | undefined,
        addressLine3: a.AddressLine3 as string | undefined,
        addressLine4: a.AddressLine4 as string | undefined,
        city: a.City as string | undefined,
        region: a.Region as string | undefined,
        postalCode: a.PostalCode as string | undefined,
        country: a.Country as string | undefined,
        attentionTo: a.AttentionTo as string | undefined,
      })),
      phones: phones?.map((p) => ({
        phoneType: p.PhoneType as XeroPhone['phoneType'],
        phoneNumber: p.PhoneNumber as string | undefined,
        phoneAreaCode: p.PhoneAreaCode as string | undefined,
        phoneCountryCode: p.PhoneCountryCode as string | undefined,
      })),
      isSupplier: Boolean(raw.IsSupplier),
      isCustomer: Boolean(raw.IsCustomer),
      defaultCurrency: raw.DefaultCurrency as string | undefined,
      updatedDateUtc: String(raw.UpdatedDateUTC ?? ''),
      contactPersons: contactPersons?.map((cp) => ({
        firstName: cp.FirstName as string | undefined,
        lastName: cp.LastName as string | undefined,
        emailAddress: cp.EmailAddress as string | undefined,
        includeInEmails: cp.IncludeInEmails as boolean | undefined,
      })),
      hasAttachments: Boolean(raw.HasAttachments),
      hasValidationErrors: Boolean(raw.HasValidationErrors),
      balances: balances ? {
        accountsReceivable: ar ? {
          outstanding: Number(ar.Outstanding ?? 0),
          overdue: Number(ar.Overdue ?? 0),
        } : undefined,
        accountsPayable: ap ? {
          outstanding: Number(ap.Outstanding ?? 0),
          overdue: Number(ap.Overdue ?? 0),
        } : undefined,
      } : undefined,
    };
  }

  private mapBankTransaction(raw: Record<string, unknown>): XeroBankTransaction {
    const contact = raw.Contact as Record<string, unknown> | undefined;
    const lineItems = raw.LineItems as Array<Record<string, unknown>> | undefined;
    const bankAccount = raw.BankAccount as Record<string, unknown> | undefined;

    return {
      bankTransactionId: String(raw.BankTransactionID ?? ''),
      type: raw.Type as XeroBankTransaction['type'],
      contact: contact ? this.mapContact(contact) : undefined,
      lineItems: (lineItems ?? []).map((line) => ({
        lineItemId: line.LineItemID as string | undefined,
        description: String(line.Description ?? ''),
        quantity: Number(line.Quantity ?? 0),
        unitAmount: Number(line.UnitAmount ?? 0),
        itemCode: line.ItemCode as string | undefined,
        accountCode: line.AccountCode as string | undefined,
        taxType: line.TaxType as string | undefined,
        taxAmount: line.TaxAmount as number | undefined,
        lineAmount: Number(line.LineAmount ?? 0),
      })),
      bankAccount: {
        accountId: String(bankAccount?.AccountID ?? ''),
        code: bankAccount?.Code as string | undefined,
        name: bankAccount?.Name as string | undefined,
      },
      isReconciled: Boolean(raw.IsReconciled),
      date: String(raw.Date ?? ''),
      reference: raw.Reference as string | undefined,
      currencyCode: String(raw.CurrencyCode ?? 'USD'),
      currencyRate: raw.CurrencyRate as number | undefined,
      url: raw.Url as string | undefined,
      status: raw.Status as XeroBankTransaction['status'],
      lineAmountTypes: raw.LineAmountTypes as XeroBankTransaction['lineAmountTypes'],
      subTotal: Number(raw.SubTotal ?? 0),
      totalTax: Number(raw.TotalTax ?? 0),
      total: Number(raw.Total ?? 0),
      prepaymentId: raw.PrepaymentID as string | undefined,
      overpaymentId: raw.OverpaymentID as string | undefined,
      updatedDateUtc: String(raw.UpdatedDateUTC ?? ''),
      hasAttachments: Boolean(raw.HasAttachments),
    };
  }
}

// Singleton instance
let xeroClientInstance: XeroClient | null = null;

export function getXeroClient(config?: Partial<XeroConfig>): XeroClient {
  if (!xeroClientInstance) {
    xeroClientInstance = new XeroClient(config);
  }
  return xeroClientInstance;
}

export function resetXeroClient(): void {
  xeroClientInstance = null;
}
