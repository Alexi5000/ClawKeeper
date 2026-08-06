// file: src/demo/seed/index.ts
// description: Main database seeder orchestrator
// reference: generate/index.ts, db/seed.sql

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { seed_tenant } from './tenant';
import { seed_users } from './users';
import { seed_accounts } from './accounts';
import { seed_transactions } from './transactions';
import { seed_invoices } from './invoices';
import { seed_agent_scenarios } from './agent_scenarios';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://clawkeeper:clawkeeper_password@localhost:5432/clawkeeper';
const GENERATED_DIR = join(__dirname, '../data/generated');
const NORMALIZED_DIR = join(__dirname, '../transform/normalized');

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ClawKeeper Database Seeder                               ║
║  Seeding demo data for 110 agents                         ║
╚═══════════════════════════════════════════════════════════╝
  `);

  const sql = postgres(DATABASE_URL);
  
  try {
    await sql`SELECT 1`;
    console.log('\n🔌 Connected to database');
    
    // Load generated data
    console.log('\n📂 Loading generated data...');
    const company_profile = JSON.parse(readFileSync(join(GENERATED_DIR, 'company_profile.json'), 'utf-8'));
    const chart_of_accounts = JSON.parse(readFileSync(join(GENERATED_DIR, 'chart_of_accounts.json'), 'utf-8'));
    const vendors = JSON.parse(readFileSync(join(GENERATED_DIR, 'vendors.json'), 'utf-8'));
    const customers = JSON.parse(readFileSync(join(GENERATED_DIR, 'customers.json'), 'utf-8'));
    const budgets = JSON.parse(readFileSync(join(GENERATED_DIR, 'budgets.json'), 'utf-8'));
    const tax_filings = JSON.parse(readFileSync(join(GENERATED_DIR, 'tax_filings.json'), 'utf-8'));
    const contractor_payments = JSON.parse(readFileSync(join(GENERATED_DIR, 'contractor_payments.json'), 'utf-8'));
    const policy_violations = JSON.parse(readFileSync(join(GENERATED_DIR, 'policy_violations.json'), 'utf-8'));
    const plaid_accounts = JSON.parse(readFileSync(join(GENERATED_DIR, 'plaid_accounts.json'), 'utf-8'));
    const plaid_transactions = JSON.parse(readFileSync(join(GENERATED_DIR, 'plaid_transactions.json'), 'utf-8'));
    const agent_scenarios = JSON.parse(readFileSync(join(GENERATED_DIR, 'agent_scenarios.json'), 'utf-8'));
    
    // Load transformed data
    const transactions = JSON.parse(readFileSync(join(NORMALIZED_DIR, 'transactions.json'), 'utf-8'));
    const invoices = JSON.parse(readFileSync(join(NORMALIZED_DIR, 'invoices.json'), 'utf-8'));
    const support_tickets = JSON.parse(readFileSync(join(NORMALIZED_DIR, 'support_tickets.json'), 'utf-8'));
    
    console.log('✅ All data files loaded');
    
    // Seed in dependency order
    console.log('\n1️⃣ Seeding tenant...');
    const tenant_id = await seed_tenant(sql, company_profile);
    console.log(`✅ Tenant created: ${tenant_id}`);
    
    console.log('\n2️⃣ Seeding users...');
    const user_id = await seed_users(sql, tenant_id);
    console.log('✅ Users created');
    
    // Set user context for audit logging
    await sql.unsafe(`SET app.current_user_id = '${user_id}'`);
    
    console.log('\n3️⃣ Seeding chart of accounts...');
    // Note: Chart of accounts stored in company settings for this schema
    await sql`
      UPDATE tenants
      SET settings = settings || ${JSON.stringify({ chart_of_accounts })}::jsonb
      WHERE id = ${tenant_id}
    `;
    console.log(`✅ Chart of accounts: ${chart_of_accounts.length} accounts`);
    
    console.log('\n4️⃣ Seeding bank accounts...');
    const account_ids = await seed_accounts(sql, tenant_id, plaid_accounts);
    console.log(`✅ Accounts created: ${account_ids.length}`);
    
    console.log('\n5️⃣ Seeding transactions...');
    await seed_transactions(sql, tenant_id, account_ids, transactions, plaid_transactions);
    console.log(`✅ Transactions: ${transactions.length + plaid_transactions.length} records`);
    
    console.log('\n6️⃣ Seeding invoices...');
    await seed_invoices(sql, tenant_id, invoices, vendors, customers);
    console.log(`✅ Invoices: ${invoices.length} records`);
    
    console.log('\n7️⃣ Seeding compliance data...');
    // Store in tenant settings
    await sql`
      UPDATE tenants
      SET settings = settings || ${JSON.stringify({
        tax_filings,
        contractor_payments,
        policy_violations,
        budgets
      })}::jsonb
      WHERE id = ${tenant_id}
    `;
    console.log('✅ Compliance data stored');
    
    console.log('\n8️⃣ Seeding agent scenarios...');
    await seed_agent_scenarios(sql, tenant_id, agent_scenarios);
    console.log(`✅ Agent scenarios: ${agent_scenarios.length} scenarios`);
    
    console.log('\n9️⃣ Seeding support tickets...');
    // Store in tenant settings
    await sql`
      UPDATE tenants
      SET settings = settings || ${JSON.stringify({ support_tickets })}::jsonb
      WHERE id = ${tenant_id}
    `;
    console.log(`✅ Support tickets: ${support_tickets.length} tickets`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log('\nDemo Login Credentials:');
    console.log('  Email: admin@meridiantech.example');
    console.log('  Password: Demo123!');
    console.log('\nAccess the dashboard:');
    console.log('  http://localhost:3000');
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
