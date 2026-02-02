# ClawKeeper Steering Principles

## Mission

Automate bookkeeping for SMBs with precision, security, and compliance at the core.

## Core Values

1. **Financial Precision** - Every cent must be accounted for. Use BigInt for currency, never float.

2. **Security First** - Multi-tenant isolation is non-negotiable. RLS and RBAC enforced at all layers.

3. **Audit Trail** - Immutable logging of all financial actions. Compliance-ready from day one.

4. **User Trust** - White-label support means protecting each tenant's brand and data with equal rigor.

5. **Agent Specialization** - Each of the 110 agents has a narrow, well-defined purpose. No god agents.

## Architectural Principles

### Tenant Isolation
- Database-level RLS on every query
- Tenant context injected at API middleware
- No cross-tenant data leaks, ever

### Financial Accuracy
- All amounts stored as BigInt (cents)
- Rounding only on display, never in computation
- Transaction matching uses exact amounts

### Observability
- Every agent action logged
- Cost tracking per tenant, per agent, per task
- Real-time monitoring via dashboard

### Scalability
- Stateless agents (state in PostgreSQL)
- Horizontal scaling via agent pool
- Queue-based task distribution

## Agent Coordination

### Hierarchy
```
ClawKeeper (CEO) -> 9 Orchestrators -> 100 Workers
```

### Delegation Rules
1. CEO decomposes complex requests into DAGs
2. Orchestrators route to specialized workers
3. Workers execute atomic tasks
4. Results aggregate up the chain

### Communication
- Task assignment via TaskStar DAG
- Results via structured JSON output
- Errors bubble up with context
- Audit log captures all actions

## Security Posture

### Defense in Depth
1. API Gateway: Rate limiting, auth
2. Application: Input validation, RBAC
3. Database: RLS, triggers, audit log
4. Secrets: Environment variables, never committed

### Threat Model
- **Tenant Isolation Breach**: RLS prevents
- **SQL Injection**: Parameterized queries only
- **Privilege Escalation**: RBAC enforced at DB
- **Data Exfiltration**: Audit log tracks all exports
- **LLM Prompt Injection**: Input sanitization
- **PII Leakage**: PII detection before LLM calls

## Compliance Readiness

### Audit Trail Requirements
- Who (user_id)
- What (action, entity_type, entity_id)
- When (timestamp)
- Where (ip_address, user_agent)
- Changes (old/new values)

### Reports
- All standard financial reports (P&L, Balance Sheet, Cash Flow)
- Aging reports (AP, AR)
- Custom reports via SQL templates

### Tax Compliance
- Expense categorization
- Income tracking
- Quarterly report generation
- Export to accounting software (QuickBooks, Xero)

## Development Philosophy

### Code Quality
- Type-safe (TypeScript + Zod)
- Linted (ESLint)
- Tested (Bun test)
- Documented (inline comments, AGENT.md, SKILL.md)

### Git Workflow
- Feature branches
- Conventional commits
- PR reviews required
- No force push to main

### Deployment
- Standalone CEO (customer deployment)
- Blue-green deployments
- Database migrations versioned

## Failure Modes

### Graceful Degradation
1. External API down -> Circuit breaker -> Queue for retry
2. LLM API down -> Fallback model -> Manual queue
3. Database slow -> Read replica -> Cache
4. Agent error -> Retry with backoff -> Escalate to support

### Recovery
- Failed tasks auto-retry (up to 3 times)
- Manual intervention UI for support team
- Rollback capability for DB migrations
- Backup/restore procedures documented

## Performance Targets

- **API Response**: < 200ms (p95)
- **Invoice Processing**: < 30s (with OCR)
- **Reconciliation**: < 5min (1000 transactions)
- **Report Generation**: < 10s (monthly)
- **Dashboard Load**: < 1s

## Monitoring

### Metrics
- Task latency (per agent, per capability)
- Token usage (per agent, per tenant)
- Cost (per tenant, per day)
- Error rate (by type, by agent)
- Queue depth

### Alerts
- High error rate (> 5%)
- Queue backlog (> 100 tasks)
- External API failures
- Database connection issues
- Disk space low

---

These principles guide all decisions in ClawKeeper development and deployment.
