# ClawKeeper

**Autonomous AI Bookkeeping for Small and Medium Businesses**

ClawKeeper is a production-grade multi-tenant AI agent system that automates bookkeeping, invoice processing, bank reconciliation, and financial reporting for SMBs.

## 🌟 Features

- **One-Prompt Deployment** - Deploy 110 AI agents with a single natural language command
- **Autonomous Invoice Processing** - AI-powered OCR, validation, and categorization
- **Bank Reconciliation** - Automatic transaction matching and discrepancy detection
- **Financial Reporting** - P&L, Balance Sheet, Cash Flow, and custom reports
- **Multi-Tenant Architecture** - Complete tenant isolation with RLS and RBAC
- **110-Agent System** - CEO + 9 orchestrators + 100 specialized workers
- **DeepSeek AI Integration** - Cost-efficient AI reasoning (10-100x cheaper than alternatives)
- **Real-Time Execution Streaming** - Watch agents work in real-time with SSE
- **Production Security** - Rate limiting, circuit breakers, audit trails
- **Modern Dashboard** - React/Vite/Tailwind/Shadcn with Command Center UI

## 🏗️ Architecture

```
ClawKeeper CEO
├── CFO Agent (8 workers) - Strategic planning, forecasting
├── Accounts Payable Lead (15 workers) - Invoice processing, payments
├── Accounts Receivable Lead (15 workers) - Customer invoicing, collections
├── Reconciliation Lead (12 workers) - Bank matching, discrepancies
├── Compliance Lead (10 workers) - Tax compliance, audits
├── Reporting Lead (12 workers) - Financial reports
├── Integration Lead (12 workers) - Plaid, Stripe, QuickBooks, Xero
├── Data/ETL Lead (10 workers) - Data import, transformation
└── Support Lead (6 workers) - User assistance, error recovery
```

## 🚀 Quick Start

**📖 See [STARTUP.md](./STARTUP.md) for detailed instructions and troubleshooting.**

### Prerequisites

- **Bun** >= 1.0.0
- **PostgreSQL** >= 14
- **DeepSeek API Key** - Get from https://platform.deepseek.com/api_keys

### Default Ports

- **API Server:** 9100
- **Dashboard:** 3000  
- **PostgreSQL:** 5432

### 1. Clone and Install

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd clawkeeper
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Add your DeepSeek API key to .env
```

**Required:** Set `DEEPSEEK_API_KEY` in `.env`

### 3. Setup Database

```bash
# Quick setup (creates schema + demo users)
bun run setup:full
```

Or manually:
```bash
createdb clawkeeper
bun run db:setup
bun run setup:demo
```

### 4. Start Services

```bash
# Terminal 1: Start API server
bun run dev

# Terminal 2: Start dashboard
bun run dashboard:dev
```

### 5. Access Dashboard

Open http://localhost:3000

**Demo Login:**
- Email: `admin@demo.com`
- Password: `password123`

### 6. Test Command Center

1. Navigate to **Command Center** in the sidebar
2. Enter: `"Generate monthly P&L report and reconcile all accounts"`
3. Click **"Create Execution Plan"**
4. Review the task decomposition
5. Click **"Execute Plan"**
6. Watch 110 AI agents collaborate in real-time!

## 📁 Project Structure

```
ClawKeeper/
├── agents/              # 110 agent definitions (Clawd framework)
├── skills/              # 8 core skills
├── src/                 # TypeScript source
│   ├── core/           # Types, orchestrator, scheduler
│   ├── agents/         # Agent implementations
│   ├── integrations/   # Plaid, Stripe, QuickBooks, Xero
│   ├── memory/         # Memory system
│   ├── guardrails/     # Security & validation
│   └── api/            # Hono API server
├── db/                  # Database schema, RLS, RBAC
├── dashboard/           # React admin dashboard
├── config/              # Clawdbot configurations
└── scripts/             # Deploy and utility scripts
```

## 🔐 Security

- **Row-Level Security (RLS)** - Tenant data isolation at database level
- **Role-Based Access Control (RBAC)** - 4 roles: super_admin, tenant_admin, accountant, viewer
- **Audit Trail** - Immutable log of all financial actions
- **Rate Limiting** - Per-tenant and per-endpoint limits
- **Circuit Breaker** - Protection for external APIs
- **Input Validation** - Zod schemas for all API inputs
- **PII Detection** - Prevents sensitive data leakage to LLMs

## 🎯 Deployment

Runs as independent CEO agent:
```bash
./scripts/deploy.sh
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - New user registration

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices/upload` - Upload invoice for processing
- `POST /api/invoices/:id/approve` - Approve invoice
- `POST /api/invoices/:id/pay` - Mark as paid

### Reports
- `GET /api/reports/:type` - Generate financial report
- Types: `profit_loss`, `balance_sheet`, `cash_flow`, `ap_aging`, `ar_aging`

### Reconciliation
- `POST /api/reconciliation/start` - Start reconciliation task
- `GET /api/reconciliation/:id/status` - Check status

### Real-Time
- `WS /ws` - WebSocket for live updates

## 🧪 Testing

```bash
# Run all tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint
```

## 📖 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Reference](./docs/API.md)
- [Multi-Tenancy](./docs/MULTI-TENANCY.md)

## 🛠️ Development

### Adding a New Agent

1. Create `agents/<name>/AGENT.md`
2. Implement `src/agents/<name>.ts`
3. Register in `src/agents/index.ts`
4. Deploy: `./scripts/deploy.sh`

### Adding a New Skill

1. Create `skills/<name>/SKILL.md`
2. Update `SKILLS.md` index
3. Deploy: `./scripts/deploy.sh`

## 🔗 Integrations

- **Plaid** - Bank account connections
- **Stripe** - Payment processing
- **QuickBooks** - Accounting software sync
- **Xero** - Accounting software sync
- **Google Document AI** - OCR for invoices

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

---

Built with Bun, TypeScript, React, and DeepSeek AI
