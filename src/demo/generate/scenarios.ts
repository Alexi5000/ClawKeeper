// file: src/demo/generate/scenarios.ts
// description: Generate agent test scenarios for all 110 agents
// reference: generate/index.ts

export interface AgentScenario {
  agent_id: string;
  agent_name: string;
  domain: string;
  scenario_name: string;
  description: string;
  input_data: Record<string, any>;
  expected_outcome: string;
  success_criteria: string[];
}

export function generate_agent_scenarios(): AgentScenario[] {
  const scenarios: AgentScenario[] = [];
  
  // CFO Scenarios
  scenarios.push(
    {
      agent_id: 'strategic_planner',
      agent_name: 'Strategic Planner',
      domain: 'CFO',
      scenario_name: 'Quarterly Strategic Review',
      description: 'Analyze Q4 2024 performance and create Q1 2025 strategic plan',
      input_data: { quarter: 'Q4 2024', revenue_target: 250000 },
      expected_outcome: 'Strategic plan with growth recommendations',
      success_criteria: ['Revenue trend identified', 'Action items generated', 'Resource allocation suggested']
    },
    {
      agent_id: 'cash_flow_analyst',
      agent_name: 'Cash Flow Analyst',
      domain: 'CFO',
      scenario_name: '30-Day Cash Flow Forecast',
      description: 'Forecast cash position for next 30 days based on AR/AP aging',
      input_data: { ar_total: 150000, ap_total: 80000, current_cash: 125000 },
      expected_outcome: 'Daily cash flow projection with shortfall warnings',
      success_criteria: ['30-day projection generated', 'Shortfall dates identified', 'Payment prioritization suggested']
    },
    {
      agent_id: 'budget_manager',
      agent_name: 'Budget Manager',
      domain: 'CFO',
      scenario_name: 'Annual Budget Creation',
      description: 'Create FY 2025 annual budget based on historical actuals',
      input_data: { fiscal_year: 2025, departments: 4 },
      expected_outcome: 'Complete annual budget with departmental allocations',
      success_criteria: ['All GL accounts budgeted', 'Department totals balanced', 'Growth targets incorporated']
    },
    {
      agent_id: 'variance_analyst',
      agent_name: 'Variance Analyst',
      domain: 'CFO',
      scenario_name: 'Monthly Variance Analysis',
      description: 'Analyze January 2025 budget vs actual variance',
      input_data: { month: '2025-01', budget: 200000, actual: 215000 },
      expected_outcome: 'Variance report with explanations',
      success_criteria: ['Variance percentages calculated', 'Significant variances flagged', 'Explanations generated']
    }
  );
  
  // AP Scenarios
  scenarios.push(
    {
      agent_id: 'invoice_parser',
      agent_name: 'Invoice Parser',
      domain: 'Accounts Payable',
      scenario_name: 'PDF Invoice Extraction',
      description: 'Extract data from AWS invoice PDF using OCR',
      input_data: { invoice_pdf: 'aws_invoice_001.pdf' },
      expected_outcome: 'Structured invoice data with confidence scores',
      success_criteria: ['Vendor identified', 'Amount extracted', 'Line items parsed', 'Confidence >90%']
    },
    {
      agent_id: 'duplicate_detector',
      agent_name: 'Duplicate Detector',
      domain: 'Accounts Payable',
      scenario_name: 'Duplicate Invoice Detection',
      description: 'Detect duplicate invoice submission for same vendor/amount/date',
      input_data: { invoice_number: 'INV-12345', vendor: 'AWS', amount: 1500 },
      expected_outcome: 'Duplicate flagged with match details',
      success_criteria: ['Duplicate identified', 'Match confidence >95%', 'Original invoice referenced']
    },
    {
      agent_id: 'payment_scheduler',
      agent_name: 'Payment Scheduler',
      domain: 'Accounts Payable',
      scenario_name: 'Optimal Payment Scheduling',
      description: 'Schedule 50 vendor payments optimizing for cash flow and early discounts',
      input_data: { invoices_count: 50, available_cash: 100000 },
      expected_outcome: 'Optimized payment schedule',
      success_criteria: ['Early discounts captured', 'Cash flow maintained', 'Late fees avoided']
    }
  );
  
  // AR Scenarios
  scenarios.push(
    {
      agent_id: 'collections_agent',
      agent_name: 'Collections Agent',
      domain: 'Accounts Receivable',
      scenario_name: 'Overdue Invoice Follow-up',
      description: 'Generate collection communications for invoices 30+ days overdue',
      input_data: { overdue_invoices: 15, total_overdue: 45000 },
      expected_outcome: 'Prioritized collection plan with email templates',
      success_criteria: ['Invoices prioritized by age', 'Email templates generated', 'Follow-up schedule created']
    },
    {
      agent_id: 'payment_matcher',
      agent_name: 'Payment Matcher',
      domain: 'Accounts Receivable',
      scenario_name: 'Partial Payment Matching',
      description: 'Match partial payment to correct invoice(s)',
      input_data: { payment_amount: 7500, open_invoices: [5000, 3000, 2500] },
      expected_outcome: 'Payment allocated to invoices',
      success_criteria: ['Invoices matched', 'Allocation logic explained', 'Remaining balance tracked']
    }
  );
  
  // Reconciliation Scenarios
  scenarios.push(
    {
      agent_id: 'transaction_matcher',
      agent_name: 'Transaction Matcher',
      domain: 'Reconciliation',
      scenario_name: 'Bank Statement Reconciliation',
      description: 'Match 500 bank transactions to book transactions',
      input_data: { bank_transactions: 500, book_transactions: 485 },
      expected_outcome: 'Matched transactions with discrepancy report',
      success_criteria: ['Match rate >95%', 'Discrepancies identified', 'Suggested adjustments provided']
    },
    {
      agent_id: 'discrepancy_investigator',
      agent_name: 'Discrepancy Investigator',
      domain: 'Reconciliation',
      scenario_name: 'Unmatched Item Investigation',
      description: 'Investigate 15 unmatched transactions from reconciliation',
      input_data: { unmatched_count: 15, total_amount_diff: 250 },
      expected_outcome: 'Investigation report with resolution recommendations',
      success_criteria: ['Root causes identified', 'Corrections suggested', 'Manual review items flagged']
    }
  );
  
  // Compliance Scenarios
  scenarios.push(
    {
      agent_id: 'tax_compliance_checker',
      agent_name: 'Tax Compliance Checker',
      domain: 'Compliance',
      scenario_name: 'Quarterly Tax Compliance Verification',
      description: 'Verify Q4 2024 tax compliance before filing',
      input_data: { quarter: 'Q4 2024', payroll_count: 28 },
      expected_outcome: 'Compliance report with issues flagged',
      success_criteria: ['All tax calculations verified', 'Missing data identified', 'Filing readiness confirmed']
    },
    {
      agent_id: 'fraud_detector',
      agent_name: 'Fraud Detector',
      domain: 'Compliance',
      scenario_name: 'Suspicious Transaction Detection',
      description: 'Scan 10,000 transactions for fraud indicators',
      input_data: { transaction_count: 10000, time_period: '2024' },
      expected_outcome: 'Flagged suspicious transactions',
      success_criteria: ['Anomalies detected', 'Confidence scores provided', 'Investigation priority assigned']
    },
    {
      agent_id: 'policy_enforcer',
      agent_name: 'Policy Enforcer',
      domain: 'Compliance',
      scenario_name: 'Expense Policy Violations',
      description: 'Identify expense policy violations from 25 flagged transactions',
      input_data: { flagged_transactions: 25 },
      expected_outcome: 'Policy violation report',
      success_criteria: ['Violations categorized by severity', 'Policy references provided', 'Remediation steps suggested']
    }
  );
  
  // Reporting Scenarios
  scenarios.push(
    {
      agent_id: 'pl_generator',
      agent_name: 'P&L Generator',
      domain: 'Reporting',
      scenario_name: 'Monthly P&L Generation',
      description: 'Generate January 2025 profit & loss statement',
      input_data: { period: '2025-01', comparison_period: '2024-01' },
      expected_outcome: 'P&L report with YoY comparison',
      success_criteria: ['All revenue/expense accounts included', 'Subtotals calculated', 'YoY variance shown']
    },
    {
      agent_id: 'comparative_analyzer',
      agent_name: 'Comparative Analyzer',
      domain: 'Reporting',
      scenario_name: 'Year-over-Year Analysis',
      description: 'Compare 2024 vs 2023 financial performance',
      input_data: { year1: 2024, year2: 2023 },
      expected_outcome: 'Comparative analysis with insights',
      success_criteria: ['Revenue growth calculated', 'Margin trends identified', 'Key drivers explained']
    }
  );
  
  // Integration Scenarios
  scenarios.push(
    {
      agent_id: 'plaid_connector',
      agent_name: 'Plaid Connector',
      domain: 'Integration',
      scenario_name: 'Bank Account Connection',
      description: 'Connect 3 bank accounts via Plaid and sync 5000 transactions',
      input_data: { accounts: 3, transactions: 5000 },
      expected_outcome: 'Accounts connected and transactions imported',
      success_criteria: ['All accounts connected', 'Transactions imported', 'Categorization applied']
    },
    {
      agent_id: 'webhook_processor',
      agent_name: 'Webhook Processor',
      domain: 'Integration',
      scenario_name: 'Stripe Webhook Processing',
      description: 'Process incoming Stripe invoice.paid webhook',
      input_data: { webhook_type: 'invoice.paid', invoice_id: 'in_12345' },
      expected_outcome: 'Invoice marked as paid in ClawKeeper',
      success_criteria: ['Webhook validated', 'Invoice updated', 'Reconciliation triggered']
    }
  );
  
  // Data/ETL Scenarios
  scenarios.push(
    {
      agent_id: 'csv_importer',
      agent_name: 'CSV Importer',
      domain: 'Data/ETL',
      scenario_name: 'Transaction CSV Import',
      description: 'Import 1000 transactions from bank CSV export',
      input_data: { file: 'bank_export.csv', rows: 1000 },
      expected_outcome: 'Transactions imported and validated',
      success_criteria: ['All rows processed', 'Data validation passed', 'Duplicates detected']
    },
    {
      agent_id: 'deduplicator',
      agent_name: 'Deduplicator',
      domain: 'Data/ETL',
      scenario_name: 'Duplicate Transaction Removal',
      description: 'Identify and remove duplicate transactions from import',
      input_data: { total_transactions: 1000, potential_duplicates: 50 },
      expected_outcome: 'Deduplicated transaction set',
      success_criteria: ['Duplicates identified', 'Confidence scores provided', 'User confirmation requested']
    }
  );
  
  // Support Scenarios
  scenarios.push(
    {
      agent_id: 'help_desk_agent',
      agent_name: 'Help Desk Agent',
      domain: 'Support',
      scenario_name: 'User Question Resolution',
      description: 'Answer user question about invoice approval workflow',
      input_data: { question: 'How do I approve invoices over $5000?' },
      expected_outcome: 'Step-by-step instructions provided',
      success_criteria: ['Question understood', 'Accurate instructions provided', 'Related docs linked']
    },
    {
      agent_id: 'error_diagnostician',
      agent_name: 'Error Diagnostician',
      domain: 'Support',
      scenario_name: 'Failed Reconciliation Diagnosis',
      description: 'Diagnose why bank reconciliation failed',
      input_data: { error: 'Transaction matching timeout', task_id: 'rec_12345' },
      expected_outcome: 'Root cause analysis with fix recommendation',
      success_criteria: ['Error reproduced', 'Root cause identified', 'Fix steps provided']
    }
  );
  
  return scenarios;
}
