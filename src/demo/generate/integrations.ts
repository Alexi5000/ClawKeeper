// file: src/demo/generate/integrations.ts
// description: Generate mock integration data (Plaid, Stripe, QuickBooks, Xero)
// reference: generate/index.ts

export interface PlaidAccount {
  account_id: string;
  account_name: string;
  account_type: 'depository' | 'credit' | 'loan' | 'investment';
  account_subtype: string;
  mask: string;
  current_balance: number;
  available_balance: number;
  currency: string;
  institution_name: string;
  institution_id: string;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[];
  pending: boolean;
  payment_channel: string;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  created: number;
  due_date: number;
  invoice_pdf: string | null;
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface QuickBooksExport {
  format: 'IIF' | 'QBO';
  content: string;
  entity_type: 'invoice' | 'bill' | 'payment' | 'journal_entry';
  metadata: Record<string, any>;
}

export function generate_plaid_accounts(): PlaidAccount[] {
  return [
    {
      account_id: 'plaid_acc_checking_001',
      account_name: 'Business Checking',
      account_type: 'depository',
      account_subtype: 'checking',
      mask: '4321',
      current_balance: 125000.00,
      available_balance: 123500.00,
      currency: 'USD',
      institution_name: 'Chase Bank',
      institution_id: 'ins_56'
    },
    {
      account_id: 'plaid_acc_savings_002',
      account_name: 'Business Savings',
      account_type: 'depository',
      account_subtype: 'savings',
      mask: '8765',
      current_balance: 250000.00,
      available_balance: 250000.00,
      currency: 'USD',
      institution_name: 'Chase Bank',
      institution_id: 'ins_56'
    },
    {
      account_id: 'plaid_acc_credit_003',
      account_name: 'Chase Ink Business',
      account_type: 'credit',
      account_subtype: 'credit card',
      mask: '1234',
      current_balance: -8500.00,
      available_balance: 41500.00, // $50k limit
      currency: 'USD',
      institution_name: 'Chase Bank',
      institution_id: 'ins_56'
    }
  ];
}

export function generate_plaid_transactions(count: number = 5000): PlaidTransaction[] {
  const transactions: PlaidTransaction[] = [];
  const merchants = [
    { name: 'AWS', category: ['Service', 'Cloud Computing'] },
    { name: 'Microsoft', category: ['Service', 'Software'] },
    { name: 'WeWork', category: ['Service', 'Rent'] },
    { name: 'Office Depot', category: ['Shops', 'Office Supplies'] },
    { name: 'Delta Airlines', category: ['Travel', 'Airlines'] },
    { name: 'Marriott', category: ['Travel', 'Hotels'] },
    { name: 'Starbucks', category: ['Food and Drink', 'Coffee'] }
  ];
  
  for (let i = 0; i < count; i++) {
    const days_ago = Math.floor(Math.random() * 365);
    const date = new Date('2025-02-01');
    date.setDate(date.getDate() - days_ago);
    
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    transactions.push({
      transaction_id: `plaid_tx_${String(i + 10000)}`,
      account_id: Math.random() > 0.7 ? 'plaid_acc_credit_003' : 'plaid_acc_checking_001',
      amount: -(Math.random() * 500 + 10),
      date: date.toISOString().split('T')[0],
      name: merchant.name,
      merchant_name: merchant.name,
      category: merchant.category,
      pending: days_ago < 3,
      payment_channel: Math.random() > 0.5 ? 'online' : 'in store'
    });
  }
  
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

export function generate_stripe_invoices(): StripeInvoice[] {
  const invoices: StripeInvoice[] = [];
  const customers = ['cus_acme', 'cus_techstart', 'cus_lonestar', 'cus_schools'];
  
  for (let i = 0; i < 500; i++) {
    const created = Date.now() - (Math.random() * 365 * 24 * 60 * 60 * 1000);
    const due_date = created + (30 * 24 * 60 * 60 * 1000);
    
    const amount = Math.floor(Math.random() * 50000 + 5000);
    const is_paid = due_date < Date.now() && Math.random() > 0.2;
    
    invoices.push({
      id: `in_${String(i + 100000)}`,
      customer: customers[Math.floor(Math.random() * customers.length)],
      amount_due: amount,
      amount_paid: is_paid ? amount : 0,
      currency: 'usd',
      status: is_paid ? 'paid' : (due_date < Date.now() ? 'open' : 'open'),
      created: Math.floor(created / 1000),
      due_date: Math.floor(due_date / 1000),
      invoice_pdf: is_paid ? `https://files.stripe.com/invoice_${i}.pdf` : null,
      lines: [
        {
          description: 'Consulting Services - Monthly Retainer',
          amount,
          quantity: 1
        }
      ]
    });
  }
  
  return invoices;
}

export function generate_stripe_subscriptions(): StripeSubscription[] {
  const customers = ['cus_acme', 'cus_techstart', 'cus_lonestar'];
  
  return customers.map((customer, idx) => ({
    id: `sub_${String(idx + 1000)}`,
    customer,
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60),
    current_period_end: Math.floor(Date.now() / 1000) + (15 * 24 * 60 * 60),
    amount: 15000 + Math.floor(Math.random() * 20000),
    currency: 'usd',
    interval: 'month'
  }));
}

export function generate_quickbooks_exports(): QuickBooksExport[] {
  // Generate sample IIF format (QuickBooks Import Format)
  const iif_invoice = `!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO
!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO
!ENDTRNS
TRNS\t1\tINVOICE\t01/15/2025\tAccounts Receivable\tAcme Corporation\t5000.00\tConsulting Services
SPL\t1\tINVOICE\t01/15/2025\tConsulting Revenue\t-5000.00\tProject ABC - Phase 1
ENDTRNS`;
  
  return [
    {
      format: 'IIF',
      content: iif_invoice,
      entity_type: 'invoice',
      metadata: { record_count: 1, total_amount: 5000 }
    }
  ];
}

export function generate_webhook_payloads() {
  return {
    plaid: {
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: 'item_plaid_001',
      new_transactions: 15,
      removed_transactions: 0
    },
    stripe: {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_test_invoice',
          amount_paid: 5000,
          customer: 'cus_acme'
        }
      }
    }
  };
}
