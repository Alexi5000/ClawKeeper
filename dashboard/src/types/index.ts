// Dashboard TypeScript types

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'tenant_admin' | 'accountant' | 'viewer';
  created_at: string;
  last_login: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  settings: TenantSettings;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
}

export interface TenantSettings {
  theme?: 'light' | 'dark';
  currency?: string;
  timezone?: string;
  logo_url?: string;
  primary_color?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  vendor_name: string;
  vendor_email: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number; // cents
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  line_items: InvoiceLineItem[];
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // cents
  amount: number; // cents
  category: string;
}

export interface Account {
  id: string;
  tenant_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment' | 'other';
  institution: string;
  account_number_last4: string;
  balance: number; // cents
  currency: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  account_id: string;
  date: string;
  amount: number; // cents
  category: 'income' | 'expense' | 'transfer' | 'adjustment';
  subcategory: string | null;
  description: string;
  payee: string | null;
  reconciled: boolean;
  created_at: string;
}

export interface FinancialReport {
  id: string;
  tenant_id: string;
  type: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'ap_aging' | 'ar_aging' | 'custom';
  period: {
    start_date: string;
    end_date: string;
    type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  };
  data: Record<string, unknown>;
  generated_at: string;
}
