# ClawKeeper Security Model

ClawKeeper v2.0 treats every finance-agent action as a **tenant-scoped OpenClaw agent operation**. The application does not assume that an LLM response is safe, authorized, or final. Instead, every task passes through deterministic policy checks before an agent can execute tools, mutate books, synchronize accounts, or move money.

| Boundary | Control | v2.0 Behavior |
|---|---|---|
| Tenant isolation | Tenant ID comparison and role-aware override | A task can run only inside the authenticated tenant unless the caller is a platform `super_admin`. |
| Capability authorization | Agent capability allowlist | The selected agent must possess every requested capability before execution. |
| Financial risk | OpenClaw capability policy | Payment processing, payment gateway changes, bank sync, accounting sync, and invoice approval require explicit approval. |
| Prompt injection | Deterministic pattern screening | Attempts to bypass approvals, disable guardrails, reveal prompts, or exfiltrate secrets are denied before execution. |
| PII and secrets | Redacted audit payloads | Audit envelopes redact email addresses, card-like numbers, SSNs, tokens, API keys, passwords, and credentials. |
| Auditability | Policy-decision audit envelope | Every policy decision includes task, tenant, user, capability, status, risk tier, approval, and timestamp metadata. |

The v2.0 security posture is intentionally conservative. Low-risk reporting and support tasks may run autonomously, while high-risk financial operations require human approval metadata. This makes ClawKeeper suitable for building toward production SMB finance automation without presenting the current repository as an unbounded payment robot.

## OpenClaw-Native Runtime Boundary

The OpenClaw manifest in `src/openclaw/manifest.ts` describes the ClawKeeper application as an agent control plane with a CEO agent, finance orchestrators, capability policies, sandbox posture, and audit requirements. The policy engine in `src/openclaw/policy.ts` is deterministic and testable. It is deliberately separate from LLM prompting so the same guardrails apply regardless of model provider.

## Required Approval Pattern

Financial actions that can create obligations, alter books of record, read sensitive bank data, or initiate payments must include an approval identifier in task parameters. The backend treats this as a policy input. A production deployment should back this identifier with a signed approval record, approver identity, amount boundary, expiration, and immutable audit row.

## Non-Goals for v2.0

ClawKeeper v2.0 does not claim to autonomously initiate production bank payments without human approval. It also does not claim live Plaid, Stripe, QuickBooks, or Xero writeback through the proof path. Python remains optional for demo data tooling; the agent control plane, policy engine, API routes, FDE harness, proof scripts, and tests live in TypeScript.

## v2.0 Proof Evidence

The security claims above are backed by:

- Policy and audit tests in `npm run quality`.
- Deterministic finance-agent scenarios in `npm run fde:benchmark`.
- Redacted synthetic audit evidence in `docs/proof/v2.0/audit-evidence.json`.
- Proof-bundle validation in `npm run proof:v2:validate`.
