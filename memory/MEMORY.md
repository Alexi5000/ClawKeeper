# ClawKeeper Long-Term Memory

## System Knowledge

### Financial Workflows

I have learned that typical SMB bookkeeping involves:
1. **Invoice Processing** - 20-50 invoices per month for most SMBs
2. **Bank Reconciliation** - Monthly reconciliation critical for accuracy
3. **Financial Reports** - Monthly P&L for management, quarterly for board/investors
4. **Payment Timing** - Early payment discounts (2/10 net 30) can save 36% APR equivalent
5. **Compliance** - Tax deadlines vary by entity type (C-Corp, S-Corp, LLC, sole proprietor)

### Common Patterns

**Invoice Approval Workflows**:
- < $1,000: Auto-approve for recurring vendors
- $1,000 - $5,000: Require accountant approval
- > $5,000: Require manager/admin approval
- > $25,000: Require dual approval

**Reconciliation Issues**:
- Timing differences account for 80% of discrepancies
- Common: checks written but not yet cashed, deposits in transit
- Rare but critical: duplicate transactions, data entry errors

**Report Frequency**:
- P&L: Monthly (internal), Quarterly (board)
- Balance Sheet: Monthly
- Cash Flow: Weekly (if cash-tight), Monthly (otherwise)
- AP/AR Aging: Weekly

### Integration Gotchas

**Plaid**:
- Transaction descriptions may be truncated
- Categories need mapping to custom GL codes
- Some transactions appear 1-3 days after actual date

**QuickBooks**:
- Invoice sync can create duplicates if not using external IDs
- Custom fields don't always map cleanly
- Rate limits: 500 requests per minute per app

**Stripe**:
- Webhook events may arrive out of order
- Idempotency keys critical to prevent duplicate charges
- Refunds can take 5-10 business days to post

## Tenant Patterns

### Typical Tenant Setup Timeline

Day 1:
- Create tenant, add admin user
- Connect bank accounts via Plaid
- Configure approval thresholds

Week 1:
- Import historical transactions (3-6 months)
- Train expense categorization on existing data
- Set up recurring vendors

Month 1:
- Complete first month-end close
- Generate first full financial reports
- Tune approval workflows based on volume

### Common Pain Points

1. **Data Migration** - Moving from manual Excel/QuickBooks
   - Solution: Bulk import tool, deduplicate, validate
   
2. **Vendor Resistance** - Vendors don't want to change invoice format
   - Solution: OCR handles any format, flexible parsing

3. **Approval Bottlenecks** - Admins slow to approve invoices
   - Solution: Configurable thresholds, auto-approval for trusted vendors

4. **Reconciliation Confusion** - Users don't understand discrepancies
   - Solution: Clear explanations, suggested resolutions, one-click fixes

## Learned Optimizations

### Performance
- Batch invoice parsing (up to 50 concurrent)
- Cache expense categories per tenant (reduce LLM calls)
- Incremental sync (only changed records)
- Pre-compute monthly reports at month-end

### Cost Management
- Use Gemini Flash for categorization (10x cheaper, 95% accuracy)
- Use Claude Sonnet for invoice parsing (high accuracy needed)
- Use Claude Opus only for complex multi-step workflows
- Cache LLM responses for 24h (deduplicate similar requests)

### User Experience
- Show progress for long tasks (OCR, reconciliation)
- Provide confidence scores (when to review manually)
- Surface AI reasoning (why this category, why this match)
- Allow manual overrides (but log to audit trail)

## Security Incidents

### Lessons Learned

No incidents yet (new system), but prepared for:
1. **Tenant Isolation Breach** - RLS prevents, audit log detects
2. **Unauthorized Access** - JWT expiration, role checks at API and DB
3. **Data Exfiltration** - Export limits, audit log tracks all exports
4. **LLM Prompt Injection** - Input sanitization, PII detection

---

This memory grows with every tenant interaction and agent execution.
