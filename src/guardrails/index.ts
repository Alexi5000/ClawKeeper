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

  // Check request body for PII and injection
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    const body = await c.req.json();
    const body_text = JSON.stringify(body);

    // PII detection
    const pii_check = detect_pii(body_text);
    if (pii_check.has_pii) {
      console.warn(`[Guardrails] PII detected in request: ${pii_check.types.join(', ')}`);
      // Log but allow (may be legitimate invoice data)
    }

    // Injection detection
    if (detect_injection(body_text)) {
      console.error('[Guardrails] Potential prompt injection detected');
      return c.json({ error: 'Invalid input detected' }, 400);
    }

    // Restore body for next handler
    c.req.bodyCache = {
      bodyInit: JSON.stringify(body),
      bodyUsed: false,
    } as any;
  }

  await next();
}
