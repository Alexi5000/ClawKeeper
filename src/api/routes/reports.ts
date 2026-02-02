// file: src/api/routes/reports.ts
// description: Financial reporting routes for ClawKeeper API
// reference: src/core/types.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import type { AppEnv } from '../../types/hono';

export function report_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // Generate financial report
  app.post('/:type', async (c) => {
    const report_type = c.req.param('type');
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const { start_date, end_date } = await c.req.json();

    // Generate report based on type
    let report_data: Record<string, unknown> = {};

    if (report_type === 'profit_loss') {
      // Revenue
      const [revenue_result] = await sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE tenant_id = ${tenant_id}
        AND date BETWEEN ${start_date} AND ${end_date}
        AND category = 'income'
      `;

      // Expenses by subcategory
      const expenses = await sql`
        SELECT subcategory, COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE tenant_id = ${tenant_id}
        AND date BETWEEN ${start_date} AND ${end_date}
        AND category = 'expense'
        GROUP BY subcategory
        ORDER BY total DESC
      `;

      const total_expenses = expenses.reduce((sum, e) => sum + Number(e.total), 0);

      report_data = {
        revenue: Number(revenue_result.total),
        expenses: expenses.map(e => ({
          category: e.subcategory,
          amount: Number(e.total),
        })),
        total_expenses,
        net_income: Number(revenue_result.total) - total_expenses,
      };
    }

    // Store report
    const [report] = await sql`
      INSERT INTO financial_reports (
        id, tenant_id, type, period, data, generated_by
      )
      VALUES (
        ${uuid()},
        ${tenant_id},
        ${report_type},
        ${JSON.stringify({ start_date, end_date, type: 'custom' })},
        ${JSON.stringify(report_data)},
        ${user_id}
      )
      RETURNING *
    `;

    return c.json({
      report: {
        id: report.id,
        type: report_type,
        period: { start_date, end_date },
        data: report_data,
        generated_at: report.generated_at,
      },
    });
  });

  // List reports
  app.get('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    const limit = Number(c.req.query('limit')) || 20;

    const reports = await sql`
      SELECT *
      FROM financial_reports
      WHERE tenant_id = ${tenant_id}
      ORDER BY generated_at DESC
      LIMIT ${limit}
    `;

    return c.json({ data: reports });
  });

  return app;
}
