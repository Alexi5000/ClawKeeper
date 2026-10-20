import { AsyncLocalStorage } from 'node:async_hooks';
import type { Sql, TransactionSql } from 'postgres';
import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import type { AppEnv } from '../types/hono';

type Database = Sql<Record<string, unknown>>;
export type TenantClaims = { tenant_id: string; user_id: string; role: string };
export type TenantTransactionRunner = (claims: TenantClaims, callback: (sql: TransactionSql<Record<string, unknown>>) => Promise<void>) => Promise<void>;

export function createTenantDatabase(pool: Database) {
  const context = new AsyncLocalStorage<{ sql: TransactionSql<Record<string, unknown>>; active: boolean }>();
  const connectionForRequest = () => {
    const scope = context.getStore();
    if (scope && !scope.active) throw new Error('Tenant transaction already finished');
    return scope?.sql ?? pool;
  };
  const run: TenantTransactionRunner = async (claims, callback) => {
    await pool.begin(async transaction => {
      await transaction`
        SELECT set_config('app.current_tenant_id', ${claims.tenant_id}, true),
               set_config('app.current_user_id', ${claims.user_id}, true),
               set_config('app.current_user_role', ${claims.role}, true)
      `;
      const scope = { sql: transaction, active: true };
      try {
        await context.run(scope, () => callback(transaction));
      } finally {
        scope.active = false;
      }
    });
  };
  const sql = new Proxy(pool, {
    apply(_target, _thisArg, args) {
      const connection = connectionForRequest();
      return Reflect.apply(connection, connection, args);
    },
    get(_target, key) {
      const connection = connectionForRequest();
      const value = Reflect.get(connection, key);
      return typeof value === 'function' ? value.bind(connection) : value;
    },
  });
  const middleware: MiddlewareHandler<AppEnv> = async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      if (['/api/auth/login', '/api/health', '/api/agents/status', '/api/admin/molten-sync'].includes(c.req.path)) {
        return next();
      }
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) return c.json({ error: 'Server configuration error' }, 500);
    let claims: TenantClaims;
    try {
      const decoded = jwt.verify(header.substring(7), secret);
      if (typeof decoded !== 'object' || !decoded ||
          !['tenant_id', 'user_id', 'role'].every(key => typeof decoded[key] === 'string' && decoded[key].length > 0)) {
        return c.json({ error: 'Invalid token' }, 401);
      }
      claims = decoded as TenantClaims;
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
    c.set('tenant_id', claims.tenant_id);
    c.set('user_id', claims.user_id);
    c.set('user_role', claims.role);
    try {
      await run(claims, async () => {
        await next();
        if (c.error || c.res.status >= 400) throw new RequestRollback();
      });
    } catch (error) {
      if (error instanceof RequestRollback) return;
      console.error('[Database] Tenant transaction failed');
      return c.json({ error: 'Database request failed' }, 503);
    }
  };
  return { sql, middleware, run };
}

class RequestRollback extends Error {}
