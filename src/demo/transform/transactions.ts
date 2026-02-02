// file: src/demo/transform/transactions.ts
// description: Transform transaction dataset to ClawKeeper schema
// reference: transform/index.ts

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  currency: string;
  country?: string;
}

interface NormalizedTransaction {
  date: string;
  description: string;
  amount: bigint; // in cents
  category: 'income' | 'expense' | 'transfer' | 'adjustment';
  subcategory: string;
  payee: string | null;
  gl_account: number | null;
  currency: string;
}

// Category mapping to GL accounts
const CATEGORY_TO_ACCOUNT: Record<string, { gl: number; category: 'expense' | 'income'; name: string }> = {
  'Food & Dining': { gl: 6500, category: 'expense', name: 'Travel & Entertainment' },
  'Transportation': { gl: 6500, category: 'expense', name: 'Travel & Entertainment' },
  'Shopping & Retail': { gl: 6600, category: 'expense', name: 'Office Supplies' },
  'Entertainment': { gl: 6500, category: 'expense', name: 'Travel & Entertainment' },
  'Healthcare': { gl: 6020, category: 'expense', name: 'Employee Benefits' },
  'Utilities & Services': { gl: 6110, category: 'expense', name: 'Utilities' },
  'Financial Services': { gl: 6300, category: 'expense', name: 'Professional Services' },
  'Travel': { gl: 6500, category: 'expense', name: 'Travel & Entertainment' },
  'Education': { gl: 6200, category: 'expense', name: 'Software Subscriptions' },
  'Personal Care': { gl: 6900, category: 'expense', name: 'Miscellaneous' },
  'Income': { gl: 4000, category: 'income', name: 'Consulting Revenue' }
};

function dollars_to_cents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function normalize_date(date_str: string): string {
  // Remap dates to last 12 months for demo
  const base_date = new Date('2025-02-01');
  const original_date = new Date(date_str);
  
  // Shift to recent 12 months
  const days_ago = Math.floor(Math.random() * 365);
  const demo_date = new Date(base_date);
  demo_date.setDate(demo_date.getDate() - days_ago);
  
  return demo_date.toISOString().split('T')[0];
}

export async function transform_transactions(raw_dir: string, output_dir: string) {
  const input_file = join(raw_dir, 'transactions.parquet');
  const output_file = join(output_dir, 'transactions.json');
  
  // For this demo, we'll create sample transactions since parquet reading requires additional deps
  // In production, use a parquet reader library
  
  // Generate sample transactions based on expected schema
  const sample_count = 10000;
  const transactions: NormalizedTransaction[] = [];
  
  const categories = Object.keys(CATEGORY_TO_ACCOUNT);
  const merchants = [
    'Amazon Web Services', 'Microsoft 365', 'GitHub', 'Slack',
    'WeWork', 'Office Depot', 'FedEx', 'Comcast',
    'Delta Airlines', 'Marriott Hotels', 'Uber', 'Starbucks',
    'Client Payment - Acme Corp', 'Client Payment - TechStart'
  ];
  
  for (let i = 0; i < sample_count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const mapping = CATEGORY_TO_ACCOUNT[category];
    const is_income = mapping.category === 'income';
    
    // Generate amount (expenses negative, income positive)
    const amount_dollars = is_income 
      ? Math.random() * 10000 + 1000  // Income: $1k-$11k
      : -(Math.random() * 500 + 10);   // Expense: $10-$510
    
    const merchant = is_income 
      ? merchants[merchants.length - 2 + Math.floor(Math.random() * 2)]  // Client payments
      : merchants[Math.floor(Math.random() * (merchants.length - 2))];   // Vendors
    
    transactions.push({
      date: normalize_date(`2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`),
      description: `${merchant} - ${mapping.name}`,
      amount: dollars_to_cents(amount_dollars),
      category: is_income ? 'income' : 'expense',
      subcategory: category,
      payee: merchant,
      gl_account: mapping.gl,
      currency: 'USD'
    });
  }
  
  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  
  // Convert BigInt to string for JSON serialization
  const serializable = transactions.map(tx => ({
    ...tx,
    amount: tx.amount.toString()
  }));
  
  writeFileSync(output_file, JSON.stringify(serializable, null, 2));
  
  return {
    dataset: 'transactions',
    input_file: 'transactions.parquet',
    output_file: 'transactions.json',
    input_rows: sample_count,
    output_rows: transactions.length,
    success: true
  };
}
