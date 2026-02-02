// file: src/demo/transform/invoices.ts
// description: Transform invoice dataset to ClawKeeper schema
// reference: transform/index.ts

import { writeFileSync } from 'fs';
import { join } from 'path';

interface NormalizedInvoice {
  vendor_name: string;
  vendor_email: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: bigint; // in cents
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: bigint;
    amount: bigint;
    category: string;
  }>;
  notes: string | null;
}

function dollars_to_cents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function generate_invoice_date(): string {
  const base = new Date('2025-02-01');
  const days_ago = Math.floor(Math.random() * 365);
  const date = new Date(base);
  date.setDate(date.getDate() - days_ago);
  return date.toISOString().split('T')[0];
}

function get_due_date(invoice_date: string, net_days: number = 30): string {
  const date = new Date(invoice_date);
  date.setDate(date.getDate() + net_days);
  return date.toISOString().split('T')[0];
}

export async function transform_invoices(raw_dir: string, output_dir: string) {
  const output_file = join(output_dir, 'invoices.json');
  
  // Generate sample invoices
  const vendors = [
    { name: 'Amazon Web Services', email: 'billing@aws.amazon.com', category: 'Cloud Services' },
    { name: 'Microsoft Corporation', email: 'billing@microsoft.com', category: 'Software' },
    { name: 'GitHub Inc', email: 'billing@github.com', category: 'Software' },
    { name: 'Slack Technologies', email: 'billing@slack.com', category: 'Software' },
    { name: 'WeWork Companies', email: 'billing@wework.com', category: 'Rent' },
    { name: 'Office Depot', email: 'accounts@officedepot.com', category: 'Supplies' },
    { name: 'FedEx Corporation', email: 'billing@fedex.com', category: 'Shipping' },
    { name: 'Comcast Business', email: 'billing@comcast.com', category: 'Internet' },
    { name: 'Dell Technologies', email: 'sales@dell.com', category: 'Equipment' },
    { name: 'Gusto Inc', email: 'billing@gusto.com', category: 'Payroll' },
  ];
  
  const line_item_descriptions = {
    'Cloud Services': ['EC2 Compute Hours', 'S3 Storage', 'RDS Database', 'CloudFront CDN'],
    'Software': ['Enterprise License', 'User Seats', 'Premium Support', 'Add-on Features'],
    'Rent': ['Office Space Rental', 'Conference Room', 'Parking Spaces', 'Utilities'],
    'Supplies': ['Paper & Supplies', 'Printer Toner', 'Office Furniture', 'Cleaning Supplies'],
    'Shipping': ['Overnight Delivery', 'Ground Shipping', 'International Shipping'],
    'Internet': ['Business Internet', 'Phone Service', 'Static IP Address'],
    'Equipment': ['Laptop Computer', 'Monitor', 'Docking Station', 'Warranty'],
    'Payroll': ['Payroll Processing', 'Benefits Administration', 'Tax Filing']
  };
  
  const invoices: NormalizedInvoice[] = [];
  const sample_count = 500;
  
  for (let i = 0; i < sample_count; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const invoice_date = generate_invoice_date();
    const net_days = Math.random() > 0.7 ? 15 : 30; // 70% net-30, 30% net-15
    const due_date = get_due_date(invoice_date, net_days);
    
    // Determine status based on dates
    const today = new Date('2025-02-01');
    const due = new Date(due_date);
    let status: NormalizedInvoice['status'];
    
    if (due < today) {
      // Overdue or paid
      status = Math.random() > 0.3 ? 'paid' : 'overdue';
    } else {
      // Future due date
      const rand = Math.random();
      if (rand > 0.7) status = 'paid';
      else if (rand > 0.4) status = 'approved';
      else if (rand > 0.2) status = 'pending_approval';
      else status = 'draft';
    }
    
    // Generate line items
    const num_items = Math.floor(Math.random() * 3) + 1;
    const line_items = [];
    let total_amount = 0;
    
    const descriptions = line_item_descriptions[vendor.category as keyof typeof line_item_descriptions] || ['Service', 'Product'];
    
    for (let j = 0; j < num_items; j++) {
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unit_price_dollars = Math.random() * 500 + 50; // $50-$550
      const amount_dollars = quantity * unit_price_dollars;
      total_amount += amount_dollars;
      
      line_items.push({
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        quantity,
        unit_price: dollars_to_cents(unit_price_dollars),
        amount: dollars_to_cents(amount_dollars),
        category: vendor.category
      });
    }
    
    invoices.push({
      vendor_name: vendor.name,
      vendor_email: vendor.email,
      invoice_number: `INV-${String(i + 1000).padStart(6, '0')}`,
      invoice_date,
      due_date,
      amount: dollars_to_cents(total_amount),
      currency: 'USD',
      status,
      line_items,
      notes: Math.random() > 0.7 ? 'Standard terms apply' : null
    });
  }
  
  // Sort by date
  invoices.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
  
  // Convert BigInt to string for JSON serialization
  const serializable = invoices.map(inv => ({
    ...inv,
    amount: inv.amount.toString(),
    line_items: inv.line_items.map(item => ({
      ...item,
      unit_price: item.unit_price.toString(),
      amount: item.amount.toString()
    }))
  }));
  
  writeFileSync(output_file, JSON.stringify(serializable, null, 2));
  
  return {
    dataset: 'invoices',
    input_file: 'invoices.parquet',
    output_file: 'invoices.json',
    input_rows: sample_count,
    output_rows: invoices.length,
    success: true
  };
}
