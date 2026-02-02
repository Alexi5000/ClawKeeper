// file: src/demo/seed/invoices.ts
// description: Seed demo invoices (AP and AR)
// reference: seed/index.ts

import type { Sql } from 'postgres';

export async function seed_invoices(
  sql: Sql<Record<string, unknown>>,
  tenant_id: string,
  normalized_invoices: any[],
  vendors: any[],
  customers: any[]
): Promise<void> {
  // Seed AP invoices from normalized data
  for (const invoice of normalized_invoices) {
    await sql`
      INSERT INTO invoices (
        tenant_id, vendor_name, vendor_email, invoice_number,
        invoice_date, due_date, amount, currency, status,
        line_items, notes, created_at, updated_at,
        approved_by, approved_at, paid_at
      )
      VALUES (
        ${tenant_id},
        ${invoice.vendor_name},
        ${invoice.vendor_email},
        ${invoice.invoice_number},
        ${invoice.invoice_date}::timestamptz,
        ${invoice.due_date}::timestamptz,
        ${invoice.amount.toString()},
        ${invoice.currency},
        ${invoice.status},
        ${JSON.stringify(invoice.line_items.map((item: any) => ({
          ...item,
          unit_price: item.unit_price.toString(),
          amount: item.amount.toString()
        })))}::jsonb,
        ${invoice.notes},
        NOW(),
        NOW(),
        ${invoice.status === 'approved' || invoice.status === 'paid' ? sql`(SELECT id FROM users WHERE tenant_id = ${tenant_id} AND role = 'tenant_admin' LIMIT 1)` : null},
        ${invoice.status === 'approved' || invoice.status === 'paid' ? sql`NOW() - INTERVAL '5 days'` : null},
        ${invoice.status === 'paid' ? sql`NOW() - INTERVAL '2 days'` : null}
      )
    `;
  }
  
  // Generate AR invoices (customer invoices)
  const ar_count = 300;
  
  for (let i = 0; i < ar_count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const days_ago = Math.floor(Math.random() * 365);
    const invoice_date = new Date('2025-02-01');
    invoice_date.setDate(invoice_date.getDate() - days_ago);
    
    const due_date = new Date(invoice_date);
    due_date.setDate(due_date.getDate() + 30); // Net 30
    
    const is_past_due = due_date < new Date('2025-02-01');
    let status: string;
    
    if (is_past_due) {
      status = Math.random() > 0.2 ? 'paid' : 'overdue';
    } else {
      status = Math.random() > 0.5 ? 'approved' : 'paid';
    }
    
    const amount_dollars = customer.monthly_value * (0.8 + Math.random() * 0.4); // ±20% variance
    const amount_cents = Math.round(amount_dollars * 100);
    
    const line_items = [
      {
        description: `Consulting Services - ${invoice_date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
        quantity: 1,
        unit_price: amount_cents.toString(),
        amount: amount_cents.toString(),
        category: 'Consulting'
      }
    ];
    
    await sql`
      INSERT INTO invoices (
        tenant_id, vendor_name, vendor_email, invoice_number,
        invoice_date, due_date, amount, currency, status,
        line_items, notes, created_at, updated_at
      )
      VALUES (
        ${tenant_id},
        ${customer.name},
        ${customer.email},
        ${'AR-' + String(i + 10000).padStart(6, '0')},
        ${invoice_date.toISOString().split('T')[0]}::timestamptz,
        ${due_date.toISOString().split('T')[0]}::timestamptz,
        ${amount_cents.toString()},
        'USD',
        ${status},
        ${JSON.stringify(line_items)}::jsonb,
        ${`Monthly retainer for ${customer.name}`},
        NOW(),
        NOW()
      )
    `;
  }
}
