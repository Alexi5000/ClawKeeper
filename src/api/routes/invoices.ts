// file: src/api/routes/invoices.ts
// description: Invoice management routes for ClawKeeper API
// reference: src/core/types.ts, src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import type { AppEnv } from '../../types/hono';

export function invoice_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // List invoices (tenant-scoped via RLS)
  app.get('/', async (c) => {
    try {
      const tenant_id = c.get('tenant_id');
      const status = c.req.query('status');
      const limit = Number(c.req.query('limit')) || 50;

      let invoices;
      
      if (status) {
        invoices = await sql`
          SELECT *
          FROM invoices
          WHERE tenant_id = ${tenant_id}
          AND status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } else {
        invoices = await sql`
          SELECT *
          FROM invoices
          WHERE tenant_id = ${tenant_id}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      }

      return c.json({ data: invoices });
    } catch (error) {
      console.error('[Invoices] List error:', error);
      return c.json({ error: 'Failed to fetch invoices' }, 500);
    }
  });

  // Upload invoice for processing (NOT IMPLEMENTED)
  app.post('/upload', async (c) => {
    // TODO: Implement file upload with Document AI OCR processing
    return c.json({
      error: 'Invoice upload not yet implemented',
      message: 'This endpoint will support OCR and automatic invoice processing',
    }, 501);
  });

  // Approve invoice
  app.post('/:id/approve', async (c) => {
    try {
      const invoice_id = c.req.param('id');
      const tenant_id = c.get('tenant_id');
      const user_id = c.get('user_id');
      const user_role = c.get('user_role');

      // Check if user has permission to approve
      if (!['tenant_admin', 'super_admin'].includes(user_role)) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }

      // Update invoice status
      const [invoice] = await sql`
        UPDATE invoices
        SET status = 'approved',
            approved_by = ${user_id},
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = ${invoice_id}
        AND tenant_id = ${tenant_id}
        AND status = 'pending_approval'
        RETURNING *
      `;

      if (!invoice) {
        return c.json({ error: 'Invoice not found or not in pending_approval status' }, 404);
      }

      return c.json({
        message: 'Invoice approved',
        invoice,
      });
    } catch (error) {
      console.error('[Invoices] Approve error:', error);
      return c.json({ error: 'Failed to approve invoice' }, 500);
    }
  });

  // Pay invoice
  app.post('/:id/pay', async (c) => {
    try {
      const invoice_id = c.req.param('id');
      const tenant_id = c.get('tenant_id');
      const user_id = c.get('user_id');
      const user_role = c.get('user_role');
      const { payment_method = 'stripe' } = await c.req.json();

      // Check permissions
      if (!['tenant_admin', 'super_admin'].includes(user_role)) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }

      // Get invoice
      const [invoice] = await sql`
        SELECT *
        FROM invoices
        WHERE id = ${invoice_id}
        AND tenant_id = ${tenant_id}
        AND status = 'approved'
      `;

      if (!invoice) {
        return c.json({ error: 'Invoice not found or not approved' }, 404);
      }

      // Process payment (via payment-gateway skill)
      // For now, just update status
      const [paid_invoice] = await sql`
        UPDATE invoices
        SET status = 'paid',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ${invoice_id}
        RETURNING *
      `;

      return c.json({
        message: 'Payment processed',
        invoice: paid_invoice,
        payment_method,
      });
    } catch (error) {
      console.error('[Invoices] Payment error:', error);
      return c.json({ error: 'Failed to process payment' }, 500);
    }
  });

  return app;
}
