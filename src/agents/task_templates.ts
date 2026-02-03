// file: src/agents/task_templates.ts
// description: Predefined task templates for agent demos
// reference: src/api/routes/agents.ts

export interface TaskTemplate {
  name: string;
  description: string;
  parameters: Record<string, any>;
  capabilities: string[];
}

export const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  clawkeeper: [
    {
      name: 'Process Invoice',
      description: 'Parse and validate an uploaded invoice',
      parameters: {
        vendor_name: 'Office Depot',
        amount: 250.00,
        invoice_number: 'INV-001',
        due_date: '2026-03-15',
      },
      capabilities: ['invoice_parsing', 'invoice_validation'],
    },
    {
      name: 'Generate Financial Report',
      description: 'Create monthly P&L report',
      parameters: {
        report_type: 'profit_loss',
        period: 'monthly',
        month: new Date().toISOString().slice(0, 7),
      },
      capabilities: ['financial_reporting'],
    },
    {
      name: 'Reconcile Bank Account',
      description: 'Match bank transactions with ledger entries',
      parameters: {
        account_name: 'Business Checking',
        date_range: 'last_30_days',
      },
      capabilities: ['bank_reconciliation'],
    },
  ],
  cfo: [
    {
      name: 'Cash Flow Forecast',
      description: 'Generate 30-day cash flow projection',
      parameters: {
        days: 30,
        include_pending: true,
        confidence_interval: 0.95,
      },
      capabilities: ['cash_flow_forecasting'],
    },
    {
      name: 'Budget Variance Analysis',
      description: 'Compare actual vs budgeted expenses',
      parameters: {
        period: 'Q1 2026',
        departments: ['Operations', 'Marketing', 'R&D'],
      },
      capabilities: ['budget_analysis'],
    },
    {
      name: 'Strategic Financial Planning',
      description: 'Generate long-term financial strategy',
      parameters: {
        time_horizon: '12_months',
        growth_target: 0.25,
      },
      capabilities: ['strategic_planning'],
    },
  ],
  accounts_payable_lead: [
    {
      name: 'Approve Invoice',
      description: 'Review and approve pending invoice',
      parameters: {
        invoice_id: 'auto_generated',
        action: 'approve',
        approver_notes: 'Verified with PO-12345',
      },
      capabilities: ['invoice_approval'],
    },
    {
      name: 'Vendor Payment Run',
      description: 'Process batch payments to vendors',
      parameters: {
        payment_date: new Date().toISOString().split('T')[0],
        max_amount: 50000,
        payment_method: 'ACH',
      },
      capabilities: ['vendor_payments'],
    },
    {
      name: 'Payment Terms Negotiation',
      description: 'Analyze and suggest vendor payment terms',
      parameters: {
        vendor_name: 'Office Supplies Inc',
        current_terms: 'Net 30',
        proposed_terms: 'Net 60',
      },
      capabilities: ['vendor_management'],
    },
  ],
  accounts_receivable_lead: [
    {
      name: 'Generate Customer Invoice',
      description: 'Create and send invoice to customer',
      parameters: {
        customer_name: 'Acme Corp',
        amount: 5000,
        items: [
          { description: 'Consulting Services', quantity: 40, rate: 125 }
        ],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      },
      capabilities: ['invoice_generation'],
    },
    {
      name: 'Collections Follow-up',
      description: 'Review overdue accounts and initiate collection',
      parameters: {
        aging_bucket: 'over_60_days',
        max_attempts: 3,
      },
      capabilities: ['collections_management'],
    },
    {
      name: 'Credit Risk Assessment',
      description: 'Evaluate customer creditworthiness',
      parameters: {
        customer_id: 'auto_generated',
        credit_limit_requested: 25000,
      },
      capabilities: ['credit_analysis'],
    },
  ],
  reconciliation_lead: [
    {
      name: 'Bank Reconciliation',
      description: 'Match bank statement with ledger',
      parameters: {
        account: 'Business Checking - ****4567',
        statement_period: 'January 2026',
        expected_balance: 45230.50,
      },
      capabilities: ['bank_reconciliation'],
    },
    {
      name: 'Discrepancy Investigation',
      description: 'Investigate and resolve reconciliation discrepancy',
      parameters: {
        discrepancy_amount: 125.00,
        transaction_date: '2026-01-15',
        account_type: 'checking',
      },
      capabilities: ['discrepancy_resolution'],
    },
  ],
  compliance_lead: [
    {
      name: 'Tax Compliance Check',
      description: 'Verify tax compliance for filing',
      parameters: {
        tax_type: '1099',
        filing_year: 2025,
        jurisdiction: 'Federal',
      },
      capabilities: ['tax_compliance'],
    },
    {
      name: 'Audit Preparation',
      description: 'Prepare documentation for external audit',
      parameters: {
        audit_type: 'financial',
        audit_period: 'FY 2025',
        auditor: 'KPMG',
      },
      capabilities: ['audit_preparation'],
    },
    {
      name: 'Policy Violation Check',
      description: 'Review transactions for policy violations',
      parameters: {
        policy_type: 'expense_policy',
        review_period: 'last_quarter',
      },
      capabilities: ['policy_enforcement'],
    },
  ],
  reporting_lead: [
    {
      name: 'Generate P&L Report',
      description: 'Create Profit & Loss statement',
      parameters: {
        period: 'Q4 2025',
        format: 'PDF',
        comparative: true,
      },
      capabilities: ['financial_reporting'],
    },
    {
      name: 'Cash Flow Statement',
      description: 'Generate statement of cash flows',
      parameters: {
        period: 'FY 2025',
        method: 'indirect',
      },
      capabilities: ['financial_reporting'],
    },
    {
      name: 'Custom Dashboard Report',
      description: 'Build custom KPI dashboard',
      parameters: {
        kpis: ['revenue_growth', 'gross_margin', 'burn_rate'],
        update_frequency: 'daily',
      },
      capabilities: ['dashboard_creation'],
    },
  ],
  integration_lead: [
    {
      name: 'Sync Plaid Transactions',
      description: 'Pull latest transactions from Plaid',
      parameters: {
        account_ids: ['checking_001', 'savings_001'],
        days_back: 7,
      },
      capabilities: ['plaid_integration'],
    },
    {
      name: 'QuickBooks Sync',
      description: 'Synchronize data with QuickBooks',
      parameters: {
        sync_direction: 'bidirectional',
        entity_types: ['invoices', 'bills', 'payments'],
      },
      capabilities: ['quickbooks_integration'],
    },
    {
      name: 'Stripe Payment Processing',
      description: 'Process payment through Stripe',
      parameters: {
        amount: 1500,
        currency: 'USD',
        customer_id: 'cus_1234567890',
      },
      capabilities: ['stripe_integration'],
    },
  ],
  data_etl_lead: [
    {
      name: 'Import CSV Data',
      description: 'Import and validate CSV financial data',
      parameters: {
        file_type: 'bank_statement',
        columns: ['date', 'description', 'amount', 'balance'],
        delimiter: ',',
      },
      capabilities: ['data_import'],
    },
    {
      name: 'Data Transformation',
      description: 'Transform legacy data format to new schema',
      parameters: {
        source_format: 'legacy_erp',
        target_format: 'clawkeeper',
        record_count: 5000,
      },
      capabilities: ['data_transformation'],
    },
    {
      name: 'Data Quality Check',
      description: 'Validate data integrity and consistency',
      parameters: {
        dataset: 'transactions_2025',
        checks: ['duplicates', 'null_values', 'outliers'],
      },
      capabilities: ['data_validation'],
    },
  ],
  support_lead: [
    {
      name: 'Troubleshoot User Issue',
      description: 'Diagnose and resolve user-reported problem',
      parameters: {
        issue_type: 'invoice_upload_failed',
        user_email: 'user@company.com',
        error_message: 'File format not supported',
      },
      capabilities: ['user_support'],
    },
    {
      name: 'System Health Check',
      description: 'Perform system diagnostics',
      parameters: {
        components: ['api', 'database', 'integrations'],
        alert_threshold: 'warning',
      },
      capabilities: ['system_monitoring'],
    },
  ],
};

export function get_agent_templates(agent_id: string): TaskTemplate[] {
  return TASK_TEMPLATES[agent_id] || [];
}

export function get_all_templates(): Record<string, TaskTemplate[]> {
  return TASK_TEMPLATES;
}
