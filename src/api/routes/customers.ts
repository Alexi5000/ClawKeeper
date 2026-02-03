// file: src/api/routes/customers.ts
// description: Customer CRUD API endpoints
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import type { AppEnv } from '../../types/hono';

export function create_customer_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // GET /api/customers
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

      const customers = await sql`
        SELECT *
        FROM customers
        ${where_clause}
        ORDER BY name
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count
        FROM customers
        ${where_clause}
      `;

      return c.json({
        customers,
        total: count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Customers list error:', error);
      return c.json({ error: 'Failed to fetch customers' }, 500);
    }
  });

  // GET /api/customers/:id
  app.get('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const customer_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const [customer] = await sql`
        SELECT *
        FROM customers
        WHERE id = ${customer_id} AND tenant_id = ${tenant_id}
      `;

      if (!customer) {
        return c.json({ error: 'Customer not found' }, 404);
      }

      return c.json(customer);
    } catch (error) {
      console.error('Customer details error:', error);
      return c.json({ error: 'Failed to fetch customer' }, 500);
    }
  });

  // POST /api/customers
  app.post('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, email, phone, address, credit_limit, payment_terms, tax_id, website, notes } = body;

    try {
      const [customer] = await sql`
        INSERT INTO customers (
          tenant_id, name, email, phone, address, credit_limit, payment_terms, tax_id, website, notes
        )
        VALUES (
          ${tenant_id}, ${name}, ${email}, ${phone}, ${JSON.stringify(address || {})},
          ${credit_limit || 0}, ${payment_terms || 30}, ${tax_id}, ${website}, ${notes}
        )
        RETURNING *
      `;

      return c.json(customer, 201);
    } catch (error) {
      console.error('Customer creation error:', error);
      return c.json({ error: 'Failed to create customer' }, 500);
    }
  });

  // PUT /api/customers/:id
  app.put('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const customer_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, email, phone, address, credit_limit, payment_terms, status, tax_id, website, notes } = body;

    try {
      const [customer] = await sql`
        UPDATE customers
        SET 
          name = COALESCE(${name}, name),
          email = COALESCE(${email}, email),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${JSON.stringify(address)}, address),
          credit_limit = COALESCE(${credit_limit}, credit_limit),
          payment_terms = COALESCE(${payment_terms}, payment_terms),
          status = COALESCE(${status}, status),
          tax_id = COALESCE(${tax_id}, tax_id),
          website = COALESCE(${website}, website),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${customer_id} AND tenant_id = ${tenant_id}
        RETURNING *
      `;

      if (!customer) {
        return c.json({ error: 'Customer not found' }, 404);
      }

      return c.json(customer);
    } catch (error) {
      console.error('Customer update error:', error);
      return c.json({ error: 'Failed to update customer' }, 500);
    }
  });

  // DELETE /api/customers/:id
  app.delete('/:id', async (c) => {
    const tenant_id = c.get('tenant_id');
    const customer_id = c.req.param('id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const [customer] = await sql`
        DELETE FROM customers
        WHERE id = ${customer_id} AND tenant_id = ${tenant_id}
        RETURNING id
      `;

      if (!customer) {
        return c.json({ error: 'Customer not found' }, 404);
      }

      return c.json({ message: 'Customer deleted', id: customer.id });
    } catch (error) {
      console.error('Customer deletion error:', error);
      return c.json({ error: 'Failed to delete customer' }, 500);
    }
  });

  return app;
}
