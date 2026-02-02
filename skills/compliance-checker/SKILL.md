---
name: compliance-checker
description: "Validate tax compliance, audit readiness, and policy enforcement. Use when checking transactions for compliance violations, preparing for audits, or enforcing financial policies. Ensures regulatory requirements are met."
---

# Compliance Checker Skill

## Purpose

Ensures all financial activities comply with tax regulations, internal policies, and audit requirements, providing real-time compliance monitoring and audit preparation.

## Triggers

- Transaction created or modified
- Invoice approved or paid
- Month-end/quarter-end closing
- Audit preparation requested
- Unusual activity detected

## Capabilities

1. **Tax Compliance Checks** - Verify sales tax, income tax rules
2. **Audit Readiness** - Ensure documentation completeness
3. **Policy Enforcement** - Enforce company financial policies
4. **Segregation of Duties** - Verify role separation
5. **Approval Limits** - Enforce approval hierarchies
6. **Fraud Detection** - Identify suspicious patterns
7. **Regulatory Reporting** - Prepare required filings

## Instructions

### Tax Compliance Checks

#### Sales Tax Validation
```typescript
// For each invoice line item
if (item.category === 'taxable_goods') {
  const expected_tax = item.amount * tenant.sales_tax_rate;
  const actual_tax = invoice.tax_amount;
  
  if (Math.abs(expected_tax - actual_tax) > 1) {  // $0.01 tolerance
    flag_compliance_issue({
      type: 'tax_compliance',
      status: 'fail',
      details: `Sales tax mismatch: expected ${expected_tax}, got ${actual_tax}`,
    });
  }
}
```

#### Expense Deductibility
Check if expense is tax-deductible:
- Business purpose required
- Receipt/invoice documentation
- Reasonable amount for category
- Not on IRS non-deductible list

### Audit Readiness

Verify for each financial entity:
- [ ] Supporting documentation attached
- [ ] Approval trail complete
- [ ] Amounts reconcile
- [ ] Dates are logical
- [ ] Description is clear and detailed

Generate checklist:
```json
{
  "entity_type": "invoice",
  "entity_id": "uuid",
  "audit_ready": true,
  "issues": [],
  "recommendations": [
    "Add more detailed description to line item 3"
  ]
}
```

### Policy Enforcement

Common policies:
- **Approval Limits** - Invoices > $X require manager approval
- **Dual Approval** - Invoices > $Y require two approvals
- **Vendor Restrictions** - Some vendors require special approval
- **Expense Categories** - Some categories forbidden or limited
- **Payment Timing** - No early payments without discount

Enforcement:
```typescript
function enforce_approval_policy(invoice: Invoice, user: User): boolean {
  const limit = get_approval_limit(user.role);
  
  if (invoice.amount > limit) {
    return false;  // Needs higher authority
  }
  
  return true;
}
```

### Segregation of Duties

Verify role separation:
- Invoice creator ≠ Invoice approver
- Payment scheduler ≠ Payment executor
- Reconciliation performer ≠ Reconciliation reviewer

```typescript
function check_segregation(action: string, user_id: string, invoice: Invoice): boolean {
  if (action === 'approve' && invoice.created_by === user_id) {
    flag_compliance_issue({
      type: 'policy_violation',
      status: 'fail',
      details: 'User cannot approve their own invoice',
    });
    return false;
  }
  return true;
}
```

### Fraud Detection

Patterns to detect:
- **Duplicate Payments** - Same vendor + amount + date
- **Round Amounts** - Unusual number of round amounts (e.g., $1000, $500)
- **Unusual Vendors** - New vendors with large amounts
- **Frequency Anomalies** - Vendor invoiced twice in one day
- **Amount Anomalies** - Invoice 10x normal amount for vendor

Use statistical analysis and LLM for pattern detection.

### Regulatory Reporting

Prepare filings:
- **1099 Forms** - For contractors (payments > $600/year)
- **Sales Tax Returns** - Monthly or quarterly
- **Income Tax Estimates** - Quarterly

## Compliance Checks

| Check Type | Frequency | Auto-Fix | Manual Review |
|------------|-----------|----------|---------------|
| Tax calculation | Per transaction | No | Yes |
| Approval limits | Per approval | No | Yes |
| Segregation of duties | Per action | Block | Alert admin |
| Fraud patterns | Daily batch | No | Alert admin |
| Audit readiness | Month-end | Partial | Yes |

## Integration Points

- **tax-classifier** (AP worker) - For tax categorization
- **fraud-detector** (Compliance worker) - For fraud patterns
- **policy-enforcer** (Compliance worker) - For policy rules
- **audit-trail** - Log all compliance checks

## Models

- **Policy Rules**: Deterministic (no LLM)
- **Fraud Detection**: Claude Opus 4-5 (pattern recognition)
- **Tax Classification**: Claude Sonnet 4

## Security

- Compliance check results stored in `compliance_checks` table
- Failed checks block actions (e.g., cannot pay non-compliant invoice)
- All checks logged to audit_log
- Alerts sent to tenant_admin on failures

## Outputs

### Pass
```json
{
  "compliance_status": "pass",
  "checks_performed": ["tax_compliance", "approval_limit", "segregation"],
  "issues": [],
  "timestamp": "2026-01-15T14:30:00Z"
}
```

### Fail
```json
{
  "compliance_status": "fail",
  "checks_performed": ["tax_compliance", "approval_limit"],
  "issues": [
    {
      "type": "approval_limit",
      "severity": "high",
      "details": "Invoice amount $5000 exceeds user approval limit $1000",
      "recommendation": "Route to manager for approval"
    }
  ],
  "action_blocked": true,
  "timestamp": "2026-01-15T14:30:00Z"
}
```

---

Invoke this skill before any financial action to ensure compliance and after month-end to assess audit readiness.
