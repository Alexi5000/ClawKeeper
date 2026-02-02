# ClawKeeper AI Instructions

## Identity

You are assisting with the **ClawKeeper** project, an autonomous AI bookkeeping system for SMBs.

## Project Context

ClawKeeper is a multi-tenant SaaS platform with 110 AI agents organized as:
- 1 CEO Agent (ClawKeeper)
- 9 C-Level Orchestrators (CFO, AP Lead, AR Lead, etc.)
- 100 Specialized Workers (grouped under orchestrators)

## Tech Stack

- **Runtime**: Bun (JavaScript/TypeScript)
- **Backend**: Hono API server, PostgreSQL with RLS/RBAC
- **Frontend**: React + Vite + Tailwind + Shadcn
- **AI**: Anthropic Claude via SDK
- **Agents**: Clawd framework (Markdown-based) + TypeScript implementations
- **State**: Zustand (client), React Query (server)
- **Integrations**: Plaid, Stripe, QuickBooks, Xero

## Code Conventions

### Naming
- **Variables/Functions**: snake_case (e.g., `get_invoices`, `tenant_id`)
- **Components**: PascalCase (e.g., `InvoiceList`, `DashboardPage`)
- **Files**: kebab-case for agent directories (e.g., `accounts-payable-lead/`), PascalCase for components

### TypeScript
- Strict mode enabled
- Zod schemas for all domain types
- Explicit return types on functions
- No `any` types
- BigInt for currency amounts (stored as cents)

### File Headers
Every TypeScript file must start with:
```typescript
// file: <path>
// description: <brief description>
// reference: <related files>
```

### Financial Precision
- Store amounts as BigInt (cents): `50000n` = $500.00
- Use `dollars_to_cents()` and `cents_to_dollars()` helpers
- Never use floating point for money calculations
- Display with `format_currency()` helper

### Multi-Tenancy
- Every query includes tenant_id filter
- Use RLS for database-level isolation
- Tenant context set via middleware
- Audit log for all financial actions

## Agent Development

### AGENT.md Structure
```markdown
# AgentName - ClawKeeper Role

## Identity
You are **AgentName**, responsible for...

## Core Responsibilities
1. Primary responsibility
2. Secondary responsibility

## Available Tools/Skills
- skill-name

## Communication
- Concise, professional
- Financial accuracy paramount
```

### SKILL.md Structure
```markdown
---
name: skill-name
description: What this skill does and when to use it
---

# Skill Name

## Triggers
- When user asks for X
- When agent needs Y

## Instructions
Step-by-step execution guide
```

## Database Patterns

### Queries
- Always use parameterized queries (prevent SQL injection)
- Apply RLS context: `SET app.current_tenant_id = $1`
- Include tenant_id in WHERE clauses (defense in depth)

### Migrations
- Version sequentially: `001_initial.sql`, `002_add_feature.sql`
- Idempotent (safe to re-run)
- Rollback scripts included

### Audit Logging
- Triggered automatically on INSERT/UPDATE/DELETE
- Capture full record in JSONB
- Include user_id, timestamp, ip_address

## API Development

### Route Structure
```typescript
app.post('/api/invoices', async (c) => {
  const tenant_id = c.get('tenant_id'); // From middleware
  const input = await c.req.json();
  const validated = InvoiceSchema.parse(input);
  // ... process
  return c.json({ data });
});
```

### Middleware
- Auth: Verify JWT, set user context
- Tenant: Extract tenant_id from user
- RBAC: Check permissions before handler
- Audit: Log after handler

### Error Handling
```typescript
try {
  // ... operation
} catch (error) {
  if (error instanceof ZodError) {
    return c.json({ error: 'Validation failed', details: error.errors }, 400);
  }
  // Log error, return 500
}
```

## UI Development

### Component Patterns
- Functional components with TypeScript
- Shadcn UI components in `components/ui/`
- Feature components in `components/<feature>/`
- Use `cn()` for className merging

### State Management
- Server state: React Query
- Client state: `useState` or Zustand
- No prop drilling (use context or Zustand)

### API Integration
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['invoices', tenant_id],
  queryFn: () => api.get_invoices(),
  refetchInterval: 30000, // 30s
});
```

## Testing

### Unit Tests
- Use Bun test framework
- Test pure functions first
- Mock external APIs
- Financial calculations must have 100% coverage

### Integration Tests
- Test API endpoints with real DB (test schema)
- Verify RLS enforcement
- Check audit log entries

## Security Checklist

- [ ] RLS enabled on table
- [ ] RBAC permissions defined
- [ ] Input validated with Zod
- [ ] Tenant context enforced
- [ ] Audit log entry created
- [ ] PII detection before LLM
- [ ] Rate limiting applied
- [ ] Circuit breaker configured

## Common Tasks

### Add New Agent
1. Create `agents/<name>/AGENT.md`
2. Implement `src/agents/<name>.ts` extending `BaseAgent`
3. Register in `src/agents/index.ts`
4. Add capabilities to `types.ts`
5. Update `AGENTS.md` index

### Add New Skill
1. Create `skills/<name>/SKILL.md`
2. Update `SKILLS.md` index
3. Reference in agent AGENT.md files

### Add New DB Table
1. Define in `db/schema.sql`
2. Add RLS policies in `db/rls.sql`
3. Add RBAC grants in `db/rbac.sql`
4. Create Zod schema in `src/core/types.ts`
5. Run migration

### Add New API Endpoint
1. Define route in `src/api/routes/<feature>.ts`
2. Add Zod input schema
3. Implement handler with tenant context
4. Add to API documentation

## References

- [Bun Docs](https://bun.sh/docs)
- [Hono Docs](https://hono.dev)
- [Zod Docs](https://zod.dev)
- [Shadcn UI](https://ui.shadcn.com)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## Questions to Ask

When implementing features, verify:
1. Which tenant is this for? (tenant_id)
2. What role does the user have? (RBAC check)
3. Does this need an audit log entry? (financial actions)
4. What's the failure mode? (circuit breaker, retry, escalate)
5. How is this tested? (unit, integration, manual)

---

Follow these guidelines to maintain ClawKeeper's security, precision, and reliability.
