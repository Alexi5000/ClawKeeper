#!/usr/bin/env bun
// file: scripts/setup-demo.ts
// description: Quick setup script for demo environment
// reference: src/demo/seed/index.ts

import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://localhost:5432/clawkeeper', {
  max: 1,
});

async function setup_demo() {
  console.log('🚀 Setting up ClawKeeper demo environment...\n');

  try {
    // Create demo tenant
    console.log('Creating demo tenant...');
    
    // First check if a tenant already exists
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

    // Create demo users
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

    console.log('\n✅ Demo environment ready!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Demo Credentials (Simple):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Email:    admin@demo.com');
    console.log('Password: password123');
    console.log('');
    console.log('Email:    accountant@demo.com');
    console.log('Password: password123');
    console.log('');
    console.log('Email:    viewer@demo.com');
    console.log('Password: password123');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Demo Credentials (Meridian Tech):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Email:    admin@meridiantech.example');
    console.log('Password: Demo123!');
    console.log('');
    console.log('Email:    accountant@meridiantech.example');
    console.log('Password: Demo123!');
    console.log('');
    console.log('Email:    viewer@meridiantech.example');
    console.log('Password: Demo123!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Login at: http://localhost:5174/login');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup_demo();
