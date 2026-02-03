// file: src/db/migrate.ts
// description: Database migration runner
// reference: db/migrations/

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://clawkeeper:clawkeeper_password@localhost:5432/clawkeeper';

async function run_migration(migration_file: string) {
  console.log(`Running migration: ${migration_file}`);
  
  const sql = postgres(DATABASE_URL);
  
  try {
    const migration_path = join(process.cwd(), 'db', 'migrations', migration_file);
    const migration_sql = readFileSync(migration_path, 'utf-8');
    
    await sql.unsafe(migration_sql);
    
    console.log(`✅ Migration completed: ${migration_file}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migration_file}`, error);
    throw error;
  } finally {
    await sql.end();
  }
}

const migration_file = process.argv[2];
if (!migration_file) {
  console.error('Usage: bun run src/db/migrate.ts <migration-file>');
  process.exit(1);
}

run_migration(migration_file).catch(console.error);
