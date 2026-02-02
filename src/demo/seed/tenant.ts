// file: src/demo/seed/tenant.ts
// description: Seed demo tenant
// reference: seed/index.ts

import type { Sql } from 'postgres';

export async function seed_tenant(sql: Sql<Record<string, unknown>>, company_profile: any): Promise<string> {
  const tenant_id = '00000000-0000-0000-0000-000000000001'; // Fixed demo tenant ID
  
  // Delete existing demo tenant if exists
  await sql`DELETE FROM tenants WHERE id = ${tenant_id}`;
  
  // Create demo tenant
  await sql`
    INSERT INTO tenants (id, name, settings, status, created_at, updated_at)
    VALUES (
      ${tenant_id},
      ${company_profile.name},
      ${JSON.stringify({
        company_profile,
        fiscal_year_start: company_profile.fiscal_year_start,
        accounting_method: company_profile.accounting_method,
        tax_id: company_profile.tax_id,
        industry: company_profile.industry
      })}::jsonb,
      'active',
      NOW(),
      NOW()
    )
  `;
  
  return tenant_id;
}
