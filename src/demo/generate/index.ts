// file: src/demo/generate/index.ts
// description: Main orchestrator for generating synthetic demo data
// reference: seed/index.ts

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { COMPANY_PROFILE } from './company_profile';
import { generate_chart_of_accounts } from './chart_of_accounts';
import { generate_vendors } from './vendors';
import { generate_customers } from './customers';
import { generate_budgets } from './budgets';
import { generate_tax_filings, generate_contractor_payments, generate_policy_violations } from './tax_filings';
import {
  generate_plaid_accounts,
  generate_plaid_transactions,
  generate_stripe_invoices,
  generate_stripe_subscriptions,
  generate_quickbooks_exports,
  generate_webhook_payloads
} from './integrations';
import { generate_agent_scenarios } from './scenarios';

const OUTPUT_DIR = join(__dirname, '../data/generated');
const FIXTURE_TIMESTAMP = '2026-08-06T00:00:00.000Z';

function use_deterministic_random(seed = 0x434c4157) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function save_json(filename: string, data: any) {
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
  console.log(`✅ Generated: ${filename} (${Array.isArray(data) ? data.length : 'N/A'} records)`);
}

async function main() {
  use_deterministic_random();
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ClawKeeper Synthetic Data Generation                     ║
║  Generating data for all 110 agents across 9 domains      ║
╚═══════════════════════════════════════════════════════════╝
  `);

  console.log('\n📋 Generating company profile and master data...');
  save_json('company_profile.json', COMPANY_PROFILE);
  save_json('chart_of_accounts.json', generate_chart_of_accounts());
  save_json('vendors.json', generate_vendors());
  save_json('customers.json', generate_customers());
  
  console.log('\n💰 Generating financial data...');
  const budgets = generate_budgets();
  save_json('budgets.json', budgets);
  console.log(`   Monthly budgets: ${budgets.length} records (${budgets.length / 36} categories x 36 months)`);
  
  console.log('\n📊 Generating compliance data...');
  save_json('tax_filings.json', generate_tax_filings());
  save_json('contractor_payments.json', generate_contractor_payments());
  save_json('policy_violations.json', generate_policy_violations());
  
  console.log('\n🔌 Generating integration data...');
  save_json('plaid_accounts.json', generate_plaid_accounts());
  const plaid_txns = generate_plaid_transactions(5000);
  save_json('plaid_transactions.json', plaid_txns);
  save_json('stripe_invoices.json', generate_stripe_invoices());
  save_json('stripe_subscriptions.json', generate_stripe_subscriptions());
  save_json('quickbooks_exports.json', generate_quickbooks_exports());
  save_json('webhook_payloads.json', generate_webhook_payloads());
  
  console.log('\n🤖 Generating agent test scenarios...');
  save_json('agent_scenarios.json', generate_agent_scenarios());
  
  // Generate summary metadata
  const datasets = {
      company_profile: 1,
      chart_of_accounts: 44,
      vendors: 38,
      customers: 15,
      budgets: budgets.length,
      tax_filings: generate_tax_filings().length,
      contractor_payments: 10,
      policy_violations: 25,
      plaid_accounts: 3,
      plaid_transactions: 5000,
      stripe_invoices: 500,
      stripe_subscriptions: 3,
      agent_scenarios: generate_agent_scenarios().length
  };
  const metadata = {
    generated_at: FIXTURE_TIMESTAMP,
    company: COMPANY_PROFILE.name,
    datasets,
    total_records: Object.values(datasets).reduce((sum, count) => sum + count, 0),
    agent_coverage: {
      cfo: 8,
      accounts_payable: 15,
      accounts_receivable: 15,
      reconciliation: 12,
      compliance: 10,
      reporting: 12,
      integration: 12,
      data_etl: 10,
      support: 6,
      total: 110
    }
  };
  
  save_json('metadata.json', metadata);
  
  console.log('\n' + '='.repeat(60));
  console.log('GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📊 Total records generated: ${metadata.total_records.toLocaleString()}`);
  console.log(`🏢 Company: ${metadata.company}`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  
  console.log('\n📦 Dataset breakdown:');
  for (const [key, value] of Object.entries(metadata.datasets)) {
    console.log(`   • ${key}: ${value.toLocaleString()} records`);
  }
  
  console.log('\n🤖 Agent coverage: 110 agents across 9 domains');
  
  console.log('\n' + '='.repeat(60));
  console.log('Next steps:');
  console.log('  1. Run: bun run demo:seed');
  console.log('  2. Start API: bun run src/index.ts');
  console.log('  3. Start UI: cd dashboard && bun run dev');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
