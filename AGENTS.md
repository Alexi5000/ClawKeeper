# ClawKeeper Agents Index

Canonical index of agents in the ClawKeeper AI Bookkeeping system. Total: 110 agents across 3 layers.

## Architecture

```
ClawKeeper (CEO)
├── CFO (8 workers)
├── Accounts Payable Lead (15 workers)
├── Accounts Receivable Lead (15 workers)
├── Reconciliation Lead (12 workers)
├── Compliance Lead (10 workers)
├── Reporting Lead (12 workers)
├── Integration Lead (12 workers)
├── Data/ETL Lead (10 workers)
└── Support Lead (6 workers)
```

## CEO Layer

| Agent | Path | Role | Framework |
|-------|------|------|-----------|
| ClawKeeper | agents/clawkeeper/AGENT.md | Virtual CEO; orchestrates 9 domain leads | Clawd |

## Orchestrator Layer (9 C-Level Leads)

| Orchestrator | Path | Domain | Workers | Primary Capabilities |
|--------------|------|--------|---------|---------------------|
| CFO | agents/orchestrators/cfo/AGENT.md | Strategic Finance | 8 | Strategic planning, forecasting, cash flow |
| Accounts Payable Lead | agents/orchestrators/accounts-payable-lead/AGENT.md | Vendor Payments | 15 | Invoice processing, vendor payments, approvals |
| Accounts Receivable Lead | agents/orchestrators/accounts-receivable-lead/AGENT.md | Customer Collections | 15 | Customer invoicing, collections, aging |
| Reconciliation Lead | agents/orchestrators/reconciliation-lead/AGENT.md | Bank Matching | 12 | Transaction matching, discrepancy resolution |
| Compliance Lead | agents/orchestrators/compliance-lead/AGENT.md | Regulatory | 10 | Tax compliance, audit prep, policy enforcement |
| Reporting Lead | agents/orchestrators/reporting-lead/AGENT.md | Financial Reports | 12 | P&L, balance sheet, cash flow, custom reports |
| Integration Lead | agents/orchestrators/integration-lead/AGENT.md | External Systems | 12 | Plaid, Stripe, QuickBooks, Xero connectors |
| Data/ETL Lead | agents/orchestrators/data-etl-lead/AGENT.md | Data Processing | 10 | Data import, transformation, validation |
| Support Lead | agents/orchestrators/support-lead/AGENT.md | User Assistance | 6 | User assistance, error recovery, escalation |

## Worker Layer (100 Specialized Workers)

### CFO Workers (8)

| Worker | Path | Specialty |
|--------|------|-----------|
| Strategic Planner | agents/workers/cfo/strategic-planner/AGENT.md | Long-term financial strategy |
| Cash Flow Analyst | agents/workers/cfo/cash-flow-analyst/AGENT.md | Cash flow forecasting |
| Budget Manager | agents/workers/cfo/budget-manager/AGENT.md | Budget creation and monitoring |
| Financial Modeler | agents/workers/cfo/financial-modeler/AGENT.md | Financial modeling and scenarios |
| KPI Tracker | agents/workers/cfo/kpi-tracker/AGENT.md | Key performance indicators |
| Variance Analyst | agents/workers/cfo/variance-analyst/AGENT.md | Budget vs actual analysis |
| Investment Advisor | agents/workers/cfo/investment-advisor/AGENT.md | Investment recommendations |
| Risk Assessor | agents/workers/cfo/risk-assessor/AGENT.md | Financial risk assessment |

### Accounts Payable Workers (15)

*See `agents/workers/ap/` directory for full agent definitions*

### Accounts Receivable Workers (15)

*See `agents/workers/ar/` directory for full agent definitions*

### Reconciliation Workers (12)

*See `agents/workers/reconciliation/` directory for full agent definitions*

### Compliance Workers (10)

*See `agents/workers/compliance/` directory for full agent definitions*

### Reporting Workers (12)

*See `agents/workers/reporting/` directory for full agent definitions*

### Integration Workers (12)

*See `agents/workers/integration/` directory for full agent definitions*

### Data/ETL Workers (10)

*See `agents/workers/data/` directory for full agent definitions*

### Support Workers (6)

*See `agents/workers/support/` directory for full agent definitions*

---

*For detailed worker specifications, see `agents/WORKER_SUMMARY.md` and individual AGENT.md files in the workers/ subdirectories.*
