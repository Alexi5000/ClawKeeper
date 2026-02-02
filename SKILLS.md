# ClawKeeper Skills Index

Canonical index of skills available to ClawKeeper agents. Each skill lives under `skills/<name>/SKILL.md`.

## Core Skills (8)

| Skill | Path | Purpose |
|-------|------|---------|
| invoice-processor | skills/invoice-processor/SKILL.md | Parse, validate, and categorize invoices using OCR and LLM |
| bank-reconciliation | skills/bank-reconciliation/SKILL.md | Match transactions, detect and resolve discrepancies |
| financial-reporting | skills/financial-reporting/SKILL.md | Generate P&L, balance sheet, cash flow, and custom reports |
| payment-gateway | skills/payment-gateway/SKILL.md | Process payments via Stripe, PayPal, ACH |
| document-parser | skills/document-parser/SKILL.md | OCR invoices, receipts, statements using Document AI |
| compliance-checker | skills/compliance-checker/SKILL.md | Validate tax compliance, audit readiness, policy enforcement |
| data-sync | skills/data-sync/SKILL.md | Sync with QuickBooks, Xero, and other accounting software |
| audit-trail | skills/audit-trail/SKILL.md | Maintain immutable audit log for all financial actions |

## Skill Usage

Agents invoke skills by natural language matching of the `description` field in the skill's YAML frontmatter.

### Example Invocation

When ClawKeeper receives "Process this invoice", it:
1. Matches to `invoice-processor` skill
2. Loads `skills/invoice-processor/SKILL.md`
3. Follows instructions to parse, validate, categorize
4. Delegates to AP Lead for approval workflow

## Skill Development

To add a new skill:
1. Create `skills/<name>/SKILL.md`
2. Add YAML frontmatter with `name` and `description`
3. Write markdown instructions
4. Update this index
5. Reference in agent AGENT.md files

---

*For detailed skill documentation, see individual SKILL.md files in the skills/ directory.*
