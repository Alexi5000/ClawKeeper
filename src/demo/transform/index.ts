// file: src/demo/transform/index.ts
// description: Main orchestrator for transforming downloaded datasets to ClawKeeper schema
// reference: download/download_datasets.py, seed/index.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { transform_transactions } from './transactions';
import { transform_invoices } from './invoices';
import { transform_support_tickets } from './support';

const RAW_DIR = join(__dirname, '../download/raw');
const NORMALIZED_DIR = join(__dirname, 'normalized');

// Ensure normalized directory exists
if (!existsSync(NORMALIZED_DIR)) {
  mkdirSync(NORMALIZED_DIR, { recursive: true });
}

interface TransformResult {
  dataset: string;
  input_file: string;
  output_file: string;
  input_rows: number;
  output_rows: number;
  success: boolean;
  error?: string;
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ClawKeeper Data Transform                                ║
║  Converting datasets to ClawKeeper schema                 ║
╚═══════════════════════════════════════════════════════════╝
  `);

  const results: TransformResult[] = [];

  // Transform transactions
  try {
    console.log('\n🔄 Transforming transactions...');
    const transactions_result = await transform_transactions(RAW_DIR, NORMALIZED_DIR);
    results.push(transactions_result);
    console.log(`✅ Transactions: ${transactions_result.output_rows} rows`);
  } catch (error) {
    console.error(`❌ Transactions failed:`, error);
    results.push({
      dataset: 'transactions',
      input_file: 'transactions.parquet',
      output_file: 'transactions.json',
      input_rows: 0,
      output_rows: 0,
      success: false,
      error: String(error)
    });
  }

  // Transform invoices
  try {
    console.log('\n🔄 Transforming invoices...');
    const invoices_result = await transform_invoices(RAW_DIR, NORMALIZED_DIR);
    results.push(invoices_result);
    console.log(`✅ Invoices: ${invoices_result.output_rows} rows`);
  } catch (error) {
    console.error(`❌ Invoices failed:`, error);
    results.push({
      dataset: 'invoices',
      input_file: 'invoices.parquet',
      output_file: 'invoices.json',
      input_rows: 0,
      output_rows: 0,
      success: false,
      error: String(error)
    });
  }

  // Transform support tickets
  try {
    console.log('\n🔄 Transforming support tickets...');
    const support_result = await transform_support_tickets(RAW_DIR, NORMALIZED_DIR);
    results.push(support_result);
    console.log(`✅ Support: ${support_result.output_rows} rows`);
  } catch (error) {
    console.error(`❌ Support failed:`, error);
    results.push({
      dataset: 'support',
      input_file: 'support_tickets.parquet',
      output_file: 'support_tickets.json',
      input_rows: 0,
      output_rows: 0,
      success: false,
      error: String(error)
    });
  }

  // Save transform metadata
  const metadata = {
    transformed_at: new Date().toISOString(),
    results,
    summary: {
      total_datasets: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total_rows: results.reduce((sum, r) => sum + r.output_rows, 0)
    }
  };

  writeFileSync(
    join(NORMALIZED_DIR, 'transform_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TRANSFORM SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  for (const r of successful) {
    console.log(`   • ${r.dataset}: ${r.output_rows.toLocaleString()} rows`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    for (const r of failed) {
      console.log(`   • ${r.dataset}: ${r.error}`);
    }
  }
  
  console.log(`\n📊 Total rows: ${metadata.summary.total_rows.toLocaleString()}`);
  console.log(`📁 Output directory: ${NORMALIZED_DIR}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('Next steps:');
  console.log('  1. Run: bun run demo:generate');
  console.log('  2. Run: bun run demo:seed');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
