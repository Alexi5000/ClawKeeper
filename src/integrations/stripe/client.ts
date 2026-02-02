/**
 * Stripe API Client
 * Payment processing and customer management
 * 
 * Rate Limiting Considerations:
 * - Stripe has a base rate of 100 requests/second in live mode
 * - Test mode has the same limits
 * - Rate limits are shared across all API keys for an account
 * - Implement exponential backoff on 429 responses
 * - Consider using idempotency keys for safe retries
 */

import type {
  StripeConfig,
  CreatePaymentIntentRequest,
  PaymentIntent,
  ConfirmPaymentRequest,
  CreateCustomerRequest,
  Customer,
  ListPaymentsRequest,
  ListPaymentsResponse,
  StripeError,
  StripeErrorType,
} from './types';

// Custom error class for Stripe-specific errors
export class StripeClientError extends Error {
  readonly type: StripeErrorType;
  readonly code?: string;
  readonly declineCode?: string;
  readonly param?: string;
  readonly docUrl?: string;

  constructor(error: StripeError) {
    super(error.message);
    this.name = 'StripeClientError';
    this.type = error.type;
    this.code = error.code;
    this.declineCode = error.declineCode;
    this.param = error.param;
    this.docUrl = error.docUrl;
  }

  isCardError(): boolean {
    return this.type === 'card_error';
  }

  isRateLimited(): boolean {
    return this.type === 'rate_limit_error';
  }

  isInvalidRequest(): boolean {
    return this.type === 'invalid_request_error';
  }
}

const STRIPE_API_URL = 'https://api.stripe.com/v1';
const DEFAULT_API_VERSION = '2023-10-16';

export class StripeClient {
  private readonly config: StripeConfig;

  constructor(config?: Partial<StripeConfig>) {
    this.config = {
      secretKey: config?.secretKey ?? process.env.STRIPE_SECRET_KEY ?? '',
      apiVersion: config?.apiVersion ?? DEFAULT_API_VERSION,
    };

    if (!this.config.secretKey) {
      throw new Error('Stripe client requires STRIPE_SECRET_KEY');
    }
  }

  /**
   * Make an authenticated request to the Stripe API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.secretKey}`,
      'Stripe-Version': this.config.apiVersion!,
    };

    let requestBody: string | undefined;

    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = this.encodeFormData(body);
    }

    const response = await fetch(`${STRIPE_API_URL}${endpoint}`, {
      method,
      headers,
      body: requestBody,
    });

    const data = await response.json() as { error?: StripeError } & T;

    if (!response.ok || data.error) {
      throw new StripeClientError(data.error!);
    }

    return data;
  }

  /**
   * Encode object as x-www-form-urlencoded with nested key support
   */
  private encodeFormData(obj: Record<string, unknown>, prefix = ''): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.encodeFormData(value as Record<string, unknown>, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`);
        });
      } else {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
      }
    }

    return parts.filter(Boolean).join('&');
  }

  /**
   * Create a PaymentIntent for collecting a payment
   * Returns a client_secret for use with Stripe.js
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    const response = await this.request<{
      id: string;
      object: 'payment_intent';
      amount: number;
      amount_capturable: number;
      amount_received: number;
      canceled_at: number | null;
      cancellation_reason: string | null;
      capture_method: string;
      client_secret: string;
      confirmation_method: string;
      created: number;
      currency: string;
      customer: string | null;
      description: string | null;
      last_payment_error: StripeError | null;
      livemode: boolean;
      metadata: Record<string, string>;
      payment_method: string | null;
      payment_method_types: string[];
      receipt_email: string | null;
      status: string;
      statement_descriptor: string | null;
      statement_descriptor_suffix: string | null;
    }>('/payment_intents', 'POST', {
      amount: request.amount,
      currency: request.currency,
      customer: request.customerId,
      description: request.description,
      metadata: request.metadata,
      payment_method_types: request.paymentMethodTypes ?? ['card'],
      receipt_email: request.receiptEmail,
      statement_descriptor: request.statementDescriptor,
      statement_descriptor_suffix: request.statementDescriptorSuffix,
      capture_method: request.captureMethod,
      confirmation_method: request.confirmationMethod,
      setup_future_usage: request.setupFutureUsage,
    });

    return this.mapPaymentIntent(response);
  }

  /**
   * Confirm a PaymentIntent to complete the payment
   */
  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentIntent> {
    const response = await this.request<{
      id: string;
      object: 'payment_intent';
      amount: number;
      amount_capturable: number;
      amount_received: number;
      canceled_at: number | null;
      cancellation_reason: string | null;
      capture_method: string;
      client_secret: string;
      confirmation_method: string;
      created: number;
      currency: string;
      customer: string | null;
      description: string | null;
      last_payment_error: StripeError | null;
      livemode: boolean;
      metadata: Record<string, string>;
      payment_method: string | null;
      payment_method_types: string[];
      receipt_email: string | null;
      status: string;
      statement_descriptor: string | null;
      statement_descriptor_suffix: string | null;
    }>(`/payment_intents/${request.paymentIntentId}/confirm`, 'POST', {
      payment_method: request.paymentMethodId,
      return_url: request.returnUrl,
      receipt_email: request.receiptEmail,
      setup_future_usage: request.setupFutureUsage,
    });

    return this.mapPaymentIntent(response);
  }

  /**
   * Create a new customer
   */
  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    const response = await this.request<{
      id: string;
      object: 'customer';
      address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
      } | null;
      balance: number;
      created: number;
      currency: string | null;
      default_source: string | null;
      delinquent: boolean;
      description: string | null;
      discount: {
        coupon: string;
        customer: string;
        end: number | null;
        start: number;
        subscription: string | null;
      } | null;
      email: string | null;
      invoice_prefix: string | null;
      invoice_settings: {
        custom_fields: Array<{ name: string; value: string }> | null;
        default_payment_method: string | null;
        footer: string | null;
      };
      livemode: boolean;
      metadata: Record<string, string>;
      name: string | null;
      phone: string | null;
      shipping: {
        address: {
          line1: string | null;
          line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
        };
        name: string;
        phone: string | null;
      } | null;
    }>('/customers', 'POST', {
      email: request.email,
      name: request.name,
      description: request.description,
      phone: request.phone,
      address: request.address,
      metadata: request.metadata,
      payment_method: request.paymentMethodId,
      invoice_prefix: request.invoicePrefix,
      invoice_settings: request.invoiceSettings,
    });

    return this.mapCustomer(response);
  }

  /**
   * List PaymentIntents with optional filters
   */
  async listPayments(request: ListPaymentsRequest = {}): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();

    if (request.customerId) params.append('customer', request.customerId);
    if (request.limit) params.append('limit', String(request.limit));
    if (request.startingAfter) params.append('starting_after', request.startingAfter);
    if (request.endingBefore) params.append('ending_before', request.endingBefore);
    if (request.created?.gt) params.append('created[gt]', String(request.created.gt));
    if (request.created?.gte) params.append('created[gte]', String(request.created.gte));
    if (request.created?.lt) params.append('created[lt]', String(request.created.lt));
    if (request.created?.lte) params.append('created[lte]', String(request.created.lte));

    const queryString = params.toString();
    const endpoint = `/payment_intents${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      data: Array<{
        id: string;
        object: 'payment_intent';
        amount: number;
        amount_capturable: number;
        amount_received: number;
        canceled_at: number | null;
        cancellation_reason: string | null;
        capture_method: string;
        client_secret: string;
        confirmation_method: string;
        created: number;
        currency: string;
        customer: string | null;
        description: string | null;
        last_payment_error: StripeError | null;
        livemode: boolean;
        metadata: Record<string, string>;
        payment_method: string | null;
        payment_method_types: string[];
        receipt_email: string | null;
        status: string;
        statement_descriptor: string | null;
        statement_descriptor_suffix: string | null;
      }>;
      has_more: boolean;
      url: string;
    }>(endpoint, 'GET');

    return {
      data: response.data.map((pi) => this.mapPaymentIntent(pi)),
      hasMore: response.has_more,
      url: response.url,
    };
  }

  private mapPaymentIntent(raw: {
    id: string;
    object: 'payment_intent';
    amount: number;
    amount_capturable: number;
    amount_received: number;
    canceled_at: number | null;
    cancellation_reason: string | null;
    capture_method: string;
    client_secret: string;
    confirmation_method: string;
    created: number;
    currency: string;
    customer: string | null;
    description: string | null;
    last_payment_error: StripeError | null;
    livemode: boolean;
    metadata: Record<string, string>;
    payment_method: string | null;
    payment_method_types: string[];
    receipt_email: string | null;
    status: string;
    statement_descriptor: string | null;
    statement_descriptor_suffix: string | null;
  }): PaymentIntent {
    return {
      id: raw.id,
      object: 'payment_intent',
      amount: raw.amount,
      amountCapturable: raw.amount_capturable,
      amountReceived: raw.amount_received,
      canceledAt: raw.canceled_at,
      cancellationReason: raw.cancellation_reason as PaymentIntent['cancellationReason'],
      captureMethod: raw.capture_method as PaymentIntent['captureMethod'],
      clientSecret: raw.client_secret,
      confirmationMethod: raw.confirmation_method as PaymentIntent['confirmationMethod'],
      created: raw.created,
      currency: raw.currency,
      customerId: raw.customer,
      description: raw.description,
      lastPaymentError: raw.last_payment_error,
      livemode: raw.livemode,
      metadata: raw.metadata,
      paymentMethodId: raw.payment_method,
      paymentMethodTypes: raw.payment_method_types as PaymentIntent['paymentMethodTypes'],
      receiptEmail: raw.receipt_email,
      status: raw.status as PaymentIntent['status'],
      statementDescriptor: raw.statement_descriptor,
      statementDescriptorSuffix: raw.statement_descriptor_suffix,
    };
  }

  private mapCustomer(raw: {
    id: string;
    object: 'customer';
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
    balance: number;
    created: number;
    currency: string | null;
    default_source: string | null;
    delinquent: boolean;
    description: string | null;
    discount: {
      coupon: string;
      customer: string;
      end: number | null;
      start: number;
      subscription: string | null;
    } | null;
    email: string | null;
    invoice_prefix: string | null;
    invoice_settings: {
      custom_fields: Array<{ name: string; value: string }> | null;
      default_payment_method: string | null;
      footer: string | null;
    };
    livemode: boolean;
    metadata: Record<string, string>;
    name: string | null;
    phone: string | null;
    shipping: {
      address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
      };
      name: string;
      phone: string | null;
    } | null;
  }): Customer {
    return {
      id: raw.id,
      object: 'customer',
      address: raw.address ? {
        line1: raw.address.line1 ?? undefined,
        line2: raw.address.line2 ?? undefined,
        city: raw.address.city ?? undefined,
        state: raw.address.state ?? undefined,
        postalCode: raw.address.postal_code ?? undefined,
        country: raw.address.country ?? undefined,
      } : null,
      balance: raw.balance,
      created: raw.created,
      currency: raw.currency,
      defaultSourceId: raw.default_source,
      delinquent: raw.delinquent,
      description: raw.description,
      discount: raw.discount ? {
        couponId: raw.discount.coupon,
        customerId: raw.discount.customer,
        end: raw.discount.end,
        start: raw.discount.start,
        subscriptionId: raw.discount.subscription,
      } : null,
      email: raw.email,
      invoicePrefix: raw.invoice_prefix,
      invoiceSettings: {
        customFields: raw.invoice_settings.custom_fields,
        defaultPaymentMethodId: raw.invoice_settings.default_payment_method,
        footer: raw.invoice_settings.footer,
      },
      livemode: raw.livemode,
      metadata: raw.metadata,
      name: raw.name,
      phone: raw.phone,
      shipping: raw.shipping ? {
        address: {
          line1: raw.shipping.address.line1 ?? undefined,
          line2: raw.shipping.address.line2 ?? undefined,
          city: raw.shipping.address.city ?? undefined,
          state: raw.shipping.address.state ?? undefined,
          postalCode: raw.shipping.address.postal_code ?? undefined,
          country: raw.shipping.address.country ?? undefined,
        },
        name: raw.shipping.name,
        phone: raw.shipping.phone,
      } : null,
    };
  }
}

// Singleton instance
let stripeClientInstance: StripeClient | null = null;

export function getStripeClient(config?: Partial<StripeConfig>): StripeClient {
  if (!stripeClientInstance) {
    stripeClientInstance = new StripeClient(config);
  }
  return stripeClientInstance;
}

export function resetStripeClient(): void {
  stripeClientInstance = null;
}
