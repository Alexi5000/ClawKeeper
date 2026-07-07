# ClawKeeper v2.0 Quickstart

ClawKeeper is an auditable SMB finance-agent control plane. Agents can propose finance work; deterministic policy, tenant boundaries, approval gates, and evidence logs decide what can run.

## 1. Install

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
npm ci
cd dashboard && npm install
cd ..
```

## 2. Verify The Offline Proof

This path does not require a database, provider key, or live integration account.

```bash
npm run quality
cd dashboard && npm run build
cd ..
npm audit --audit-level=moderate
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
npm run demo:offline
```

Expected result:

- Backend typecheck, lint, and tests pass.
- Dashboard production build passes.
- Dependency audit reports 0 moderate-or-higher vulnerabilities.
- FDE benchmark passes 4/4 deterministic finance scenarios.
- Proof bundle validates under `docs/proof/v2.0/`.

## 3. Run The Database-Backed Demo

Docker is required for the local Postgres path.

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
```

Start the API:

```bash
PORT=9100 bun run dev
```

Start the dashboard:

```bash
cd dashboard
npm run dev
```

Open `http://localhost:3000`.

## Demo Credentials

After `npm run demo:db`, use:

```text
Email: admin@meridiantech.example
Password: Demo123!
```

## What v2.0 Proves

- Finance-agent work is evaluated through deterministic policy gates.
- Approval-gated payment intent does not execute payment actions in the proof path.
- Tenant/user evidence is redacted in the proof bundle.
- The dashboard builds as a production artifact.
- CI is configured for backend quality, dashboard build, dependency audit, Docker build, and FDE gates.

## What v2.0 Does Not Claim

- No live payment execution.
- No live Plaid, Stripe, QuickBooks, or Xero writeback in the proof path.
- No real customer data.
- No provider key required for the default proof.

See `docs/proof/v2.0/README.md` for the proof bundle.
