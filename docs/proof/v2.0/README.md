# ClawKeeper v2.0 Proof Bundle

This bundle is generated from deterministic offline FDE scenarios.

## What This Proves

- FDE benchmark contracts are executable.
- Finance-agent scenarios are policy-gated.
- Approval-gated payment intent does not execute payment actions.
- Audit evidence is redacted and synthetic.

## Verification

```bash
npm run fde:contracts
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
```

## Current Result

- Scenarios passed: 4/4
- Average score: 1
- Generated at: 2026-07-07T00:00:00.000Z

## Files

- `benchmark.json`: deterministic FDE benchmark output.
- `demo-run.md`: summarized one-command demo proof.
- `audit-evidence.json`: redacted synthetic audit events.

## Limits

- This is not a live payment proof.
- This does not write to Plaid, Stripe, QuickBooks, or Xero.
- Docker validation is tracked separately because the local Zo shell does not expose Docker.
