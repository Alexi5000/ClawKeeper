# ClawKeeper v2.0 Demo Run

Generated: 2026-07-07T00:00:00.000Z

This is an offline deterministic proof run. It uses synthetic finance scenarios and does not call live providers or move money.

## Command

```bash
npm run proof:v2
npm run proof:v2:validate
```

## Result

- Scenarios: 4/4 passed
- Average score: 1
- Plateau detected: true

| Scenario | Policy decision | Evaluation |
|---|---:|---:|
| fde-invoice-intake-validation | allow | pass |
| fde-reconciliation-exception-review | allow | pass |
| fde-approval-gated-payment-intent | requires_approval | pass |
| fde-audit-trail-reconstruction | allow | pass |
