// file: src/demo/seed/users.ts
// description: Seed demo users
// reference: seed/index.ts

import type { Sql } from 'postgres';
import bcrypt from 'bcryptjs';

export async function seed_users(sql: Sql<Record<string, unknown>>, tenant_id: string): Promise<string> {
  const password_hash = await bcrypt.hash('Demo123!', 10);
  
  const users = [
    {
      email: 'admin@meridiantech.example',
      name: 'Alex Rivera',
      role: 'tenant_admin'
    },
    {
      email: 'accountant@meridiantech.example',
      name: 'Jordan Chen',
      role: 'accountant'
    },
    {
      email: 'viewer@meridiantech.example',
      name: 'Sam Taylor',
      role: 'viewer'
    },
    {
      email: 'cfo@meridiantech.example',
      name: 'Morgan Smith',
      role: 'accountant'
    },
    {
      email: 'support@meridiantech.example',
      name: 'Casey Davis',
      role: 'viewer'
    }
  ];
  
  let admin_user_id: string = '';
  
  for (const user of users) {
    const [result] = await sql`
      INSERT INTO users (tenant_id, email, password_hash, role, name, created_at, last_login)
      VALUES (
        ${tenant_id},
        ${user.email},
        ${password_hash},
        ${user.role},
        ${user.name},
        NOW(),
        NULL
      )
      ON CONFLICT (tenant_id, email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          role = EXCLUDED.role
      RETURNING id
    `;
    
    if (user.email === 'admin@meridiantech.example') {
      admin_user_id = result.id;
    }
  }
  
  return admin_user_id;
}
