// file: src/demo/generate/chart_of_accounts.ts
// description: Generate standard SMB chart of accounts
// reference: generate/index.ts

export interface GLAccount {
  account_number: number;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs';
  parent_account: number | null;
  normal_balance: 'debit' | 'credit';
  is_active: boolean;
  description: string;
}

export function generate_chart_of_accounts(): GLAccount[] {
  return [
    // ASSETS (1000-1999)
    { account_number: 1000, account_name: 'Cash - Operating Account', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Primary business checking account' },
    { account_number: 1010, account_name: 'Cash - Payroll Account', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Dedicated payroll account' },
    { account_number: 1020, account_name: 'Cash - Savings Reserve', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Business savings account' },
    { account_number: 1100, account_name: 'Accounts Receivable', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Amounts owed by customers' },
    { account_number: 1200, account_name: 'Prepaid Expenses', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Prepaid insurance, rent, etc.' },
    { account_number: 1210, account_name: 'Prepaid Insurance', account_type: 'asset', parent_account: 1200, normal_balance: 'debit', is_active: true, description: 'Prepaid insurance premiums' },
    { account_number: 1220, account_name: 'Prepaid Rent', account_type: 'asset', parent_account: 1200, normal_balance: 'debit', is_active: true, description: 'Prepaid office rent' },
    { account_number: 1500, account_name: 'Computer Equipment', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Laptops, servers, hardware' },
    { account_number: 1510, account_name: 'Office Furniture', account_type: 'asset', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Desks, chairs, fixtures' },
    { account_number: 1600, account_name: 'Accumulated Depreciation', account_type: 'asset', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Contra-asset for depreciation' },
    
    // LIABILITIES (2000-2999)
    { account_number: 2000, account_name: 'Accounts Payable', account_type: 'liability', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Amounts owed to vendors' },
    { account_number: 2100, account_name: 'Credit Card - Chase Ink', account_type: 'liability', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Business credit card' },
    { account_number: 2200, account_name: 'Payroll Liabilities', account_type: 'liability', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Payroll taxes and withholdings' },
    { account_number: 2210, account_name: 'Federal Payroll Taxes Payable', account_type: 'liability', parent_account: 2200, normal_balance: 'credit', is_active: true, description: 'Federal income tax withholding' },
    { account_number: 2220, account_name: 'State Payroll Taxes Payable', account_type: 'liability', parent_account: 2200, normal_balance: 'credit', is_active: true, description: 'State income tax withholding' },
    { account_number: 2230, account_name: 'FICA/Medicare Payable', account_type: 'liability', parent_account: 2200, normal_balance: 'credit', is_active: true, description: 'Social Security and Medicare' },
    { account_number: 2300, account_name: 'Sales Tax Payable', account_type: 'liability', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Collected sales tax' },
    { account_number: 2400, account_name: 'Line of Credit', account_type: 'liability', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Business line of credit' },
    
    // EQUITY (3000-3999)
    { account_number: 3000, account_name: "Owner's Equity", account_type: 'equity', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Owner contributions' },
    { account_number: 3100, account_name: 'Retained Earnings', account_type: 'equity', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Accumulated profits' },
    { account_number: 3200, account_name: "Owner's Draws", account_type: 'equity', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Owner distributions' },
    
    // REVENUE (4000-4999)
    { account_number: 4000, account_name: 'Consulting Revenue', account_type: 'revenue', parent_account: null, normal_balance: 'credit', is_active: true, description: 'IT consulting services' },
    { account_number: 4100, account_name: 'Software Development Revenue', account_type: 'revenue', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Custom software projects' },
    { account_number: 4200, account_name: 'Managed Services Revenue', account_type: 'revenue', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Recurring managed services' },
    { account_number: 4900, account_name: 'Other Income', account_type: 'revenue', parent_account: null, normal_balance: 'credit', is_active: true, description: 'Miscellaneous income' },
    
    // COST OF GOODS SOLD (5000-5999)
    { account_number: 5000, account_name: 'Contractor Labor', account_type: 'cogs', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Contract/freelance labor' },
    { account_number: 5100, account_name: 'Software Licenses - Client Projects', account_type: 'cogs', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Client-specific software costs' },
    { account_number: 5200, account_name: 'Cloud Infrastructure - Client', account_type: 'cogs', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Client hosting costs' },
    
    // OPERATING EXPENSES (6000-6999)
    { account_number: 6000, account_name: 'Salaries & Wages', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Employee salaries' },
    { account_number: 6010, account_name: 'Payroll Taxes', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Employer payroll taxes' },
    { account_number: 6020, account_name: 'Employee Benefits', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Health insurance, 401k, etc.' },
    { account_number: 6100, account_name: 'Rent', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Office space rental' },
    { account_number: 6110, account_name: 'Utilities', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Electric, internet, phone' },
    { account_number: 6200, account_name: 'Software Subscriptions', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'SaaS tools and licenses' },
    { account_number: 6210, account_name: 'Cloud Services - Internal', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'AWS, Azure for internal use' },
    { account_number: 6300, account_name: 'Professional Services', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Legal, accounting, consulting' },
    { account_number: 6400, account_name: 'Marketing & Advertising', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Marketing expenses' },
    { account_number: 6500, account_name: 'Travel & Entertainment', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Business travel and meals' },
    { account_number: 6600, account_name: 'Office Supplies', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Office supplies and materials' },
    { account_number: 6700, account_name: 'Insurance', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Business insurance' },
    { account_number: 6800, account_name: 'Depreciation', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Depreciation expense' },
    { account_number: 6810, account_name: 'Bank Fees', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Banking and transaction fees' },
    { account_number: 6820, account_name: 'Interest Expense', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Interest on loans/credit' },
    { account_number: 6900, account_name: 'Miscellaneous Expenses', account_type: 'expense', parent_account: null, normal_balance: 'debit', is_active: true, description: 'Other operating expenses' }
  ];
}
