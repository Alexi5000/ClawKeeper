// file: src/core/types.ts
// description: Core type definitions for ClawKeeper Ledger domain
// reference: Extends Constellation types for financial workflows

import { z } from 'zod';

// ============================================================================
// Tenant & User Types
// ============================================================================

export const TenantId = z.string().uuid();
export type TenantId = z.infer<typeof TenantId>;

export const UserId = z.string().uuid();
export type UserId = z.infer<typeof UserId>;

export const UserRole = z.enum(['super_admin', 'tenant_admin', 'accountant', 'viewer']);
export type UserRole = z.infer<typeof UserRole>;

export const Tenant = z.object({
  id: TenantId,
  name: z.string(),
  settings: z.record(z.unknown()),
  status: z.enum(['active', 'suspended', 'deleted']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Tenant = z.infer<typeof Tenant>;

export const User = z.object({
  id: UserId,
  tenant_id: TenantId,
  email: z.string().email(),
  role: UserRole,
  name: z.string(),
  created_at: z.string().datetime(),
  last_login: z.string().datetime().nullable(),
});
export type User = z.infer<typeof User>;

// ============================================================================
// Financial Entity Types
// ============================================================================

export const InvoiceId = z.string().uuid();
export type InvoiceId = z.infer<typeof InvoiceId>;

export const TransactionId = z.string().uuid();
export type TransactionId = z.infer<typeof TransactionId>;

export const AccountId = z.string().uuid();
export type AccountId = z.infer<typeof AccountId>;

export const InvoiceStatus = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'paid',
  'overdue',
  'cancelled',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const InvoiceLineItem = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().positive(),
  unit_price: z.bigint(), // Amount in cents
  amount: z.bigint(), // Total in cents
  category: z.string(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItem>;

export const Invoice = z.object({
  id: InvoiceId,
  tenant_id: TenantId,
  vendor_name: z.string(),
  vendor_email: z.string().email().nullable(),
  invoice_number: z.string(),
  invoice_date: z.string().datetime(),
  due_date: z.string().datetime(),
  amount: z.bigint(), // Amount in cents
  currency: z.string().default('USD'),
  status: InvoiceStatus,
  line_items: z.array(InvoiceLineItem),
  notes: z.string().nullable(),
  attachment_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  approved_by: UserId.nullable(),
  approved_at: z.string().datetime().nullable(),
  paid_at: z.string().datetime().nullable(),
});
export type Invoice = z.infer<typeof Invoice>;

export const AccountType = z.enum([
  'checking',
  'savings',
  'credit_card',
  'loan',
  'investment',
  'other',
]);
export type AccountType = z.infer<typeof AccountType>;

export const Account = z.object({
  id: AccountId,
  tenant_id: TenantId,
  name: z.string(),
  type: AccountType,
  institution: z.string(),
  account_number_last4: z.string().length(4),
  balance: z.bigint(), // Balance in cents
  currency: z.string().default('USD'),
  plaid_account_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Account = z.infer<typeof Account>;

export const TransactionCategory = z.enum([
  'income',
  'expense',
  'transfer',
  'adjustment',
]);
export type TransactionCategory = z.infer<typeof TransactionCategory>;

export const Transaction = z.object({
  id: TransactionId,
  tenant_id: TenantId,
  account_id: AccountId,
  date: z.string().datetime(),
  amount: z.bigint(), // Amount in cents (negative for expenses)
  category: TransactionCategory,
  subcategory: z.string().nullable(),
  description: z.string(),
  payee: z.string().nullable(),
  reconciled: z.boolean().default(false),
  plaid_transaction_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Transaction = z.infer<typeof Transaction>;

// ============================================================================
// Reconciliation Types
// ============================================================================

export const ReconciliationTaskId = z.string().uuid();
export type ReconciliationTaskId = z.infer<typeof ReconciliationTaskId>;

export const ReconciliationStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
]);
export type ReconciliationStatus = z.infer<typeof ReconciliationStatus>;

export const ReconciliationDiscrepancy = z.object({
  id: z.string().uuid(),
  transaction_id: TransactionId.nullable(),
  bank_transaction_id: z.string().nullable(),
  amount_diff: z.bigint(),
  description: z.string(),
  resolved: z.boolean().default(false),
  resolution_notes: z.string().nullable(),
});
export type ReconciliationDiscrepancy = z.infer<typeof ReconciliationDiscrepancy>;

export const ReconciliationTask = z.object({
  id: ReconciliationTaskId,
  tenant_id: TenantId,
  account_id: AccountId,
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  status: ReconciliationStatus,
  matched_count: z.number().default(0),
  unmatched_count: z.number().default(0),
  discrepancies: z.array(ReconciliationDiscrepancy),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});
export type ReconciliationTask = z.infer<typeof ReconciliationTask>;

// ============================================================================
// Reporting Types
// ============================================================================

export const ReportType = z.enum([
  'profit_loss',
  'balance_sheet',
  'cash_flow',
  'accounts_payable_aging',
  'accounts_receivable_aging',
  'custom',
]);
export type ReportType = z.infer<typeof ReportType>;

export const ReportPeriod = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
});
export type ReportPeriod = z.infer<typeof ReportPeriod>;

export const FinancialReport = z.object({
  id: z.string().uuid(),
  tenant_id: TenantId,
  type: ReportType,
  period: ReportPeriod,
  data: z.record(z.unknown()),
  generated_at: z.string().datetime(),
  generated_by: UserId.nullable(),
});
export type FinancialReport = z.infer<typeof FinancialReport>;

// ============================================================================
// Compliance & Audit Types
// ============================================================================

export const ComplianceCheckType = z.enum([
  'tax_compliance',
  'audit_readiness',
  'policy_violation',
  'unusual_activity',
]);
export type ComplianceCheckType = z.infer<typeof ComplianceCheckType>;

export const ComplianceCheck = z.object({
  id: z.string().uuid(),
  tenant_id: TenantId,
  type: ComplianceCheckType,
  status: z.enum(['pass', 'fail', 'warning']),
  details: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  checked_at: z.string().datetime(),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheck>;

export const AuditAction = z.enum([
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'export',
  'import',
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const AuditEntry = z.object({
  id: z.string().uuid(),
  tenant_id: TenantId,
  user_id: UserId,
  action: AuditAction,
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  changes: z.record(z.unknown()).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  timestamp: z.string().datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

// ============================================================================
// Agent Types (extends Constellation)
// ============================================================================

export const LedgerAgentId = z.enum([
  // CEO
  'clawkeeper',
  // Orchestrators
  'cfo',
  'accounts_payable_lead',
  'accounts_receivable_lead',
  'reconciliation_lead',
  'compliance_lead',
  'reporting_lead',
  'integration_lead',
  'data_etl_lead',
  'support_lead',
  // Workers will be added dynamically
]);
export type LedgerAgentId = z.infer<typeof LedgerAgentId>;

export const LedgerCapability = z.enum([
  // Invoice capabilities
  'invoice_parsing',
  'invoice_validation',
  'invoice_categorization',
  'invoice_approval',
  'payment_processing',
  // Reconciliation capabilities
  'transaction_matching',
  'discrepancy_detection',
  'discrepancy_resolution',
  // Reporting capabilities
  'report_generation',
  'report_analysis',
  'forecasting',
  // Compliance capabilities
  'tax_compliance_check',
  'audit_preparation',
  'policy_enforcement',
  // Integration capabilities
  'bank_sync',
  'accounting_sync',
  'payment_gateway_integration',
  // Data capabilities
  'data_import',
  'data_transformation',
  'data_validation',
  // Support capabilities
  'user_assistance',
  'error_recovery',
  'escalation_handling',
  // General capabilities
  'document_parsing',
  'ocr_processing',
  'email_processing',
]);
export type LedgerCapability = z.infer<typeof LedgerCapability>;

export const AgentStatus = z.enum(['idle', 'busy', 'offline', 'error']);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const AgentProfile = z.object({
  id: LedgerAgentId,
  name: z.string(),
  description: z.string(),
  capabilities: z.array(LedgerCapability),
  status: AgentStatus,
  current_task: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
});
export type AgentProfile = z.infer<typeof AgentProfile>;

// ============================================================================
// Task Types (extends Constellation)
// ============================================================================

export const TaskStatus = z.enum([
  'pending',
  'ready',
  'assigned',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(['low', 'normal', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const LedgerTaskStar = z.object({
  id: z.string().uuid(),
  tenant_id: TenantId,
  name: z.string(),
  description: z.string(),
  required_capabilities: z.array(LedgerCapability),
  assigned_agent: LedgerAgentId.nullable(),
  status: TaskStatus,
  priority: TaskPriority,
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable(),
  parameters: z.record(z.unknown()).optional(),
  dependencies: z.array(z.string().uuid()),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  error: z.string().nullable(),
  retry_count: z.number().default(0),
  max_retries: z.number().default(3),
});
export type LedgerTaskStar = z.infer<typeof LedgerTaskStar>;

// ============================================================================
// Agent Run Types (for tracking)
// ============================================================================

export const AgentRun = z.object({
  id: z.string().uuid(),
  tenant_id: TenantId,
  agent_id: LedgerAgentId,
  task_id: z.string().uuid(),
  status: TaskStatus,
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  duration_ms: z.number().nullable(),
  tokens_used: z.number().default(0),
  cost: z.number().default(0), // Cost in dollars
  error: z.string().nullable(),
});
export type AgentRun = z.infer<typeof AgentRun>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert dollars to cents for storage
 */
export function dollars_to_cents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

/**
 * Convert cents to dollars for display
 */
export function cents_to_dollars(cents: bigint): number {
  return Number(cents) / 100;
}

/**
 * Format currency for display
 */
export function format_currency(cents: bigint, currency: string = 'USD'): string {
  const dollars = cents_to_dollars(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}
