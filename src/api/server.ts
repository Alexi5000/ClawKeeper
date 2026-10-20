// file: src/api/server.ts
// description: Hono API server for ClawKeeper with multi-tenant support
// reference: src/api/routes/*.ts, orcaflow server pattern

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import postgres from 'postgres';
import { createTenantDatabase } from './tenant-database';
import { guardrails_middleware } from '../guardrails';
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
import { admin_routes } from './routes/admin';
import { websocket_handler } from './websocket_handler';
import type { AppEnv } from '../types/hono';

// Database connection
const pool = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
});
const { sql, middleware: tenantMiddleware, run: runTenantTransaction } = createTenantDatabase(pool);

// Create Hono app with typed environment
const app = new Hono<AppEnv>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Guardrails middleware (rate limiting, PII detection, injection detection)
app.use('/api/*', guardrails_middleware);

app.use('/api/*', tenantMiddleware);

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
app.route('/api/agents', agent_routes(sql, runTenantTransaction));
app.route('/api/accounts', account_routes(sql));
app.route('/api/dashboard', create_dashboard_routes(sql));
app.route('/api/activity', create_activity_routes(sql));
app.route('/api/vendors', create_vendor_routes(sql));
app.route('/api/customers', create_customer_routes(sql));
app.route('/api/metrics', create_metrics_routes(sql));
app.route('/api/admin', admin_routes());

// WebSocket endpoint
app.get('/ws', (c) => {
  // Return upgrade info for HTTP GET (browser compatibility)
  return c.json({
    message: 'WebSocket endpoint ready',
    usage: 'Upgrade this connection to WebSocket protocol',
    stats: websocket_handler.get_stats(),
  });
});

// Start server
const port = Number(process.env.PORT) || 4004;

// Port 4004 is the canonical port per .env.ports
// Remove obsolete validation against 9100

console.log(`
╔═════════════════════════════════════════════════════════════════╗
║  🔐 ClawKeeper API Server                                       ║
╚═════════════════════════════════════════════════════════════════╝

Port:        ${port}
Environment: ${process.env.NODE_ENV || 'development'}
Database:    ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
JWT Secret:  ${process.env.JWT_SECRET ? 'Configured' : '⚠️  NOT CONFIGURED - Using default'}

Health:      http://localhost:${port}/health
API:         http://localhost:${port}/api
Dashboard:   http://localhost:3000

Ready for requests...
`);

export default {
  port,
  fetch: app.fetch,
  websocket: {
    open: websocket_handler.open.bind(websocket_handler),
    message: websocket_handler.message.bind(websocket_handler),
    close: websocket_handler.close.bind(websocket_handler),
    error: websocket_handler.error.bind(websocket_handler),
  },
};

// Export websocket handler for use in agents
export { websocket_handler, emit_agent_status } from './websocket_handler';
