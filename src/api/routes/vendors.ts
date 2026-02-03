// file: src/api/routes/vendors.ts
// description: Vendor CRUD API endpoints
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import type { AppEnv } from '../../types/hono';

export function create_vendor_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // GET /api/vendors
  app.get('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const status = c.req.query('status');
    const search = c.req.query('search');

    try {
      let where_clause = sql`WHERE tenant_id = ${tenant_id}`;

      if (status) {
        where_clause = sql`${where_clause} AND status = ${status}`;
      }

      if (search) {
        where_clause = sql`${where_clause} AND (name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})`;
      }

      const vendors = await sql`
        SELECT *
        FROM vendors
        ${where_clause}
        ORDER BY name
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count
        FROM vendors
        ${where_clause}
      `;

      return c.json({
        vendors,
        total: count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Vendors list error:', error);
      return c.json({ error: 'Failed to fetch vendors' }, 500);
    }
  });

  // GET /api/vendors/:id
  app.get('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const vendor_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const [vendor] = await sql`
        SELECT *
        FROM vendors
        WHERE id = ${vendor_id} AND tenant_id = ${tenant_id}
      `;

      if (!vendor) {
        return c.json({ error: 'Vendor not found' }, 404);
      }

      // Get related invoices
      const invoices = await sql`
        SELECT *
        FROM invoices
        WHERE vendor_name = ${vendor.name} AND tenant_id = ${tenant_id}
        ORDER BY invoice_date DESC
        LIMIT 20
      `;

      return c.json({
        ...vendor,
        invoices,
      });
    } catch (error) {
      console.error('Vendor details error:', error);
      return c.json({ error: 'Failed to fetch vendor' }, 500);
    }
  });

  // POST /api/vendors
  app.post('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, email, phone, address, payment_terms, tax_id, website, notes } = body;

    try {
      const [vendor] = await sql`
        INSERT INTO vendors (
          tenant_id, name, email, phone, address, payment_terms, tax_id, website, notes
        )
        VALUES (
          ${tenant_id}, ${name}, ${email}, ${phone}, ${JSON.stringify(address || {})},
          ${payment_terms || 30}, ${tax_id}, ${website}, ${notes}
        )
        RETURNING *
      `;

      return c.json(vendor, 201);
    } catch (error) {
      console.error('Vendor creation error:', error);
      return c.json({ error: 'Failed to create vendor' }, 500);
    }
  });

  // PUT /api/vendors/:id
  app.put('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const vendor_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, email, phone, address, payment_terms, status, tax_id, website, notes } = body;

    try {
      const [vendor] = await sql`
        UPDATE vendors
        SET 
          name = COALESCE(${name}, name),
          email = COALESCE(${email}, email),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${JSON.stringify(address)}, address),
          payment_terms = COALESCE(${payment_terms}, payment_terms),
          status = COALESCE(${status}, status),
          tax_id = COALESCE(${tax_id}, tax_id),
          website = COALESCE(${website}, website),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${vendor_id} AND tenant_id = ${tenant_id}
        RETURNING *
      `;

      if (!vendor) {
        return c.json({ error: 'Vendor not found' }, 404);
      }

      return c.json(vendor);
    } catch (error) {
      console.error('Vendor update error:', error);
      return c.json({ error: 'Failed to update vendor' }, 500);
    }
  });

  // DELETE /api/vendors/:id
  app.delete('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const vendor_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const [vendor] = await sql`
        DELETE FROM vendors
        WHERE id = ${vendor_id} AND tenant_id = ${tenant_id}
        RETURNING id
      `;

      if (!vendor) {
        return c.json({ error: 'Vendor not found' }, 404);
      }

      return c.json({ message: 'Vendor deleted', id: vendor.id });
    } catch (error) {
      console.error('Vendor deletion error:', error);
      return c.json({ error: 'Failed to delete vendor' }, 500);
    }
  });

  return app;
}
