// file: src/api/routes/invoices.ts
// description: Invoice management routes for ClawKeeper API
// reference: src/core/types.ts, src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import type { AppEnv } from '../../types/hono';
import { create_ocr_service } from '../../services/ocr_service';

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

  // Upload invoice for processing with OCR
  app.post('/upload', async (c) => {
    try {
      const tenant_id = c.get('tenant_id');
      if (!tenant_id) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!['accountant', 'tenant_admin', 'super_admin'].includes(c.get('user_role'))) {
        return c.json({ error: 'Invoice upload requires an accountant or administrator' }, 403);
      }

      // Parse multipart form data
      const body = await c.req.parseBody();
      const file = body.file;

      if (!file || typeof file === 'string') {
        return c.json({ error: 'No file uploaded' }, 400);
      }

      // Validate file type
      const allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed_types.includes(file.type)) {
        return c.json({
          error: 'Invalid file type',
          message: `Supported types: ${allowed_types.join(', ')}`,
        }, 400);
      }

      // Validate file size (max 10MB)
      const max_size = 10 * 1024 * 1024;
      if (file.size > max_size) {
        return c.json({
          error: 'File too large',
          message: 'Maximum file size: 10MB',
        }, 400);
      }

      // Read file buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Extract invoice data using OCR
      const ocr_service = create_ocr_service();
      const extracted = await ocr_service.extract_invoice_data(buffer, file.type);

      // Insert invoice into database
      const [invoice] = await sql`
        INSERT INTO invoices (
          tenant_id,
          vendor_name,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          tax,
          total,
          currency,
          status,
          ocr_confidence,
          line_items
        ) VALUES (
          ${tenant_id},
          ${extracted.vendor_name},
          ${extracted.invoice_number},
          ${extracted.date},
          ${extracted.due_date},
          ${extracted.subtotal},
          ${extracted.tax},
          ${extracted.total},
          ${extracted.currency},
          ${extracted.confidence >= 0.8 ? 'pending_approval' : 'needs_review'},
          ${extracted.confidence},
          ${JSON.stringify(extracted.line_items)}
        )
        RETURNING *
      `;

      console.log(`[Invoice Upload] Created invoice ${invoice.id} for tenant ${tenant_id}`);

      return c.json({
        message: 'Invoice uploaded and processed',
        invoice: {
          id: invoice.id,
          vendor_name: invoice.vendor_name,
          invoice_number: invoice.invoice_number,
          total: invoice.total,
          currency: invoice.currency,
          status: invoice.status,
          confidence: invoice.ocr_confidence,
          requires_review: extracted.confidence < 0.8,
        },
        extracted_data: extracted,
      }, 201);
    } catch (error) {
      console.error('[Invoice Upload] Error:', error);
      return c.json({
        error: 'Failed to process invoice',
        message: String(error),
      }, 500);
    }
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
