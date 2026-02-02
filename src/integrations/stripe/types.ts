/**
 * Stripe Integration Types
 * Payment processing and customer management
 */

// Configuration
export interface StripeConfig {
  secretKey: string;
  apiVersion?: string;
}

// Currency (ISO 4217)
export type Currency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud' | 'jpy' | string;

// Payment Intent
export interface CreatePaymentIntentRequest {
  amount: number; // Amount in smallest currency unit (cents for USD)
  currency: Currency;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: PaymentMethodType[];
  receiptEmail?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'off_session' | 'on_session';
}

export interface PaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amountCapturable: number;
  amountReceived: number;
  canceledAt: number | null;
  cancellationReason: PaymentIntentCancellationReason | null;
  captureMethod: 'automatic' | 'manual';
  clientSecret: string;
  confirmationMethod: 'automatic' | 'manual';
  created: number;
  currency: Currency;
  customerId: string | null;
  description: string | null;
  lastPaymentError: StripeError | null;
  livemode: boolean;
  metadata: Record<string, string>;
  paymentMethodId: string | null;
  paymentMethodTypes: PaymentMethodType[];
  receiptEmail: string | null;
  status: PaymentIntentStatus;
  statementDescriptor: string | null;
  statementDescriptorSuffix: string | null;
}

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export type PaymentIntentCancellationReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'abandoned'
  | 'failed_invoice'
  | 'void_invoice'
  | 'automatic';

export type PaymentMethodType =
  | 'card'
  | 'card_present'
  | 'us_bank_account'
  | 'sepa_debit'
  | 'bacs_debit'
  | 'ideal'
  | 'bancontact'
  | 'giropay'
  | 'sofort'
  | 'eps'
  | 'p24'
  | 'alipay'
  | 'wechat_pay'
  | 'link';

// Confirm Payment
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
  receiptEmail?: string;
  setupFutureUsage?: 'off_session' | 'on_session';
}

// Customer
export interface CreateCustomerRequest {
  email?: string;
  name?: string;
  description?: string;
  phone?: string;
  address?: Address;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  invoicePrefix?: string;
  invoiceSettings?: CustomerInvoiceSettings;
}

export interface Customer {
  id: string;
  object: 'customer';
  address: Address | null;
  balance: number;
  created: number;
  currency: Currency | null;
  defaultSourceId: string | null;
  delinquent: boolean;
  description: string | null;
  discount: Discount | null;
  email: string | null;
  invoicePrefix: string | null;
  invoiceSettings: CustomerInvoiceSettings;
  livemode: boolean;
  metadata: Record<string, string>;
  name: string | null;
  phone: string | null;
  shipping: ShippingDetails | null;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerInvoiceSettings {
  customFields: Array<{ name: string; value: string }> | null;
  defaultPaymentMethodId: string | null;
  footer: string | null;
}

export interface ShippingDetails {
  address: Address;
  name: string;
  phone: string | null;
}

export interface Discount {
  couponId: string;
  customerId: string;
  end: number | null;
  start: number;
  subscriptionId: string | null;
}

// List Payments
export interface ListPaymentsRequest {
  customerId?: string;
  created?: DateFilter;
  endingBefore?: string;
  startingAfter?: string;
  limit?: number;
}

export interface DateFilter {
  gt?: number;  // Greater than (Unix timestamp)
  gte?: number; // Greater than or equal
  lt?: number;  // Less than
  lte?: number; // Less than or equal
}

export interface ListPaymentsResponse {
  data: PaymentIntent[];
  hasMore: boolean;
  url: string;
}

// Errors
export interface StripeError {
  type: StripeErrorType;
  code?: string;
  declineCode?: string;
  message: string;
  param?: string;
  paymentIntentId?: string;
  paymentMethodId?: string;
  docUrl?: string;
}

export type StripeErrorType =
  | 'api_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'authentication_error'
  | 'rate_limit_error';

// Webhook Events (for reference)
export type StripeWebhookEvent =
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed';
