// file: src/demo/seed/transactions.ts
// description: Seed demo transactions
// reference: seed/index.ts

import type { Sql } from 'postgres';

export async function seed_transactions(
  sql: Sql<Record<string, unknown>>,
  tenant_id: string,
  account_ids: string[],
  normalized_transactions: any[],
  plaid_transactions: any[]
): Promise<void> {
  // Map transactions to accounts (checking for expenses/income, credit card for some expenses)
  const checking_account = account_ids[0];
  const credit_card_account = account_ids[2];
  
  // Insert normalized transactions
  for (const tx of normalized_transactions) {
    // Use credit card for 30% of expenses
    const account_id = tx.category === 'expense' && Math.random() > 0.7
      ? credit_card_account
      : checking_account;
    
    await sql`
      INSERT INTO transactions (
        tenant_id, account_id, date, amount, category, subcategory,
        description, payee, reconciled, created_at, updated_at
      )
      VALUES (
        ${tenant_id},
        ${account_id},
        ${tx.date}::timestamptz,
        ${tx.amount.toString()},
        ${tx.category},
        ${tx.subcategory},
        ${tx.description},
        ${tx.payee},
        ${Math.random() > 0.3}, -- 70% reconciled
        NOW(),
        NOW()
      )
    `;
  }
  
  // Insert Plaid transactions (from mock Plaid sync)
  for (let i = 0; i < Math.min(plaid_transactions.length, 2000); i++) {
    const tx = plaid_transactions[i];
    
    // Map Plaid account to our account
    const account_map: Record<string, string> = {
      'plaid_acc_checking_001': checking_account,
      'plaid_acc_credit_003': credit_card_account
    };
    
    const account_id = account_map[tx.account_id] || checking_account;
    
    await sql`
      INSERT INTO transactions (
        tenant_id, account_id, date, amount, category,
        description, payee, reconciled, plaid_transaction_id, created_at, updated_at
      )
      VALUES (
        ${tenant_id},
        ${account_id},
        ${tx.date}::timestamptz,
        ${String(Math.round(tx.amount * 100))},
        ${tx.amount < 0 ? 'expense' : 'income'},
        ${tx.name},
        ${tx.merchant_name},
        ${!tx.pending},
        ${tx.transaction_id},
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `;
  }
}
