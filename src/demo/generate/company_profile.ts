// file: src/demo/generate/company_profile.ts
// description: Mock company profile for Meridian Tech Solutions demo
// reference: generate/index.ts

export const COMPANY_PROFILE = {
  name: 'Meridian Tech Solutions, LLC',
  industry: 'IT Consulting & Software Services',
  founded: '2021-03-15',
  employees: 28,
  annual_revenue: 2400000, // $2.4M
  location: {
    address: '123 Innovation Drive',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'USA'
  },
  fiscal_year_start: 1, // January
  accounting_method: 'accrual',
  tax_id: '12-3456789',
  phone: '+1 (512) 555-0123',
  email: 'info@meridiantech.example',
  website: 'https://meridiantech.example',
  
  business_structure: {
    type: 'LLC',
    owners: [
      { name: 'Alex Rivera', title: 'CEO & Founder', ownership: 60 },
      { name: 'Jordan Chen', title: 'CTO & Co-Founder', ownership: 40 }
    ]
  },
  
  revenue_streams: [
    { name: 'IT Consulting', percentage: 60, gl_account: 4000 },
    { name: 'Software Development', percentage: 30, gl_account: 4100 },
    { name: 'Managed Services', percentage: 10, gl_account: 4200 }
  ],
  
  departments: [
    { name: 'Engineering', employee_count: 12, budget_percentage: 45 },
    { name: 'Sales & Marketing', employee_count: 6, budget_percentage: 25 },
    { name: 'Operations', employee_count: 8, budget_percentage: 20 },
    { name: 'Administration', employee_count: 2, budget_percentage: 10 }
  ],
  
  banking: {
    primary_bank: 'Chase Bank',
    accounts: [
      { type: 'checking', name: 'Business Checking', account_number_last4: '4321' },
      { type: 'savings', name: 'Business Savings', account_number_last4: '8765' },
      { type: 'credit_card', name: 'Chase Ink Business', account_number_last4: '1234' }
    ]
  },
  
  key_metrics: {
    monthly_recurring_revenue: 80000,
    average_project_size: 45000,
    active_clients: 15,
    active_vendors: 40,
    avg_collection_days: 35,
    avg_payment_days: 25
  }
} as const;

export type CompanyProfile = typeof COMPANY_PROFILE;
