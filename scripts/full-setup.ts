#!/usr/bin/env bun
// file: scripts/full-setup.ts
// description: Complete database and demo setup using postgres client
// reference: db/schema.sql, db/seed.sql

import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://localhost:5432/clawkeeper', {
  max: 1,
});

async function full_setup() {
  console.log('🚀 ClawKeeper Full Setup\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Create demo tenant
    console.log('Creating demo tenant...');
    const existing_tenants = await sql`
      SELECT id FROM tenants WHERE name = 'Demo Company' LIMIT 1
    `;
    
    let tenant_id;
    
    if (existing_tenants.length > 0) {
      tenant_id = existing_tenants[0].id;
      console.log(`✓ Using existing tenant: ${tenant_id}\n`);
    } else {
      const [tenant] = await sql`
        INSERT INTO tenants (name, status, created_at)
        VALUES ('Demo Company', 'active', NOW())
        RETURNING id
      `;
      tenant_id = tenant.id;
      console.log(`✓ Tenant created: ${tenant_id}\n`);
    }

    // 5. Create demo users
    console.log('Creating demo users...');
    const password_hash_simple = await bcrypt.hash('password123', 10);
    const password_hash_complex = await bcrypt.hash('Demo123!', 10);
    
    const demo_users = [
      // Simple credentials (password123)
      { email: 'admin@demo.com', name: 'Demo Admin', role: 'tenant_admin', password_hash: password_hash_simple },
      { email: 'accountant@demo.com', name: 'Demo Accountant', role: 'accountant', password_hash: password_hash_simple },
      { email: 'viewer@demo.com', name: 'Demo Viewer', role: 'viewer', password_hash: password_hash_simple },
      
      // Meridian Tech users (Demo123!)
      { email: 'admin@meridiantech.example', name: 'Alex Rivera', role: 'tenant_admin', password_hash: password_hash_complex },
      { email: 'accountant@meridiantech.example', name: 'Jordan Chen', role: 'accountant', password_hash: password_hash_complex },
      { email: 'viewer@meridiantech.example', name: 'Sam Taylor', role: 'viewer', password_hash: password_hash_complex },
    ];

    for (const user of demo_users) {
      await sql`
        INSERT INTO users (tenant_id, email, password_hash, role, name, created_at)
        VALUES (
          ${tenant_id},
          ${user.email},
          ${user.password_hash},
          ${user.role},
          ${user.name},
          NOW()
        )
        ON CONFLICT (tenant_id, email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            role = EXCLUDED.role
      `;
      console.log(`✓ User created: ${user.email}`);
    }

    console.log('\n✅ Setup Complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Demo Credentials (Simple):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Email:    admin@demo.com');
    console.log('Password: password123');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Ready to Deploy!\n');
    console.log('1. Start API:       bun run dev');
    console.log('2. Start Dashboard: bun run dashboard:dev');
    console.log('3. Login at:        http://localhost:5174/login');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

full_setup();
