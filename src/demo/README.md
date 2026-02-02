# ClawKeeper Demo Data

This directory contains tools and data for generating realistic demo/seed data for ClawKeeper development and testing.

## Purpose

The demo data system provides:
- **Realistic test data** for development without real customer information
- **Agent scenario testing** for validating agent behaviors
- **Integration testing** with sample Plaid, Stripe, and QuickBooks data
- **Demo environment** for showcasing ClawKeeper capabilities

## Directory Structure

```
demo/
├── README.md                  # This file
├── download/                  # External dataset downloads (dev only)
│   ├── download_datasets.py  # Python script to fetch public datasets
│   └── requirements.txt       # Python dependencies
├── generate/                  # Synthetic data generators
│   ├── index.ts              # Main orchestrator
│   ├── company_profile.ts    # Company metadata
│   ├── chart_of_accounts.ts  # Account structure
│   ├── vendors.ts            # Vendor records
│   ├── customers.ts          # Customer records
│   ├── budgets.ts            # Budget data
│   ├── tax_filings.ts        # Tax records
│   ├── integrations.ts       # Plaid, Stripe, QuickBooks data
│   └── scenarios.ts          # Agent test scenarios
├── transform/                 # Data transformation utilities
│   ├── index.ts              # Transform orchestrator
│   ├── transactions.ts       # Transaction normalization
│   ├── invoices.ts           # Invoice normalization
│   └── support.ts            # Support ticket normalization
├── seed/                      # Database seeding scripts
│   ├── index.ts              # Main seeder
│   ├── tenant.ts             # Demo tenant creation
│   ├── users.ts              # Demo users
│   ├── accounts.ts           # Chart of accounts
│   ├── invoices.ts           # Sample invoices
│   ├── transactions.ts       # Bank transactions
│   └── agent_scenarios.ts    # Agent test cases
└── data/                      # Generated data output
    └── generated/             # JSON files created by generators
```

## Demo Credentials

### Database Seed Data ([db/seed.sql](../../db/seed.sql))

**Demo Users** (all passwords: `password123`):
- `admin@demo.com` - Tenant Admin (full access)
- `accountant@demo.com` - Accountant (financial operations)
- `viewer@demo.com` - Viewer (read-only access)

### Generated Demo Data ([src/demo/seed/users.ts](seed/users.ts))

**Demo Users** (all passwords: `Demo123!`):
- `admin@meridiantech.example` - Alex Rivera (Tenant Admin)
- `accountant@meridiantech.example` - Jordan Chen (Accountant)
- `viewer@meridiantech.example` - Sam Taylor (Viewer)
- `cfo@meridiantech.example` - Morgan Smith (Accountant)
- `support@meridiantech.example` - Casey Davis (Viewer)

**Demo Tenant**: Meridian Tech Solutions (UUID: auto-generated)

## Usage

### Quick Start (Skip Downloads)

If you already have normalized data or want to use synthetic data only:

```bash
# Generate synthetic data and seed database
bun run demo:quick
```

This runs:
1. `demo:transform` - Transform any existing raw data
2. `demo:generate` - Generate synthetic data
3. `demo:seed` - Seed database with demo data

### Full Setup (With Downloads)

To include external public datasets (for more realistic data):

```bash
# Download, transform, generate, and seed
bun run demo:setup
```

This runs:
1. `demo:download` - Download public financial datasets (Python)
2. `demo:transform` - Normalize downloaded data to ClawKeeper schema
3. `demo:generate` - Generate additional synthetic data
4. `demo:seed` - Seed database with combined data

### Individual Steps

```bash
# 1. Download external datasets (requires Python)
bun run demo:download

# 2. Transform raw data to normalized format
bun run demo:transform

# 3. Generate synthetic demo data
bun run demo:generate

# 4. Seed database
bun run demo:seed
```

## Generated Data

### Company Profile

- **Name**: Meridian Tech Solutions
- **Industry**: B2B SaaS
- **Employees**: 45
- **Annual Revenue**: $5.2M
- **Fiscal Year**: Calendar year

### Chart of Accounts

Standard accounting structure:
- Assets (1000-1999)
- Liabilities (2000-2999)
- Equity (3000-3999)
- Revenue (4000-4999)
- Expenses (5000-5999)

### Vendors (15)

Sample vendors including:
- AWS, Google Cloud (cloud services)
- Office Depot (office supplies)
- Salesforce (software)
- WeWork (facilities)

### Customers (20)

B2B SaaS customers with:
- Monthly recurring revenue
- Annual contracts
- Realistic payment patterns

### Integration Data

**Plaid**: 3 bank accounts with 90 days of transactions  
**Stripe**: 25 customer invoices and subscriptions  
**QuickBooks**: Sample export files  

### Agent Scenarios (50+)

Test cases for:
- Invoice processing
- Bank reconciliation
- Report generation
- Compliance checks
- Error recovery

## Development Guidelines

### Adding New Demo Data

1. Create generator in `generate/` directory
2. Export generator function
3. Add to `generate/index.ts` orchestrator
4. Create seeder in `seed/` directory
5. Add to `seed/index.ts` orchestrator

### Data Principles

- **No real data**: All demo data is synthetic or anonymized
- **Realistic patterns**: Follow real-world business logic
- **Tenant isolated**: All data belongs to demo tenant
- **Reproducible**: Generators use fixed seeds for consistency
- **Safe credentials**: Only use documented test passwords

### Security Notes

**IMPORTANT**: Demo data is for development/testing ONLY:

- ✅ Safe to commit: Generated JSON files, seed scripts
- ✅ Safe to share: Demo credentials (documented test accounts)
- ❌ Never commit: Real API keys, real customer data
- ❌ Never use in prod: Demo passwords, test credentials

All demo passwords are intentionally weak and publicly documented. They should NEVER be used in production environments.

## Cleanup

To reset demo data:

```bash
# Drop and recreate database
dropdb clawkeeper
createdb clawkeeper

# Re-run database setup
bun run db:setup

# Re-seed with demo data
bun run demo:quick
```

## External Dependencies

### Python (for download script)

```bash
cd download
pip install -r requirements.txt
python download_datasets.py
```

Downloads public financial datasets from:
- Kaggle (requires API key in `~/.kaggle/kaggle.json`)
- Government open data portals
- Public financial data repositories

**Note**: Download step is optional. Synthetic generators provide sufficient test data.

## Troubleshooting

### "Dataset not found" errors

Run generators first: `bun run demo:generate`

### "Table does not exist" errors

Run database setup: `bun run db:setup`

### Python dependency issues

The download script is optional. Skip with `bun run demo:quick` instead of `bun run demo:setup`.

## Contributing

When adding demo data:
1. Document all credentials in this README
2. Use realistic but clearly fake data
3. Follow existing generator patterns
4. Add validation checks
5. Update seed scripts accordingly

---

**Last Updated**: February 2, 2026  
**Demo Data Version**: 1.0.0  
**Tenant**: Meridian Tech Solutions (Demo)
