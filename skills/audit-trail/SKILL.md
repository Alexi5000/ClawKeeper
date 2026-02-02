---
name: audit-trail
description: "Maintain immutable audit log for all financial actions. Use when logging user actions, tracking entity changes, generating audit reports, or investigating compliance issues. Ensures complete accountability and traceability."
---

# Audit Trail Skill

## Purpose

Maintains a comprehensive, immutable audit log of all financial actions, providing complete traceability for compliance, security, and troubleshooting.

## Triggers

- Any financial entity created, updated, or deleted
- User authentication or permission change
- Report generated or exported
- Payment processed
- Compliance check failed

## Capabilities

1. **Action Logging** - Log all CRUD operations
2. **Change Tracking** - Capture before/after state
3. **User Attribution** - Record who performed action
4. **Audit Report Generation** - Query and export audit logs
5. **Compliance Trail** - Track approval workflows
6. **Security Events** - Log security-related events

## Instructions

### Log Entry Creation

Every financial action triggers:
```sql
INSERT INTO audit_log (
  tenant_id, user_id, action, entity_type, entity_id,
  changes, ip_address, user_agent, timestamp
)
VALUES (
  $1,  -- tenant_id (from context)
  $2,  -- user_id (from JWT)
  $3,  -- action: create, update, delete, approve, reject, export, import
  $4,  -- entity_type: invoices, transactions, accounts, etc.
  $5,  -- entity_id: UUID of entity
  $6,  -- changes: JSONB with old/new values
  $7,  -- ip_address: client IP
  $8,  -- user_agent: browser/API client
  NOW()
);
```

### Change Tracking

For **CREATE**:
```json
{
  "action": "create",
  "new": {
    "id": "uuid",
    "vendor_name": "Office Depot",
    "amount": 50000,
    ...
  }
}
```

For **UPDATE**:
```json
{
  "action": "update",
  "old": {
    "status": "pending_approval",
    "approved_by": null
  },
  "new": {
    "status": "approved",
    "approved_by": "user-uuid",
    "approved_at": "2026-01-15T14:30:00Z"
  },
  "fields_changed": ["status", "approved_by", "approved_at"]
}
```

For **DELETE**:
```json
{
  "action": "delete",
  "deleted": {
    "id": "uuid",
    "vendor_name": "...",
    ...
  }
}
```

### Audit Report Generation

Query audit log with filters:
```typescript
async function generate_audit_report(filters: {
  tenant_id: string;
  start_date: string;
  end_date: string;
  user_id?: string;
  entity_type?: string;
  action?: string;
}): Promise<AuditReport> {
  const entries = await query_audit_log(filters);
  
  return {
    summary: {
      total_actions: entries.length,
      by_action: count_by_field(entries, 'action'),
      by_entity: count_by_field(entries, 'entity_type'),
      by_user: count_by_field(entries, 'user_id'),
    },
    entries: entries.map(format_audit_entry),
  };
}
```

### Compliance Trail

Track approval workflows:
```sql
-- All actions on an invoice
SELECT 
  timestamp,
  users.name as performed_by,
  action,
  changes
FROM audit_log
JOIN users ON audit_log.user_id = users.id
WHERE entity_type = 'invoices'
AND entity_id = $1
ORDER BY timestamp ASC;
```

Shows complete history:
1. Created by User A on Jan 1
2. Approved by User B on Jan 5
3. Paid on Jan 10

### Security Events

Log security-sensitive actions:
- Failed login attempts
- Permission denied
- Role changes
- API key created/revoked
- Data export
- Bulk delete

## Audit Log Immutability

Enforce immutability:
1. **Database**: `audit_log` table has no UPDATE/DELETE policies
2. **Application**: No methods to modify audit log
3. **Backup**: Daily backups retained for 7 years

## Retention Policy

- **Active Tenants**: Retain indefinitely
- **Deleted Tenants**: Retain for 7 years after deletion
- **Archival**: Move to cold storage after 2 years
- **Purge**: Never (unless legal requirement)

## Query Examples

### All actions by user in date range
```sql
SELECT * FROM audit_log
WHERE tenant_id = $1
AND user_id = $2
AND timestamp BETWEEN $3 AND $4
ORDER BY timestamp DESC;
```

### All changes to specific invoice
```sql
SELECT * FROM audit_log
WHERE tenant_id = $1
AND entity_type = 'invoices'
AND entity_id = $2
ORDER BY timestamp ASC;
```

### All failed compliance checks
```sql
SELECT * FROM audit_log
WHERE tenant_id = $1
AND entity_type = 'compliance_checks'
AND changes->>'status' = 'fail'
AND timestamp > NOW() - INTERVAL '30 days';
```

## Integration Points

- **Database Triggers** - Auto-log INSERT/UPDATE/DELETE
- **API Middleware** - Log API actions with user context
- **Agent Runs** - Log all agent task executions

## Models

- **Audit Logic**: Deterministic (triggers, middleware)
- **Report Analysis**: Claude Sonnet 4 (when analyzing patterns)

## Security

- Audit log accessible only to authorized roles
- Cannot be modified or deleted
- Encrypted at rest
- Access logged (meta-audit)

## Performance

- **Write**: Async (don't block main transaction)
- **Query**: Indexed on tenant_id, timestamp, entity_id
- **Archival**: Move to separate table after 1 year for performance

---

This skill is automatically invoked by database triggers and API middleware. Explicit invocation is for generating audit reports or investigating compliance issues.
