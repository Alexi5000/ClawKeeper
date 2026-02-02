---
name: bank-reconciliation
description: "Match bank transactions to book transactions, detect discrepancies, and resolve mismatches. Use when reconciling bank accounts, investigating unmatched transactions, or generating reconciliation reports. Handles multiple accounts and currencies."
---

# Bank Reconciliation Skill

## Purpose

Automates the bank reconciliation process by matching book transactions to bank statement transactions, detecting discrepancies, and facilitating resolution.

## Triggers

- End of month reconciliation scheduled
- User initiates manual reconciliation
- Discrepancy detected in account balance
- Bank feed imported via Plaid

## Capabilities

1. **Transaction Import** - Import bank transactions via Plaid or CSV
2. **Transaction Matching** - Match book to bank transactions
3. **Discrepancy Detection** - Identify unmatched transactions
4. **Fuzzy Matching** - Match similar amounts and dates
5. **Outstanding Items** - Track checks and deposits in transit
6. **Balance Verification** - Verify book balance = cleared bank balance + outstanding items

## Instructions

### Step 1: Import Bank Transactions

Options:
1. **Plaid Integration** - Fetch via data-sync skill
2. **CSV Upload** - Parse CSV file with columns: date, description, amount
3. **Manual Entry** - User inputs transactions

### Step 2: Load Book Transactions

Query database for unreconciled transactions in date range:
```sql
SELECT * FROM transactions 
WHERE account_id = $1 
AND date BETWEEN $2 AND $3 
AND reconciled = FALSE
```

### Step 3: Exact Matching

Match transactions where:
- Date matches exactly
- Amount matches exactly (cents)
- Payee name matches (after normalization)

Mark as `reconciled = TRUE` when matched.

### Step 4: Fuzzy Matching

For unmatched transactions, try fuzzy match:
- **Date proximity** - Within ±3 days
- **Amount match** - Exact amount
- **Payee similarity** - Levenshtein distance < 3 or substring match

Present fuzzy matches for manual review.

### Step 5: Discrepancy Detection

Identify discrepancies:
- **Missing from Bank** - In books but not in bank statement (check in transit?)
- **Missing from Books** - In bank but not in books (unrecorded transaction?)
- **Amount Mismatch** - Same transaction, different amounts (data entry error?)
- **Date Mismatch** - Same transaction, different dates (timing difference?)

### Step 6: Outstanding Items

Track outstanding items:
- **Checks Written** - In books, not yet cleared bank
- **Deposits Made** - In books, not yet posted by bank

Calculate outstanding balance:
```
Book Balance - Outstanding Checks + Outstanding Deposits = Bank Balance
```

### Step 7: Generate Report

Create reconciliation report:
```json
{
  "account_id": "uuid",
  "period_start": "2026-01-01",
  "period_end": "2026-01-31",
  "book_balance": 5000000,  // cents
  "bank_balance": 4950000,  // cents
  "matched_count": 45,
  "unmatched_book_count": 2,
  "unmatched_bank_count": 1,
  "outstanding_checks": [
    {"id": "...", "amount": -25000, "payee": "..."}
  ],
  "outstanding_deposits": [
    {"id": "...", "amount": 75000}
  ],
  "discrepancies": [
    {
      "type": "missing_from_bank",
      "transaction_id": "...",
      "description": "...",
      "amount": -5000
    }
  ],
  "status": "balanced",  // or "discrepancy"
  "requires_investigation": false
}
```

## Decision Logic

### Auto-Reconcile
- Exact match (date, amount, payee)
- Previously reconciled (if re-running)

### Manual Review Required
- Fuzzy match (present options to user)
- Significant discrepancy (> $100)
- Unusual pattern (e.g., duplicate amounts)

### Escalate
- Unresolved after 3 reconciliation attempts
- Balance off by > $1000
- Fraud indicators detected

## Integration Points

- **data-sync** (via Integration Lead) - For Plaid import
- **transaction-matcher** (Reconciliation worker) - For matching logic
- **discrepancy-investigator** (Reconciliation worker) - For investigation
- **audit-trail** - Log all reconciliation actions

## Models

- **Matching**: Deterministic algorithm (no LLM)
- **Payee Normalization**: Claude Sonnet 4 or Gemini Flash
- **Discrepancy Investigation**: Claude Sonnet 4

## Security

- Never modify historical transactions automatically
- Require manual approval for adjustments
- Log all reconciliation actions to audit_log
- Preserve original bank data

---

Invoke this skill at month-end or when investigating account discrepancies.
