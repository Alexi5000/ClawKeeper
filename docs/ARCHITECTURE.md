# ClawKeeper Architecture

## Overview

ClawKeeper is a 110-agent AI system for autonomous bookkeeping, built on a multi-layer architecture with strict tenant isolation, comprehensive audit trails, and production-grade security.

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  React Dashboard (Vite, Tailwind, Shadcn)                   │
│  - Multi-tenant auth - White-labeling - Role-based UI       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                         │
│  Hono REST API + WebSocket                                   │
│  - JWT auth - Tenant middleware - Rate limiting - RBAC      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestration Layer                 │
│  ClawKeeper CEO → 9 Orchestrators → 100 Workers             │
│  - Task decomposition - DAG execution - Result aggregation  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  Plaid, Stripe, QuickBooks, Xero, Document AI               │
│  - Circuit breakers - Retry logic - Data mapping            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  PostgreSQL with RLS/RBAC                                    │
│  - Tenant isolation - Audit triggers - Immutable logs       │
└─────────────────────────────────────────────────────────────┘
```

## Agent Hierarchy

### Layer 1: CEO
- **ClawKeeper** - Decomposes requests, routes to orchestrators, aggregates results

### Layer 2: Orchestrators (9)
1. **CFO** - Strategic planning, forecasting
2. **Accounts Payable Lead** - Invoice processing, payments
3. **Accounts Receivable Lead** - Customer invoicing, collections
4. **Reconciliation Lead** - Bank matching
5. **Compliance Lead** - Tax, audit, policy
6. **Reporting Lead** - Financial reports
7. **Integration Lead** - External systems
8. **Data/ETL Lead** - Data processing
9. **Support Lead** - User assistance

### Layer 3: Workers (100)
Distributed across orchestrators:
- AP: 15 workers
- AR: 15 workers
- Reconciliation: 12 workers
- Reporting: 12 workers
- Integration: 12 workers
- Data: 10 workers
- Compliance: 10 workers
- CFO: 8 workers
- Support: 6 workers

## Data Flow

### Invoice Processing Flow

```
1. User uploads invoice PDF
2. API receives file, creates task
3. ClawKeeper receives task
4. Decomposes: [OCR → Parse → Validate → Categorize → Approve → Pay]
5. Routes to AP Lead
6. AP Lead delegates to workers:
   - Invoice Parser (OCR)
   - Invoice Validator (data checks)
   - Expense Categorizer (GL coding)
   - Approval Router (workflow)
7. Workers execute, results aggregate
8. AP Lead returns to ClawKeeper
9. ClawKeeper returns to API
10. API returns to user
11. Audit log captures all actions
```

### Bank Reconciliation Flow

```
1. User initiates reconciliation for account
2. Reconciliation Lead triggered
3. Delegates to workers:
   - Transaction Importer (fetch from Plaid)
   - Transaction Matcher (exact + fuzzy)
   - Discrepancy Detector (identify gaps)
4. Generate reconciliation report
5. Flag items for manual review
6. Update reconciled flag on matched transactions
7. Return report with statistics
```

## Security Architecture

### Multi-Tenancy

**Database Level (RLS)**:
- Every table has tenant_id column
- RLS policies enforce: `WHERE tenant_id = current_tenant_id()`
- PostgreSQL session variables set per request

**Application Level**:
- Tenant context from JWT
- Middleware sets tenant_id for all queries
- No cross-tenant queries possible

**Agent Level**:
- Each task includes tenant_id
- Agents validate tenant access before execution

### RBAC

**Roles**:
- super_admin: Full system access
- tenant_admin: Full access within tenant
- accountant: Read/write financial data
- viewer: Read-only access

**Permission Enforcement**:
- Database: RBAC grants per role
- API: Middleware checks user_role
- UI: Role-based component rendering

### Audit Trail

**Immutable Logging**:
- All financial actions logged to `audit_log`
- Database triggers auto-log INSERT/UPDATE/DELETE
- API middleware logs API calls
- Agents log task executions

**Retention**: Indefinite for active tenants, 7 years for deleted

## Scalability

### Horizontal Scaling

- **API Server**: Stateless, can run multiple instances behind load balancer
- **Agents**: Agent runtime can span multiple processes/machines
- **Database**: PostgreSQL read replicas for reporting queries

### Performance Targets

- API p95 latency: < 200ms
- Invoice OCR: < 30s
- Reconciliation (1000 txns): < 5min
- Report generation: < 10s

### Cost Optimization

- Use cheaper models (Gemini Flash) for simple tasks
- Batch similar tasks to reduce API calls
- Cache LLM responses for 24h
- Incremental syncs (not full dataset)

## Deployment

ClawKeeper runs as a standalone CEO agent:
- Workspace: `~/clawkeeper`
- Gateway: Own gateway (port 19789)
- Use case: Customer deployments (white-labeled)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind, Shadcn |
| API | Hono, WebSocket |
| Agents | TypeScript, Clawd framework |
| LLM | Anthropic Claude, Google Gemini |
| Database | PostgreSQL 16 with RLS |
| Auth | JWT, bcrypt |
| Integrations | Plaid, Stripe, QuickBooks, Xero |
| OCR | Google Document AI |

## Future Enhancements

- Real-time WebSocket updates
- Mobile app (React Native)
- Advanced forecasting (ML models)
- Multi-currency support
- Custom chart of accounts
- Recurring invoice automation
- Expense policy automation

---

This architecture ensures ClawKeeper is production-ready, secure, and scalable for SMB financial automation.
