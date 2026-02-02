// file: src/guardrails/rate-limiter.ts
// description: Token bucket rate limiter for ClawKeeper API
// reference: ORCA SDK rate limiter pattern

interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  burst_size?: number;
}

interface TokenBucket {
  tokens: number;
  last_refill: number;
  max_tokens: number;
  refill_rate: number; // tokens per second
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed for given key (tenant_id or user_id)
   */
  async check_limit(key: string): Promise<{ allowed: boolean; retry_after?: number }> {
    const bucket = this.get_or_create_bucket(key);
    
    // Refill tokens based on time elapsed
    this.refill_bucket(bucket);

    // Check if tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Calculate retry after
    const retry_after = Math.ceil((1 - bucket.tokens) / bucket.refill_rate);

    return {
      allowed: false,
      retry_after,
    };
  }

  private get_or_create_bucket(key: string): TokenBucket {
    if (!this.buckets.has(key)) {
      const max_tokens = this.config.burst_size || this.config.requests_per_minute;
      const refill_rate = this.config.requests_per_minute / 60; // tokens per second

      this.buckets.set(key, {
        tokens: max_tokens,
        last_refill: Date.now(),
        max_tokens,
        refill_rate,
      });
    }

    return this.buckets.get(key)!;
  }

  private refill_bucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed_seconds = (now - bucket.last_refill) / 1000;
    const tokens_to_add = elapsed_seconds * bucket.refill_rate;

    bucket.tokens = Math.min(bucket.max_tokens, bucket.tokens + tokens_to_add);
    bucket.last_refill = now;
  }

  /**
   * Reset rate limit for a key (for testing or admin override)
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Get current usage for a key
   */
  get_usage(key: string): { available: number; max: number } {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return { available: this.config.requests_per_minute, max: this.config.requests_per_minute };
    }

    this.refill_bucket(bucket);

    return {
      available: Math.floor(bucket.tokens),
      max: bucket.max_tokens,
    };
  }
}

// Default rate limiter instance
export const default_rate_limiter = new RateLimiter({
  requests_per_minute: 60,
  requests_per_hour: 1000,
  burst_size: 100,
});

// Per-tenant rate limiter
export const tenant_rate_limiter = new RateLimiter({
  requests_per_minute: 30,
  requests_per_hour: 500,
  burst_size: 50,
});
