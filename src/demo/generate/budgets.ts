// file: src/demo/generate/budgets.ts
// description: Generate budget data for CFO agents
// reference: generate/index.ts, company_profile.ts

import { COMPANY_PROFILE } from './company_profile';

export interface MonthlyBudget {
  month: string; // YYYY-MM
  department: string;
  category: string;
  gl_account: number;
  budgeted_amount: bigint; // in cents
  actual_amount: bigint | null; // in cents (populated for past months)
  variance: bigint | null; // in cents
  variance_percentage: number | null;
  notes: string | null;
}

function dollars_to_cents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export function generate_budgets(): MonthlyBudget[] {
  const budgets: MonthlyBudget[] = [];
  const base_date = new Date('2024-02-01');
  const months = 36; // 3 years of budget data
  
  // Department budget allocations
  const dept_budgets = {
    Engineering: {
      'Salaries & Wages': { gl: 6000, monthly: 85000 },
      'Software Subscriptions': { gl: 6200, monthly: 8000 },
      'Cloud Services - Internal': { gl: 6210, monthly: 3000 },
      'Equipment': { gl: 1500, monthly: 5000 },
      'Training': { gl: 6200, monthly: 2000 }
    },
    'Sales & Marketing': {
      'Salaries & Wages': { gl: 6000, monthly: 45000 },
      'Marketing & Advertising': { gl: 6400, monthly: 12000 },
      'Travel & Entertainment': { gl: 6500, monthly: 8000 },
      'Software Subscriptions': { gl: 6200, monthly: 3000 }
    },
    Operations: {
      'Salaries & Wages': { gl: 6000, monthly: 38000 },
      'Rent': { gl: 6100, monthly: 8000 },
      'Utilities': { gl: 6110, monthly: 1500 },
      'Office Supplies': { gl: 6600, monthly: 1000 },
      'Insurance': { gl: 6700, monthly: 2500 }
    },
    Administration: {
      'Salaries & Wages': { gl: 6000, monthly: 20000 },
      'Professional Services': { gl: 6300, monthly: 4000 },
      'Bank Fees': { gl: 6810, monthly: 500 },
      'Miscellaneous': { gl: 6900, monthly: 1000 }
    }
  };
  
  // Generate monthly budgets
  for (let m = 0; m < months; m++) {
    const month_date = new Date(base_date);
    month_date.setMonth(month_date.getMonth() + m);
    const month_str = `${month_date.getFullYear()}-${String(month_date.getMonth() + 1).padStart(2, '0')}`;
    
    // Is this a past month (for variance calculation)?
    const is_past = month_date < new Date('2025-02-01');
    
    for (const [dept, categories] of Object.entries(dept_budgets)) {
      for (const [category, config] of Object.entries(categories)) {
        const base_budget = config.monthly;
        
        // Add some variation (seasonal, growth trend)
        const seasonal_factor = 1 + (Math.sin(m / 12 * Math.PI * 2) * 0.1); // ±10% seasonal
        const growth_factor = 1 + (m / months * 0.15); // 15% growth over 3 years
        const budgeted = base_budget * seasonal_factor * growth_factor;
        
        let actual = null;
        let variance = null;
        let variance_pct = null;
        let notes = null;
        
        if (is_past) {
          // Generate actual with some variance
          const variance_type = Math.random();
          let actual_dollars;
          
          if (variance_type > 0.7) {
            // Under budget (20% of the time)
            actual_dollars = budgeted * (0.85 + Math.random() * 0.1); // 85-95%
            notes = 'Under budget - cost savings achieved';
          } else if (variance_type > 0.5) {
            // Over budget (20% of the time)
            actual_dollars = budgeted * (1.05 + Math.random() * 0.15); // 105-120%
            notes = 'Over budget - requires review';
          } else {
            // On track (60% of the time)
            actual_dollars = budgeted * (0.95 + Math.random() * 0.1); // 95-105%
            notes = null;
          }
          
          actual = dollars_to_cents(actual_dollars);
          const budgeted_cents = dollars_to_cents(budgeted);
          variance = actual - budgeted_cents;
          variance_pct = Number(variance) / Number(budgeted_cents) * 100;
        }
        
        budgets.push({
          month: month_str,
          department: dept,
          category,
          gl_account: config.gl,
          budgeted_amount: dollars_to_cents(budgeted),
          actual_amount: actual,
          variance,
          variance_percentage: variance_pct,
          notes
        });
      }
    }
  }
  
  return budgets;
}
