// file: src/demo/generate/tax_filings.ts
// description: Generate tax filing and compliance data
// reference: generate/index.ts

export interface TaxFiling {
  filing_type: '941' | '1099' | 'annual' | 'sales_tax';
  period: string; // YYYY-MM or YYYY-QQ
  due_date: string;
  filed_date: string | null;
  status: 'pending' | 'filed' | 'overdue' | 'amended';
  amount: bigint | null; // in cents
  details: Record<string, any>;
}

export interface ContractorPayment {
  contractor_name: string;
  ein: string;
  address: string;
  total_paid: bigint; // in cents
  year: number;
  requires_1099: boolean;
}

export interface PolicyViolation {
  violation_type: string;
  severity: 'low' | 'medium' | 'high';
  entity_type: 'transaction' | 'invoice' | 'expense';
  entity_id: string;
  description: string;
  detected_at: string;
  resolved: boolean;
}

function dollars_to_cents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export function generate_tax_filings(): TaxFiling[] {
  const filings: TaxFiling[] = [];
  
  // Generate quarterly 941 payroll tax filings (last 3 years = 12 quarters)
  for (let year = 2022; year <= 2024; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const period = `${year}-Q${quarter}`;
      const due_date = get_941_due_date(year, quarter);
      const filed_date = is_past(due_date) ? get_random_filed_date(due_date) : null;
      const status = get_filing_status(due_date, filed_date);
      
      filings.push({
        filing_type: '941',
        period,
        due_date,
        filed_date,
        status,
        amount: dollars_to_cents(Math.random() * 50000 + 20000), // $20k-$70k
        details: {
          wages: dollars_to_cents(Math.random() * 300000 + 150000),
          federal_income_tax: dollars_to_cents(Math.random() * 40000 + 15000),
          social_security_tax: dollars_to_cents(Math.random() * 25000 + 10000),
          medicare_tax: dollars_to_cents(Math.random() * 6000 + 3000)
        }
      });
    }
  }
  
  // Generate annual tax returns (last 3 years)
  for (let year = 2022; year <= 2024; year++) {
    const due_date = `${year + 1}-03-15`; // March 15 for LLC
    const filed_date = is_past(due_date) ? get_random_filed_date(due_date) : null;
    
    filings.push({
      filing_type: 'annual',
      period: String(year),
      due_date,
      filed_date,
      status: get_filing_status(due_date, filed_date),
      amount: null, // Varies by tax owed
      details: {
        revenue: dollars_to_cents(Math.random() * 2800000 + 2000000),
        expenses: dollars_to_cents(Math.random() * 2400000 + 1800000),
        net_income: dollars_to_cents(Math.random() * 400000 + 200000),
        tax_owed: dollars_to_cents(Math.random() * 80000 + 40000)
      }
    });
  }
  
  // Generate monthly sales tax filings (last 12 months only)
  const today = new Date('2025-02-01');
  for (let m = 0; m < 12; m++) {
    const month_date = new Date(today);
    month_date.setMonth(month_date.getMonth() - m);
    const period = `${month_date.getFullYear()}-${String(month_date.getMonth() + 1).padStart(2, '0')}`;
    const due_date = `${month_date.getFullYear()}-${String(month_date.getMonth() + 2).padStart(2, '0')}-20`;
    const filed_date = is_past(due_date) ? get_random_filed_date(due_date) : null;
    
    filings.push({
      filing_type: 'sales_tax',
      period,
      due_date,
      filed_date,
      status: get_filing_status(due_date, filed_date),
      amount: dollars_to_cents(Math.random() * 2000 + 500), // $500-$2500
      details: {
        taxable_sales: dollars_to_cents(Math.random() * 25000 + 10000),
        tax_rate: 0.0825, // 8.25% Texas state tax
        tax_collected: dollars_to_cents(Math.random() * 2000 + 500)
      }
    });
  }
  
  return filings;
}

export function generate_contractor_payments(): ContractorPayment[] {
  return [
    { contractor_name: 'Sarah Martinez Consulting', ein: '12-3456780', address: '456 Oak St, Austin, TX 78701', total_paid: dollars_to_cents(85000), year: 2024, requires_1099: true },
    { contractor_name: 'Chen Software Solutions', ein: '12-3456781', address: '789 Pine St, Austin, TX 78702', total_paid: dollars_to_cents(62000), year: 2024, requires_1099: true },
    { contractor_name: 'Taylor Design Studio', ein: '12-3456782', address: '123 Elm St, Austin, TX 78703', total_paid: dollars_to_cents(45000), year: 2024, requires_1099: true },
    { contractor_name: 'Johnson DevOps LLC', ein: '12-3456783', address: '321 Maple Ave, Austin, TX 78704', total_paid: dollars_to_cents(38000), year: 2024, requires_1099: true },
    { contractor_name: 'Smith Security Consulting', ein: '12-3456784', address: '654 Cedar Ln, Austin, TX 78705', total_paid: dollars_to_cents(28000), year: 2024, requires_1099: true },
    { contractor_name: 'Davis Data Analytics', ein: '12-3456785', address: '987 Birch Rd, Austin, TX 78706', total_paid: dollars_to_cents(22000), year: 2024, requires_1099: true },
    { contractor_name: 'Wilson QA Services', ein: '12-3456786', address: '147 Spruce Dr, Austin, TX 78707', total_paid: dollars_to_cents(18000), year: 2024, requires_1099: true },
    { contractor_name: 'Brown Project Management', ein: '12-3456787', address: '258 Ash Ct, Austin, TX 78708', total_paid: dollars_to_cents(15000), year: 2024, requires_1099: true },
    { contractor_name: 'Garcia Technical Writing', ein: '12-3456788', address: '369 Willow Way, Austin, TX 78709', total_paid: dollars_to_cents(12000), year: 2024, requires_1099: true },
    { contractor_name: 'Miller Graphic Design', ein: '12-3456789', address: '741 Poplar Pl, Austin, TX 78710', total_paid: dollars_to_cents(8500), year: 2024, requires_1099: true },
  ];
}

export function generate_policy_violations(): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const types = [
    { type: 'missing_receipt', severity: 'medium' as const, desc: 'Expense over $25 without receipt' },
    { type: 'unapproved_expense', severity: 'high' as const, desc: 'Expense exceeds approval threshold' },
    { type: 'duplicate_payment', severity: 'high' as const, desc: 'Possible duplicate invoice payment' },
    { type: 'weekend_transaction', severity: 'low' as const, desc: 'Transaction on weekend - requires verification' },
    { type: 'foreign_transaction', severity: 'low' as const, desc: 'Foreign currency transaction not pre-approved' },
    { type: 'split_transaction', severity: 'medium' as const, desc: 'Transaction split to avoid approval limit' },
    { type: 'unusual_vendor', severity: 'medium' as const, desc: 'Payment to new/unknown vendor' },
    { type: 'late_invoice', severity: 'low' as const, desc: 'Invoice paid after due date - late fee risk' },
    { type: 'tax_classification', severity: 'medium' as const, desc: 'Incorrect tax category assigned' }
  ];
  
  // Generate 25 violations
  for (let i = 0; i < 25; i++) {
    const violation_template = types[Math.floor(Math.random() * types.length)];
    const days_ago = Math.floor(Math.random() * 180); // Last 6 months
    const detected_date = new Date('2025-02-01');
    detected_date.setDate(detected_date.getDate() - days_ago);
    
    violations.push({
      violation_type: violation_template.type,
      severity: violation_template.severity,
      entity_type: Math.random() > 0.5 ? 'invoice' : 'transaction',
      entity_id: `demo-${i + 1000}`,
      description: violation_template.desc,
      detected_at: detected_date.toISOString(),
      resolved: days_ago > 30 // Older than 30 days are resolved
    });
  }
  
  return violations;
}

function get_941_due_date(year: number, quarter: number): string {
  const due_dates = ['', '-04-30', '-07-31', '-10-31', '-01-31'];
  if (quarter === 4) {
    return `${year + 1}${due_dates[4]}`;
  }
  return `${year}${due_dates[quarter]}`;
}

function is_past(date_str: string): boolean {
  return new Date(date_str) < new Date('2025-02-01');
}

function get_random_filed_date(due_date: string): string {
  const due = new Date(due_date);
  const days_before_due = Math.floor(Math.random() * 20); // Filed 0-20 days before due
  const filed = new Date(due);
  filed.setDate(filed.getDate() - days_before_due);
  return filed.toISOString().split('T')[0];
}

function get_filing_status(due_date: string, filed_date: string | null): TaxFiling['status'] {
  if (!is_past(due_date)) return 'pending';
  if (!filed_date) return 'overdue';
  return 'filed';
}
