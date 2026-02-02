// file: src/guardrails/validators.ts
// description: Input/output validation and sanitization for ClawKeeper
// reference: src/core/types.ts, ORCA SDK validators pattern

import { z } from 'zod';
import type { Invoice, Transaction, Account } from '../core/types';

// ============================================================================
// PII Detection
// ============================================================================

const PII_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};

export function detect_pii(text: string): { has_pii: boolean; types: string[] } {
  const found_types: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      found_types.push(type);
    }
  }

  return {
    has_pii: found_types.length > 0,
    types: found_types,
  };
}

export function redact_pii(text: string): string {
  let redacted = text;

  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.credit_card, '[CARD REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE REDACTED]');
  // Keep emails for vendor communication
  // redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL REDACTED]');

  return redacted;
}

// ============================================================================
// Prompt Injection Detection
// ============================================================================

const INJECTION_PATTERNS = [
  /ignore (previous|all) instructions/i,
  /disregard (previous|all) instructions/i,
  /forget (previous|all) instructions/i,
  /you are now/i,
  /pretend (to be|you are)/i,
  /system (prompt|message):/i,
];

export function detect_injection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

// ============================================================================
// Input Validation
// ============================================================================

export const InvoiceInputSchema = z.object({
  vendor_name: z.string().min(1).max(255),
  vendor_email: z.string().email().optional(),
  invoice_number: z.string().min(1).max(100),
  invoice_date: z.string().datetime(),
  due_date: z.string().datetime(),
  amount: z.number().positive(), // Will convert to BigInt
  currency: z.string().length(3).default('USD'),
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    amount: z.number().positive(),
    category: z.string().optional(),
  })).optional(),
  notes: z.string().max(1000).optional(),
});

export function validate_invoice_input(data: unknown): z.infer<typeof InvoiceInputSchema> {
  return InvoiceInputSchema.parse(data);
}

export const TransactionInputSchema = z.object({
  account_id: z.string().uuid(),
  date: z.string().datetime(),
  amount: z.number(), // Can be negative
  category: z.enum(['income', 'expense', 'transfer', 'adjustment']),
  subcategory: z.string().max(100).optional(),
  description: z.string().min(1).max(500),
  payee: z.string().max(255).optional(),
});

export function validate_transaction_input(data: unknown): z.infer<typeof TransactionInputSchema> {
  return TransactionInputSchema.parse(data);
}

// ============================================================================
// Output Sanitization
// ============================================================================

export function sanitize_output(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Remove internal fields
    if (key.startsWith('_') || key === 'password_hash') {
      continue;
    }

    // Sanitize strings
    if (typeof value === 'string') {
      sanitized[key] = redact_pii(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null ? sanitize_output(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize_output(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// Amount Validation
// ============================================================================

export function validate_amount(amount: number, max_amount: number = 100000000): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a finite number');
  }

  if (amount < 0 && amount < -max_amount) {
    throw new Error(`Amount cannot be less than -${max_amount}`);
  }

  if (amount > max_amount) {
    throw new Error(`Amount cannot exceed ${max_amount}`);
  }
}

export function validate_date_range(start: string, end: string): void {
  const start_date = new Date(start);
  const end_date = new Date(end);

  if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
    throw new Error('Invalid date format');
  }

  if (start_date > end_date) {
    throw new Error('Start date must be before end date');
  }

  // Max 1 year range
  const one_year_ms = 365 * 24 * 60 * 60 * 1000;
  if (end_date.getTime() - start_date.getTime() > one_year_ms) {
    throw new Error('Date range cannot exceed 1 year');
  }
}
