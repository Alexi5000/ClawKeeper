# ClawKeeper Deployment Guide

## Prerequisites

- **Operating System**: WSL2 (Ubuntu) or Linux
- **Runtime**: Bun >= 1.0.0
- **Database**: PostgreSQL >= 14
- **Node.js**: 24.x (for Clawdbot)
- **API Keys**: Anthropic (required), Plaid, Stripe, QuickBooks (optional)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd clawkeeper
```

### 2. Configure Environment

```bash
cd ClawKeeper
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
DATABASE_URL=postgresql://clawkeeper:password@localhost:5432/clawkeeper
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-production-secret-min-32-chars
PLAID_CLIENT_ID=...
STRIPE_SECRET_KEY=...
```

### 3. Install Dependencies

```bash
bun install
cd dashboard && bun install
```

## Database Setup

### Create Database

```bash
createdb clawkeeper
```

### Run Migrations

```bash
# From ClawKeeper root
bun run db:setup
```

This runs:
1. `schema.sql` - Creates tables
2. `rls.sql` - Applies RLS policies
3. `rbac.sql` - Creates roles and grants
4. `seed.sql` - Loads demo data

### Verify Database

```bash
psql clawkeeper -c "SELECT COUNT(*) FROM tenants;"
# Should return 1 (demo tenant)
```

## Deployment

ClawKeeper runs as a standalone CEO agent.

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This:
- Copies config to `~/.clawdbot/`
- Syncs all agents and skills
- Sets up database

**Start Services**:
```bash
# Terminal 1: Clawdbot gateway (started by deploy.sh)
# Already running

# Terminal 2: API server
bun run dev

# Terminal 3: Dashboard
bun run dashboard:dev
```

## Service URLs

| Service | URL |
|---------|-----|
| API Server | http://localhost:4004 |
| Dashboard | http://localhost:5174 |
| Clawdbot Gateway | http://localhost:19789 |
| Control UI | http://localhost:19790 |
| Database | localhost:5432 |

## Health Checks

```bash
cd ./ClawKeeper
chmod +x scripts/health.sh
./scripts/health.sh
```

Checks:
- API server responding
- Dashboard accessible
- Database connected
- Clawdbot gateway (if prod mode)

## Troubleshooting

### API Server Won't Start

```bash
# Check if port 4004 is in use
lsof -i :4004

# Check environment variables
env | grep DATABASE_URL
env | grep ANTHROPIC_API_KEY

# Check logs
bun run dev
# (errors will be displayed)
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
pg_isready -d clawkeeper

# Test connection
psql clawkeeper -c "SELECT 1;"

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database
```

### Dashboard Won't Build

```bash
cd dashboard

# Install dependencies
bun install

# Check for TypeScript errors
bun run typecheck

# Try dev mode
bun run dev
```

### Clawdbot Gateway Issues

```bash
# Check gateway status
clawdbot health

# View logs
clawdbot logs --lines 50

# Restart gateway
clawdbot gateway stop
sleep 2
clawdbot gateway start
```

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to strong random value (min 32 chars)
- [ ] Use production API keys (Plaid: production, Stripe: live)
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up database backups (daily, retained 30 days)
- [ ] Configure monitoring alerts (error rate, queue depth)
- [ ] Review and adjust rate limits per tenant tier
- [ ] Set up log aggregation (e.g., CloudWatch, Datadog)
- [ ] Test multi-tenant isolation thoroughly
- [ ] Perform security audit
- [ ] Load test with expected tenant count

## Scaling

### Vertical Scaling
- Increase PostgreSQL `max_connections`
- Increase `NODE_OPTIONS=--max-old-space-size=8192`
- Use faster CPU for LLM processing

### Horizontal Scaling
- Run multiple API server instances behind load balancer
- Use PostgreSQL read replicas for reporting
- Distribute agents across multiple agent runtimes
- Use Redis for session storage (instead of in-memory)

## Monitoring

### Key Metrics

- API latency (p50, p95, p99)
- Task queue depth
- Task completion rate
- Error rate by endpoint
- LLM token usage per tenant
- Cost per tenant per day
- Database query latency

### Alerts

- Error rate > 5%
- Queue depth > 100
- API latency p95 > 500ms
- Circuit breaker open > 5min
- Database connection pool exhausted
- Disk space < 10%

---

Deploy with confidence. Monitor continuously. Scale as needed.
