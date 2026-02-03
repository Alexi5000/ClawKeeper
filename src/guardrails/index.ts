// file: src/guardrails/index.ts
// description: Guardrails exports for ClawKeeper security
// reference: validators.ts, rate-limiter.ts, circuit-breaker.ts, audit-logger.ts

export * from './validators';
export * from './rate-limiter';
export * from './circuit-breaker';
export * from './audit-logger';

// Unified guardrails middleware for Hono
import type { Context, Next } from 'hono';
import { detect_pii, detect_injection } from './validators';
import { default_rate_limiter, tenant_rate_limiter } from './rate-limiter';

export async function guardrails_middleware(c: Context, next: Next) {
  const tenant_id = c.get('tenant_id');
  const user_id = c.get('user_id');

  // Rate limiting
  if (tenant_id) {
    const result = await tenant_rate_limiter.check_limit(tenant_id);
    if (!result.allowed) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          retry_after: result.retry_after,
        },
        429
      );
    }
  }

  // Note: Body validation (PII/injection detection) is disabled in middleware
  // to avoid interfering with Hono's body parsing. Instead, routes should
  // validate their inputs using Zod schemas and the validators module directly.
  
  await next();
}
