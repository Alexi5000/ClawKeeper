// file: src/api/routes/dashboard.ts
// description: Dashboard summary API endpoints
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { agent_runtime } from '../../agents';

export function create_dashboard_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono();

  // GET /api/dashboard/summary
  app.get('/summary', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      // Get invoices summary
      const [invoice_stats] = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status IN ('pending_approval', 'approved', 'overdue') THEN amount ELSE 0 END), 0) as outstanding_amount,
          COUNT(CASE WHEN status IN ('pending_approval', 'approved', 'overdue') THEN 1 END) as outstanding_count,
          COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_tasks
        FROM invoices
        WHERE tenant_id = ${tenant_id}
      `;

      // Get bank balance
      const [account_stats] = await sql`
        SELECT COALESCE(SUM(balance), 0) as total_balance
        FROM accounts
        WHERE tenant_id = ${tenant_id}
      `;

      // Get cash flow for last 6 months
      const cash_flow = await sql`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') as month,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as inflow,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as outflow
        FROM transactions
        WHERE tenant_id = ${tenant_id}
          AND date >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY DATE_TRUNC('month', date) DESC
        LIMIT 6
      `;

      // Get agent summary
      const agent_counts = agent_runtime.get_agent_count();
      const all_profiles = agent_runtime.get_all_profiles();
      const agent_summary = {
        total: agent_counts.total,
        active: all_profiles.filter(p => p.status === 'busy').length,
        idle: all_profiles.filter(p => p.status === 'idle').length,
        offline: all_profiles.filter(p => p.status === 'offline').length,
      };

      return c.json({
        total_revenue: invoice_stats.total_revenue,
        outstanding_invoices: {
          count: invoice_stats.outstanding_count,
          amount: invoice_stats.outstanding_amount,
        },
        bank_balance: account_stats.total_balance,
        pending_tasks: invoice_stats.pending_tasks,
        cash_flow: cash_flow.reverse().map(row => ({
          month: row.month,
          inflow: row.inflow,
          outflow: row.outflow,
        })),
        agent_summary,
      });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      return c.json({ error: 'Failed to fetch dashboard summary' }, 500);
    }
  });

  return app;
}
