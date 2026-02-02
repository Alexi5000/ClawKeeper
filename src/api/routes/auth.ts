// file: src/api/routes/auth.ts
// description: Authentication routes for ClawKeeper API
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppEnv } from '../../types/hono';

export function auth_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // Login
  app.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    // Find user
    const [user] = await sql`
      SELECT id, tenant_id, email, password_hash, role, name
      FROM users
      WHERE email = ${email}
    `;

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const is_valid = await bcrypt.compare(password, user.password_hash);
    if (!is_valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      {
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn } as SignOptions
    );

    // Update last login
    await sql`
      UPDATE users
      SET last_login = NOW()
      WHERE id = ${user.id}
    `;

    return c.json({
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  });

  // Get current user
  app.get('/me', async (c) => {
    const user_id = c.get('user_id');
    const tenant_id = c.get('tenant_id');

    const [user] = await sql`
      SELECT id, tenant_id, email, name, role, created_at, last_login
      FROM users
      WHERE id = ${user_id}
      AND tenant_id = ${tenant_id}
    `;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  });

  return app;
}
