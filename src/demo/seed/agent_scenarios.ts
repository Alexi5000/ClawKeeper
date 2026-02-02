// file: src/demo/seed/agent_scenarios.ts
// description: Seed agent test scenarios
// reference: seed/index.ts

import type { Sql } from 'postgres';

export async function seed_agent_scenarios(
  sql: Sql<Record<string, unknown>>,
  tenant_id: string,
  scenarios: any[]
): Promise<void> {
  // Store scenarios in tenant settings for now
  // In future, could create dedicated agent_scenarios table
  
  await sql`
    UPDATE tenants
    SET settings = settings || ${{ agent_scenarios: scenarios }}::jsonb
    WHERE id = ${tenant_id}
  `;
  
  // Also create sample agent_runs entries to show historical activity
  const agent_ids = [
    'clawkeeper', 'cfo', 'accounts_payable_lead', 'accounts_receivable_lead',
    'reconciliation_lead', 'compliance_lead', 'reporting_lead',
    'integration_lead', 'data_etl_lead', 'support_lead',
    'invoice_parser', 'transaction_matcher', 'collections_agent'
  ];
  
  for (let i = 0; i < 500; i++) {
    const agent_id = agent_ids[Math.floor(Math.random() * agent_ids.length)];
    const days_ago = Math.floor(Math.random() * 90);
    const started = new Date('2025-02-01');
    started.setDate(started.getDate() - days_ago);
    started.setHours(Math.floor(Math.random() * 24));
    
    const duration_ms = Math.floor(Math.random() * 60000 + 1000); // 1-60 seconds
    const completed = new Date(started);
    completed.setMilliseconds(completed.getMilliseconds() + duration_ms);
    
    const status = Math.random() > 0.05 ? 'completed' : 'failed';
    const tokens_used = Math.floor(Math.random() * 5000 + 500);
    const cost = tokens_used * 0.000015; // $15 per 1M tokens
    
    await sql`
      INSERT INTO agent_runs (
        tenant_id, agent_id, task_id, status,
        started_at, completed_at, duration_ms,
        tokens_used, cost, error
      )
      VALUES (
        ${tenant_id},
        ${agent_id},
        gen_random_uuid(),
        ${status},
        ${started.toISOString()},
        ${completed.toISOString()},
        ${duration_ms},
        ${tokens_used},
        ${cost},
        ${status === 'failed' ? 'Task timeout or external API error' : null}
      )
    `;
  }
}
