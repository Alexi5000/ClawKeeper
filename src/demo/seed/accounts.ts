// file: src/demo/seed/accounts.ts
// description: Seed demo bank accounts
// reference: seed/index.ts

import type { Sql } from 'postgres';

function dollars_to_cents(amount: number): string {
  return String(Math.round(amount * 100));
}

export async function seed_accounts(
  sql: Sql<Record<string, unknown>>,
  tenant_id: string,
  plaid_accounts: any[]
): Promise<string[]> {
  const account_ids: string[] = [];
  
  const account_configs = [
    {
      name: 'Business Checking - Chase',
      type: 'checking',
      institution: 'Chase Bank',
      account_number_last4: '4321',
      balance: dollars_to_cents(125000),
      plaid_account_id: 'plaid_acc_checking_001'
    },
    {
      name: 'Business Savings - Chase',
      type: 'savings',
      institution: 'Chase Bank',
      account_number_last4: '8765',
      balance: dollars_to_cents(250000),
      plaid_account_id: 'plaid_acc_savings_002'
    },
    {
      name: 'Chase Ink Business Card',
      type: 'credit_card',
      institution: 'Chase Bank',
      account_number_last4: '1234',
      balance: dollars_to_cents(-8500),
      plaid_account_id: 'plaid_acc_credit_003'
    },
    {
      name: 'Payroll Account - Chase',
      type: 'checking',
      institution: 'Chase Bank',
      account_number_last4: '5678',
      balance: dollars_to_cents(45000),
      plaid_account_id: null
    },
    {
      name: 'Business Line of Credit',
      type: 'loan',
      institution: 'Chase Bank',
      account_number_last4: '9012',
      balance: dollars_to_cents(-15000),
      plaid_account_id: null
    }
  ];
  
  for (const config of account_configs) {
    const [account] = await sql`
      INSERT INTO accounts (tenant_id, name, type, institution, account_number_last4, balance, currency, plaid_account_id, created_at, updated_at)
      VALUES (
        ${tenant_id},
        ${config.name},
        ${config.type},
        ${config.institution},
        ${config.account_number_last4},
        ${config.balance},
        'USD',
        ${config.plaid_account_id},
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    
    account_ids.push(account.id);
  }
  
  return account_ids;
}
