// file: scripts/validate-config.ts
// description: Validates ClawKeeper configuration before startup
// reference: package.json, .env

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const EXPECTED_PORT = 4004;
const EXPECTED_DASHBOARD_PORT = 5174;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validate_configuration(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check .env file exists
  const env_path = join(process.cwd(), '.env');
  if (!existsSync(env_path)) {
    errors.push('.env file not found - copy from .env.example');
    return { valid: false, errors, warnings };
  }

  // Parse .env file
  const env_content = readFileSync(env_path, 'utf-8');
  const env_vars: Record<string, string> = {};
  
  for (const line of env_content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value_parts] = trimmed.split('=');
      if (key && value_parts.length > 0) {
        env_vars[key.trim()] = value_parts.join('=').trim();
      }
    }
  }

  // Validate PORT
  const port = env_vars.PORT;
  if (!port) {
    warnings.push(`PORT not set in .env - will default to ${EXPECTED_PORT}`);
  } else if (Number(port) !== EXPECTED_PORT) {
    errors.push(`PORT in .env is ${port}, but should be ${EXPECTED_PORT}`);
  }

  // Validate DATABASE_URL
  if (!env_vars.DATABASE_URL) {
    errors.push('DATABASE_URL not configured in .env');
  } else if (!env_vars.DATABASE_URL.includes('localhost:5432')) {
    warnings.push('DATABASE_URL does not point to localhost:5432 - is PostgreSQL running?');
  }

  // Validate JWT_SECRET
  if (!env_vars.JWT_SECRET) {
    errors.push('JWT_SECRET not configured in .env');
  } else if (env_vars.JWT_SECRET === 'your-secret-key-change-in-production') {
    warnings.push('JWT_SECRET is still the default value - change for production');
  }

  // Check dashboard vite.config.ts
  const vite_config_path = join(process.cwd(), 'dashboard', 'vite.config.ts');
  if (existsSync(vite_config_path)) {
    const vite_config = readFileSync(vite_config_path, 'utf-8');
    if (!vite_config.includes(`localhost:${EXPECTED_PORT}`)) {
      errors.push(`dashboard/vite.config.ts proxy is not configured for port ${EXPECTED_PORT}`);
    }
  }

  // Check dashboard api.ts
  const api_ts_path = join(process.cwd(), 'dashboard', 'src', 'lib', 'api.ts');
  if (existsSync(api_ts_path)) {
    const api_ts = readFileSync(api_ts_path, 'utf-8');
    if (!api_ts.includes(`localhost:${EXPECTED_PORT}`)) {
      errors.push(`dashboard/src/lib/api.ts is not configured for port ${EXPECTED_PORT}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function main() {
  console.log('\n🔍 Validating ClawKeeper Configuration...\n');

  const result = validate_configuration();

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
    console.log('');
  }

  if (result.errors.length > 0) {
    console.log('❌ Configuration Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    console.log('\n🔧 Fix these errors before starting the server.\n');
    process.exit(1);
  }

  console.log('✅ Configuration valid\n');
  console.log(`   API Port:       ${EXPECTED_PORT}`);
  console.log(`   Dashboard Port: ${EXPECTED_DASHBOARD_PORT}`);
  console.log(`   Database:       PostgreSQL on localhost:5432`);
  console.log('');
}

main();
