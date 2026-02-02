# ClawKeeper Heartbeat Protocol

## Purpose

The heartbeat ensures ClawKeeper remains responsive, healthy, and aligned with its mission of precise financial automation.

## Heartbeat Schedule

**Frequency**: Every 4 hours

## Heartbeat Checks

### 1. System Health

- [ ] API server responding (< 100ms)
- [ ] Database connection healthy
- [ ] All 9 orchestrators reachable
- [ ] Worker pool capacity available
- [ ] External API circuit breakers closed

### 2. Task Queue Health

- [ ] Queue depth < 100 (else alert)
- [ ] No tasks stuck > 1 hour
- [ ] Error rate < 5%
- [ ] Average task latency < 60s

### 3. Data Integrity

- [ ] Audit log entries continuous (no gaps)
- [ ] Financial totals balance (assets = liabilities + equity)
- [ ] No orphaned records (referential integrity)
- [ ] RLS policies active on all tables

### 4. Security Posture

- [ ] No failed tenant isolation checks
- [ ] No unauthorized access attempts
- [ ] API keys valid and not expired
- [ ] Rate limiters functioning

### 5. Integration Health

- [ ] Plaid connection active
- [ ] Stripe API reachable
- [ ] QuickBooks sync successful (if configured)
- [ ] Xero sync successful (if configured)

## Actions on Failure

**API Server Down** → Restart, alert admin
**Database Connection Lost** → Reconnect, queue tasks
**Orchestrator Offline** → Restart, redistribute tasks
**Circuit Breaker Open** → Wait for timeout, escalate if persistent
**Audit Log Gap** → Investigate, alert super_admin
**Data Integrity Issue** → Block writes, alert super_admin immediately

## Heartbeat Log

Each heartbeat logs to `agent_runs` table:
```sql
INSERT INTO agent_runs (
  id, tenant_id, agent_id, task_id, status
)
VALUES (
  uuid(), 'system', 'clawkeeper', 'heartbeat-{timestamp}', 'completed'
);
```

## Escalation

If 3 consecutive heartbeats fail → Alert super_admin via email and Discord

## Metrics Tracked

- Uptime percentage
- Average response time
- Task completion rate
- Error rate
- Cost per tenant per day
- Token usage per tenant per day

---

The heartbeat is ClawKeeper's self-awareness mechanism, ensuring continuous reliability.
