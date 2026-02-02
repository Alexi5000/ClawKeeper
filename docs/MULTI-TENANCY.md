# ClawKeeper Multi-Tenancy Guide

## Overview

ClawKeeper is designed as a multi-tenant SaaS platform where each tenant's data is completely isolated from other tenants.

## Isolation Strategy

### Database-Level Isolation (RLS)

Every table includes `tenant_id`:
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ...
);
```

Row-Level Security policies enforce tenant filtering:
```sql
CREATE POLICY invoice_tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id = current_tenant_id());
```

PostgreSQL session variables set per request:
```sql
SET app.current_tenant_id = 'uuid';
SET app.current_user_id = 'uuid';
SET app.current_user_role = 'tenant_admin';
```

### Application-Level Isolation

**API Middleware**:
```typescript
// Extract tenant_id from JWT
const token = decode_jwt(auth_header);
c.set('tenant_id', token.tenant_id);

// Set PostgreSQL session variables
await sql`SET app.current_tenant_id = ${token.tenant_id}`;
```

**Agent Context**:
```typescript
// Every task includes tenant_id
const task: LedgerTaskStar = {
  tenant_id: 'uuid',
  ...
};

// Agents validate tenant access
if (task.tenant_id !== context.tenant_id) {
  throw new Error('Tenant isolation violation');
}
```

## Tenant Onboarding

### 1. Create Tenant

```sql
INSERT INTO tenants (id, name, settings, status)
VALUES (uuid_generate_v4(), 'Acme Corp', '{"currency": "USD"}', 'active');
```

### 2. Create Admin User

```sql
INSERT INTO users (tenant_id, email, password_hash, role, name)
VALUES (
  'tenant-uuid',
  'admin@acme.com',
  '$2a$10$...', -- bcrypt hash
  'tenant_admin',
  'Admin User'
);
```

### 3. Configure Settings

Tenant settings stored in JSONB:
```json
{
  "theme": "light",
  "currency": "USD",
  "timezone": "America/New_York",
  "logo_url": "https://...",
  "primary_color": "#4F46E5",
  "approval_thresholds": {
    "accountant": 100000,
    "tenant_admin": 500000
  },
  "integrations": {
    "plaid": { "enabled": true },
    "quickbooks": { "enabled": false }
  }
}
```

### 4. Provision Resources

- Create default accounts (Checking, Savings)
- Set up default expense categories
- Configure approval workflows

## White-Labeling

### Branding

Tenants can customize:
- **Logo** - Displayed in dashboard header
- **Primary Color** - Applied to buttons, links
- **Favicon** - Browser tab icon
- **Email Templates** - Invoice emails, reminders

### Implementation

**CSS Variables** (applied per tenant):
```css
:root {
  --primary: <tenant.settings.primary_color>;
}
```

**Logo**:
```tsx
<img src={tenant.settings.logo_url || '/default-logo.png'} />
```

**Custom Domain** (future):
- `ledger.acme.com` → `tenant_id: acme-uuid`
- `bookkeeping.widgetco.com` → `tenant_id: widgetco-uuid`

## Access Control

### Roles

| Role | Permissions |
|------|------------|
| super_admin | All tenants, all permissions |
| tenant_admin | Own tenant, all permissions |
| accountant | Own tenant, read/write financial data |
| viewer | Own tenant, read-only |

### Permission Matrix

| Action | super_admin | tenant_admin | accountant | viewer |
|--------|-------------|--------------|------------|--------|
| View invoices | All tenants | Own tenant | Own tenant | Own tenant |
| Create invoices | Yes | Yes | Yes | No |
| Approve invoices | Yes | Yes | No | No |
| Pay invoices | Yes | Yes | No | No |
| Delete invoices | Yes | Yes | No | No |
| View reports | All tenants | Own tenant | Own tenant | Own tenant |
| Manage users | All tenants | Own tenant | No | No |
| Manage settings | All tenants | Own tenant | No | No |

### Enforcement

**Database Level** (RBAC):
```sql
GRANT SELECT, INSERT, UPDATE ON invoices TO accountant_role;
-- No DELETE grant for accountants
```

**Application Level** (Route Guards):
```typescript
if (!['tenant_admin', 'super_admin'].includes(user_role)) {
  return c.json({ error: 'Insufficient permissions' }, 403);
}
```

**UI Level** (Conditional Rendering):
```tsx
{user.role === 'tenant_admin' && (
  <Button onClick={delete_invoice}>Delete</Button>
)}
```

## Data Segregation

### Storage Segregation

All tables partitioned by `tenant_id`:
- Invoices per tenant
- Transactions per tenant
- Reports per tenant
- Audit logs per tenant

### Compute Segregation

Agent tasks are tenant-scoped:
- Each task has `tenant_id`
- Agent runtime validates tenant access
- Results returned only to requesting tenant

### Integration Segregation

External integrations per tenant:
- Each tenant has own Plaid credentials
- Each tenant has own Stripe account
- Each tenant has own QuickBooks/Xero connection

## Tenant Limits

### Default Limits

| Resource | Limit |
|----------|-------|
| Users per tenant | 100 |
| Invoices per month | 1,000 |
| Transactions per month | 10,000 |
| API requests per hour | 500 |
| Storage per tenant | 10 GB |

### Enforcement

```typescript
// Check invoice count
const count = await sql`
  SELECT COUNT(*) FROM invoices 
  WHERE tenant_id = ${tenant_id}
  AND created_at > NOW() - INTERVAL '30 days'
`;

if (count > tenant.limits.invoices_per_month) {
  throw new Error('Monthly invoice limit exceeded');
}
```

## Tenant Deletion

### Soft Delete

```sql
UPDATE tenants
SET status = 'deleted',
    deleted_at = NOW()
WHERE id = $1;
```

### Data Retention

- **Audit logs**: Retained for 7 years
- **Financial data**: Retained for 7 years
- **User data**: Anonymized after 30 days

### Hard Delete (after retention period)

```sql
-- Delete all tenant data
DELETE FROM invoices WHERE tenant_id = $1;
DELETE FROM transactions WHERE tenant_id = $1;
DELETE FROM accounts WHERE tenant_id = $1;
-- ... all tables
DELETE FROM tenants WHERE id = $1;
```

## Cross-Tenant Features

### Super Admin Dashboard

Super admins can:
- View all tenants
- Switch between tenants
- Manage tenant settings
- View system-wide metrics

### Tenant Analytics

Aggregate (anonymized) data across tenants:
- Average invoices processed per month
- Common expense categories
- Average reconciliation time
- Most used integrations

**Privacy**: No tenant-identifying information in aggregates.

## Security Best Practices

1. **Always filter by tenant_id** - Even with RLS, defense in depth
2. **Validate tenant access** - Before any operation
3. **Log all cross-tenant actions** - Super admin actions logged
4. **Encrypt sensitive fields** - API keys, credentials
5. **Audit tenant isolation** - Regular automated tests

## Testing Multi-Tenancy

### Create Test Tenants

```bash
# Create tenant A
psql $DATABASE_URL -c "INSERT INTO tenants (id, name) VALUES ('tenant-a-uuid', 'Tenant A');"

# Create tenant B
psql $DATABASE_URL -c "INSERT INTO tenants (id, name) VALUES ('tenant-b-uuid', 'Tenant B');"

# Create test data for each
```

### Verify Isolation

```typescript
// Login as Tenant A user
const token_a = await login('user-a@tenant-a.com', 'password');

// Query invoices
const invoices_a = await get_invoices(token_a);

// Should only return Tenant A's invoices, not Tenant B's
assert(invoices_a.every(inv => inv.tenant_id === 'tenant-a-uuid'));
```

---

Multi-tenancy is foundational to ClawKeeper's architecture. Never compromise tenant isolation.
