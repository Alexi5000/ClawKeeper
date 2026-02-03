// file: src/api/routes/metrics.ts
// description: Financial metrics API endpoints
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import type { AppEnv } from '../../types/hono';

export function create_metrics_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // GET /api/metrics/cash-flow
  app.get('/cash-flow', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const period = c.req.query('period') || 'monthly'; // monthly, quarterly, yearly
    const limit = parseInt(c.req.query('limit') || '12');

    try {
      let date_trunc = 'month';
      let interval = '12 months';

      if (period === 'quarterly') {
        date_trunc = 'quarter';
        interval = '2 years';
      } else if (period === 'yearly') {
        date_trunc = 'year';
        interval = '5 years';
      }

      const cash_flow = await sql`
        SELECT 
          TO_CHAR(DATE_TRUNC(${date_trunc}, date), 'Mon YYYY') as period,
          DATE_TRUNC(${date_trunc}, date) as period_date,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as inflow,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as outflow,
          COALESCE(SUM(amount), 0) as net_flow,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE tenant_id = ${tenant_id}
          AND date >= NOW() - INTERVAL ${interval}
        GROUP BY DATE_TRUNC(${date_trunc}, date)
        ORDER BY period_date DESC
        LIMIT ${limit}
      `;

      return c.json({
        period,
        data: cash_flow.reverse().map(row => ({
          period: row.period,
          inflow: row.inflow,
          outflow: row.outflow,
          net_flow: row.net_flow,
          transaction_count: row.transaction_count,
        })),
      });
    } catch (error) {
      console.error('Cash flow metrics error:', error);
      return c.json({ error: 'Failed to fetch cash flow metrics' }, 500);
    }
  });

  return app;
}
