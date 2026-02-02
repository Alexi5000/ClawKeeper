---
name: payment-gateway
description: "Process payments via Stripe, PayPal, or ACH. Use when paying invoices, processing customer payments, or managing payment methods. Handles payment scheduling, execution, and confirmation with full audit trail."
---

# Payment Gateway Skill

## Purpose

Processes payments securely through integrated payment gateways (Stripe, PayPal, ACH), with proper authorization, audit logging, and error handling.

## Triggers

- Invoice approved and ready for payment
- Customer payment submitted
- Scheduled payment due date reached
- Manual payment initiated

## Capabilities

1. **Payment Processing** - Execute payments via Stripe/PayPal/ACH
2. **Payment Scheduling** - Schedule future payments
3. **Payment Confirmation** - Verify payment succeeded
4. **Refund Processing** - Handle refunds and reversals
5. **Payment Method Management** - Store and manage payment methods
6. **Webhook Handling** - Process payment status webhooks

## Instructions

### Step 1: Validate Payment Request

Required fields:
- **tenant_id** - For multi-tenant isolation
- **invoice_id** or **amount** - What to pay
- **payment_method** - stripe, paypal, ach
- **approved_by** - User ID who approved payment
- **scheduled_date** - When to execute (can be immediate)

Validations:
- Invoice status is 'approved'
- Amount matches invoice amount
- Payment method is configured for tenant
- User has permission to approve payments
- Sufficient funds (if applicable)

### Step 2: Execute Payment

#### Stripe Payment

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const payment_intent = await stripe.paymentIntents.create({
  amount: invoice.amount,  // cents
  currency: invoice.currency,
  description: `Invoice ${invoice.invoice_number} - ${invoice.vendor_name}`,
  metadata: {
    tenant_id: invoice.tenant_id,
    invoice_id: invoice.id,
  },
});

// Confirm payment
const confirmed = await stripe.paymentIntents.confirm(payment_intent.id, {
  payment_method: tenant_payment_method_id,
});
```

#### ACH Payment

```typescript
// Via Stripe or Plaid
const transfer = await stripe.transfers.create({
  amount: invoice.amount,
  currency: invoice.currency,
  destination: vendor_stripe_account_id,
});
```

#### PayPal Payment

```typescript
// Via PayPal SDK
const payment = await paypal.createPayment({
  amount: cents_to_dollars(invoice.amount),
  currency: invoice.currency,
  recipient: vendor_paypal_email,
});
```

### Step 3: Update Invoice Status

On success:
```sql
UPDATE invoices
SET status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND tenant_id = $2;
```

On failure:
- Log error to agent_runs table
- Create alert for manual review
- Do NOT mark as paid

### Step 4: Audit Log

```sql
INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, changes)
VALUES (
  $1,  -- tenant_id
  $2,  -- user_id (approved_by)
  'approve',  -- action
  'invoices',  -- entity_type
  $3,  -- invoice_id
  jsonb_build_object(
    'payment_method', 'stripe',
    'payment_intent_id', payment_intent.id,
    'amount', invoice.amount,
    'status', 'paid'
  )
);
```

### Step 5: Confirmation

Return payment confirmation:
```json
{
  "success": true,
  "invoice_id": "uuid",
  "payment_id": "pi_1234...",  // Stripe payment intent ID
  "amount": 50000,  // cents
  "currency": "USD",
  "status": "paid",
  "paid_at": "2026-01-15T14:30:00Z",
  "payment_method": "stripe",
  "confirmation_number": "..."
}
```

## Payment Scheduling

For future payments:
```sql
INSERT INTO scheduled_payments (
  tenant_id, invoice_id, amount, currency,
  payment_method, scheduled_date, status
)
VALUES ($1, $2, $3, $4, $5, $6, 'pending');
```

Cron job checks scheduled_payments daily and executes when `scheduled_date <= NOW()`.

## Webhook Handling

Process Stripe webhooks:
- `payment_intent.succeeded` - Mark invoice as paid
- `payment_intent.payment_failed` - Alert user, retry or manual review
- `charge.refunded` - Create refund transaction

## Error Handling

- **Insufficient Funds** - Alert user, reschedule payment
- **Payment Method Invalid** - Request updated payment method
- **API Error** - Retry with exponential backoff (3 attempts)
- **Network Timeout** - Check payment status before retry (idempotency)
- **Declined Payment** - Alert user, mark for manual review

## Integration Points

- **stripe-integrator** (Integration worker) - Stripe API
- **paypal-integrator** (Integration worker) - PayPal API
- **payment-processor** (AP worker) - Payment execution logic
- **audit-trail** - Immutable audit log

## Models

- **Payment Logic**: Deterministic (no LLM)
- **Error Analysis**: Claude Sonnet 4 (for complex error scenarios)

## Security

- **Idempotency** - Use idempotency keys for Stripe to prevent duplicate charges
- **PCI Compliance** - Never store full credit card numbers
- **Secrets Management** - API keys in environment variables, never in code
- **Rate Limiting** - Respect payment gateway rate limits
- **Audit Trail** - Log all payment attempts (success and failure)
- **User Authorization** - Verify user can approve payments (RBAC)
- **Amount Verification** - Confirm amount matches invoice before payment

---

Invoke this skill when executing vendor payments or processing customer payments through integrated gateways.
