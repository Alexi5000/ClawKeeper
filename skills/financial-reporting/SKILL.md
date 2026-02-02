---
name: financial-reporting
description: "Generate standard financial reports including P&L, balance sheet, and cash flow statements. Use when creating monthly/quarterly/annual reports, comparing periods, or exporting financial data. Supports GAAP and custom report formats."
---

# Financial Reporting Skill

## Purpose

Generates accurate, comprehensive financial reports from transaction data, following GAAP principles and customizable to tenant requirements.

## Triggers

- User requests financial report
- Scheduled report generation (monthly, quarterly)
- Board meeting preparation
- Tax filing requirements

## Capabilities

1. **Profit & Loss Statement** - Revenue, expenses, net income
2. **Balance Sheet** - Assets, liabilities, equity
3. **Cash Flow Statement** - Operating, investing, financing activities
4. **AP/AR Aging Reports** - Aging buckets for payables/receivables
5. **Custom Reports** - Ad-hoc queries and analysis
6. **Comparative Reports** - Period-over-period, budget vs actual
7. **Export** - PDF, Excel, CSV formats

## Instructions

### Profit & Loss Statement

```sql
-- Revenue
SELECT 
    COALESCE(SUM(amount), 0) as total_revenue
FROM transactions
WHERE tenant_id = $1
AND date BETWEEN $2 AND $3
AND category = 'income';

-- Expenses by subcategory
SELECT 
    subcategory,
    COALESCE(SUM(ABS(amount)), 0) as total
FROM transactions
WHERE tenant_id = $1
AND date BETWEEN $2 AND $3
AND category = 'expense'
GROUP BY subcategory
ORDER BY total DESC;

-- Net Income = Revenue - Expenses
```

Report structure:
```
PROFIT & LOSS STATEMENT
For the period: Jan 1, 2026 - Jan 31, 2026

REVENUE
  Service Revenue                    $50,000.00
  Product Sales                      $30,000.00
  Total Revenue                      $80,000.00

EXPENSES
  Salaries & Wages                   $35,000.00
  Rent                               $5,000.00
  Software & Subscriptions           $2,500.00
  Marketing                          $3,000.00
  Utilities                          $500.00
  Total Expenses                     $46,000.00

NET INCOME                           $34,000.00
```

### Balance Sheet

```sql
-- Assets
SELECT type, COALESCE(SUM(balance), 0) as total
FROM accounts
WHERE tenant_id = $1
AND type IN ('checking', 'savings', 'investment')
GROUP BY type;

-- Liabilities
SELECT type, COALESCE(SUM(ABS(balance)), 0) as total
FROM accounts
WHERE tenant_id = $1
AND type IN ('credit_card', 'loan')
GROUP BY type;

-- Equity = Assets - Liabilities
```

Report structure:
```
BALANCE SHEET
As of: Jan 31, 2026

ASSETS
  Current Assets
    Checking Account                 $50,000.00
    Savings Account                  $100,000.00
  Total Current Assets               $150,000.00

  Long-Term Assets
    Investment Account               $50,000.00
  Total Long-Term Assets             $50,000.00

TOTAL ASSETS                         $200,000.00

LIABILITIES
  Current Liabilities
    Credit Card                      $2,500.00
  Total Current Liabilities          $2,500.00

TOTAL LIABILITIES                    $2,500.00

EQUITY
  Retained Earnings                  $197,500.00

TOTAL LIABILITIES & EQUITY           $200,000.00
```

### Cash Flow Statement

Categorize transactions:
- **Operating Activities** - Day-to-day operations (income, expense)
- **Investing Activities** - Asset purchases, sales
- **Financing Activities** - Loans, equity

### AP/AR Aging Report

Bucket by days outstanding:
```sql
-- AP Aging
SELECT 
    CASE
        WHEN CURRENT_DATE - due_date < 0 THEN 'Current'
        WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN '1-30 days'
        WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31-60 days'
        WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN '61-90 days'
        ELSE '90+ days'
    END as bucket,
    COUNT(*) as count,
    SUM(amount) as total
FROM invoices
WHERE tenant_id = $1
AND status IN ('pending_approval', 'approved')
GROUP BY bucket;
```

### Custom Reports

Support ad-hoc queries:
- Expenses by vendor (top 10)
- Revenue by customer
- Monthly trend analysis
- Department budget vs actual

## Export Formats

### PDF
- Professional formatting
- Company logo and header
- Page numbers, date generated

### Excel
- Multiple sheets (P&L, Balance Sheet, Cash Flow)
- Formulas preserved
- Charts included

### CSV
- One sheet per file
- Headers included
- UTF-8 encoding

## Data Accuracy

- Use BigInt for all amounts (cents)
- Round only for display, never in calculations
- Verify totals and subtotals
- Cross-check balance sheet (Assets = Liabilities + Equity)
- Validate date ranges

## Integration Points

- **data-aggregator** (Reporting worker) - Aggregate financial data
- **report-formatter** (Reporting worker) - Format reports
- **export-handler** (Reporting worker) - Export to formats
- **audit-trail** - Log all report generations

## Models

- **Data Aggregation**: SQL queries (deterministic)
- **Custom Report Analysis**: Claude Sonnet 4
- **Chart Generation**: Gemini 2.0 Flash

## Security

- Enforce tenant_id filter on all queries
- Verify user has permission to view financial data
- Redact sensitive fields if exporting for external use
- Log report generation to audit_log

---

Invoke this skill when generating any financial report, from standard statements to custom analysis.
