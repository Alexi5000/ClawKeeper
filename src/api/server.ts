// file: src/api/server.ts
// description: Hono API server for ClawKeeper with multi-tenant support
// reference: src/api/routes/*.ts, Constellation server pattern

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import postgres from 'postgres';
import { auth_routes } from './routes/auth';
import { invoice_routes } from './routes/invoices';
import { report_routes } from './routes/reports';
import { reconciliation_routes } from './routes/reconciliation';
import { agent_routes } from './routes/agents';
import { account_routes } from './routes/accounts';
import { create_dashboard_routes } from './routes/dashboard';
import { create_activity_routes } from './routes/activity';
import { create_vendor_routes } from './routes/vendors';
import { create_customer_routes } from './routes/customers';
import { create_metrics_routes } from './routes/metrics';
import type { AppEnv } from '../types/hono';

// Database connection
const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
});

// Create Hono app with typed environment
const app = new Hono<AppEnv>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Tenant context middleware
app.use('/api/*', async (c, next) => {
  const auth_header = c.req.header('Authorization');
  
  if (!auth_header || !auth_header.startsWith('Bearer ')) {
    // Skip for public endpoints
    if (c.req.path === '/api/auth/login' || c.req.path === '/api/health' || c.req.path === '/api/agents/status') {
      return next();
    }
    
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = auth_header.substring(7);
  
  // Verify JWT and extract user info (simplified for now)
  // In full implementation, verify signature and expiration
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    // Set context for this request
    c.set('tenant_id', decoded.tenant_id);
    c.set('user_id', decoded.user_id);
    c.set('user_role', decoded.role);
    
    // Set PostgreSQL session variables for RLS
    await sql`SET app.current_tenant_id = ${decoded.tenant_id}`;
    await sql`SET app.current_user_id = ${decoded.user_id}`;
    await sql`SET app.current_user_role = ${decoded.role}`;
    
    return next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'clawkeeper-api',
    version: '0.1.0',
  });
});

// Routes
app.route('/api/auth', auth_routes(sql));
app.route('/api/invoices', invoice_routes(sql));
app.route('/api/reports', report_routes(sql));
app.route('/api/reconciliation', reconciliation_routes(sql));
app.route('/api/agents', agent_routes(sql));
app.route('/api/accounts', account_routes(sql));
app.route('/api/dashboard', create_dashboard_routes(sql));
app.route('/api/activity', create_activity_routes(sql));
app.route('/api/vendors', create_vendor_routes(sql));
app.route('/api/customers', create_customer_routes(sql));
app.route('/api/metrics', create_metrics_routes(sql));

// WebSocket endpoint (placeholder)
app.get('/ws', (c) => {
  return c.json({ message: 'WebSocket endpoint - to be implemented' });
});

// Start server
const port = Number(process.env.PORT) || 4004;

console.log(`🔐 ClawKeeper API Server starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
