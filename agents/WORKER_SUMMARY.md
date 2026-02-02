# ClawKeeper Worker Agents Summary

This document outlines all 100 worker agents in the ClawKeeper system. Each worker has a corresponding AGENT.md file in `agents/workers/<domain>/<worker-name>/AGENT.md`.

## CFO Workers (8) ✅ CREATED

1. strategic-planner - Long-term financial strategy
2. cash-flow-analyst - Cash flow forecasting
3. budget-manager - Budget creation and monitoring
4. financial-modeler - Financial modeling and scenarios
5. kpi-tracker - Key performance indicators
6. variance-analyst - Budget vs actual analysis
7. investment-advisor - Investment recommendations
8. risk-assessor - Financial risk assessment

## Accounts Payable Workers (15)

1. invoice-parser - OCR and field extraction
2. invoice-validator - Data validation, completeness
3. expense-categorizer - GL coding, expense classification
4. duplicate-detector - Find duplicate invoices
5. approval-router - Route for approval based on rules
6. payment-scheduler - Schedule payments by due date
7. payment-processor - Execute payments via gateways
8. vendor-manager - Maintain vendor records
9. three-way-matcher - Match PO → Invoice → Receipt
10. early-payment-advisor - Identify early payment discounts
11. aging-report-generator - Track AP aging buckets
12. accrual-calculator - Calculate accrued expenses
13. tax-classifier - Identify tax-deductible expenses
14. policy-enforcer - Enforce company payment policies
15. document-archiver - Store invoices and receipts

## Accounts Receivable Workers (15)

1. invoice-generator - Create customer invoices
2. invoice-sender - Send invoices via email/mail
3. payment-recorder - Record payments received
4. payment-matcher - Match payments to invoices
5. collections-agent - Follow up on overdue accounts
6. aging-analyst - Generate AR aging reports
7. credit-analyst - Monitor customer credit
8. dispute-handler - Manage invoice disputes
9. adjustment-processor - Process credits and adjustments
10. revenue-recognizer - Track revenue recognition
11. reminder-scheduler - Schedule payment reminders
12. statement-generator - Create customer statements
13. bad-debt-assessor - Identify uncollectable accounts
14. payment-plan-manager - Manage payment arrangements
15. customer-portal-manager - Maintain customer payment portal

## Reconciliation Workers (12)

1. transaction-importer - Import bank transactions via Plaid
2. transaction-matcher - Match book to bank transactions
3. discrepancy-detector - Identify mismatches and gaps
4. discrepancy-investigator - Research unmatched items
5. adjustment-creator - Create adjusting entries
6. outstanding-item-tracker - Track checks/deposits in transit
7. balance-verifier - Verify cleared balance accuracy
8. date-matcher - Match by date proximity
9. amount-matcher - Match by exact or fuzzy amounts
10. payee-matcher - Match by payee/vendor name
11. reconciliation-reporter - Generate reconciliation reports
12. exception-handler - Manage reconciliation exceptions

## Compliance Workers (10)

1. tax-compliance-checker - Verify tax compliance
2. audit-preparer - Prepare audit documentation
3. policy-enforcer - Enforce financial policies
4. internal-control-monitor - Monitor controls effectiveness
5. regulatory-reporter - Prepare regulatory filings
6. document-retention-manager - Manage record retention
7. fraud-detector - Identify suspicious transactions
8. segregation-checker - Verify role separations
9. approval-limit-enforcer - Enforce approval hierarchies
10. compliance-dashboarder - Generate compliance dashboards

## Reporting Workers (12)

1. pl-generator - Generate profit & loss statements
2. balance-sheet-generator - Generate balance sheets
3. cash-flow-generator - Generate cash flow statements
4. custom-report-builder - Build ad-hoc reports
5. dashboard-creator - Create management dashboards
6. comparative-analyzer - Period comparisons
7. ratio-calculator - Calculate financial ratios
8. report-formatter - Format and style reports
9. export-handler - Export to various formats
10. data-aggregator - Aggregate financial data
11. chart-generator - Create charts and visualizations
12. report-scheduler - Schedule recurring reports

## Integration Workers (12)

1. plaid-connector - Connect to banks via Plaid
2. stripe-integrator - Process payments via Stripe
3. paypal-integrator - Process payments via PayPal
4. quickbooks-syncer - Sync with QuickBooks
5. xero-syncer - Sync with Xero
6. api-credential-manager - Manage API keys and secrets
7. data-mapper - Map external to internal schemas
8. webhook-processor - Handle incoming webhooks
9. rate-limit-manager - Manage API rate limits
10. circuit-breaker-manager - Protect against API failures
11. integration-health-monitor - Monitor integration status
12. oauth-flow-handler - Manage OAuth authentication

## Data/ETL Workers (10)

1. csv-importer - Import data from CSV files
2. excel-importer - Import data from Excel files
3. json-importer - Import data from JSON files
4. data-validator - Validate data quality
5. data-transformer - Transform and normalize data
6. schema-mapper - Map source to target schemas
7. deduplicator - Remove duplicate records
8. data-enricher - Enrich data with lookups
9. bulk-processor - Handle large batch operations
10. migration-specialist - Support system migrations

## Support Workers (6)

1. help-desk-agent - Answer user questions
2. error-diagnostician - Diagnose failed tasks
3. recovery-specialist - Fix recoverable errors
4. escalation-manager - Manage escalations to admin
5. documentation-writer - Maintain help documentation
6. onboarding-specialist - Train new users

---

## Total: 100 Workers

**Status**: Framework defined, 8 CFO workers fully created, remaining 92 follow established patterns.

All workers follow the same AGENT.md structure:
- Identity
- Core Responsibilities  
- Available Tools
- Communication Style
- Model Selection

Each worker is tenant-aware, audit-logged, and RLS-enforced.
