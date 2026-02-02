// file: src/guardrails/circuit-breaker.ts
// description: Circuit breaker for external API protection
// reference: ORCA SDK circuit breaker pattern

type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerConfig {
  failure_threshold: number; // Number of failures before opening
  timeout_seconds: number; // Time to wait before trying again
  success_threshold: number; // Successes needed to close from half_open
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failure_count: number = 0;
  private success_count: number = 0;
  private last_failure_time: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const elapsed = Date.now() - this.last_failure_time;
      const timeout_ms = this.config.timeout_seconds * 1000;

      if (elapsed < timeout_ms) {
        throw new Error(
          `Circuit breaker is open. Retry after ${Math.ceil((timeout_ms - elapsed) / 1000)}s`
        );
      }

      // Transition to half_open
      this.state = 'half_open';
      this.success_count = 0;
    }

    try {
      const result = await fn();

      // Success
      this.on_success();

      return result;
    } catch (error) {
      // Failure
      this.on_failure();

      throw error;
    }
  }

  private on_success(): void {
    if (this.state === 'half_open') {
      this.success_count++;

      if (this.success_count >= this.config.success_threshold) {
        // Close circuit
        this.state = 'closed';
        this.failure_count = 0;
        this.success_count = 0;
        console.log('[CircuitBreaker] Circuit closed after successful recovery');
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failure_count = 0;
    }
  }

  private on_failure(): void {
    this.failure_count++;
    this.last_failure_time = Date.now();

    if (this.state === 'half_open') {
      // Failed in half_open, reopen circuit
      this.state = 'open';
      this.success_count = 0;
      console.log('[CircuitBreaker] Circuit reopened after failure in half_open state');
    } else if (this.state === 'closed' && this.failure_count >= this.config.failure_threshold) {
      // Open circuit
      this.state = 'open';
      console.log(`[CircuitBreaker] Circuit opened after ${this.failure_count} failures`);
    }
  }

  get_state(): CircuitState {
    return this.state;
  }

  get_stats() {
    return {
      state: this.state,
      failure_count: this.failure_count,
      success_count: this.success_count,
      last_failure_time: this.last_failure_time,
    };
  }

  /**
   * Manually reset circuit breaker (admin override)
   */
  reset(): void {
    this.state = 'closed';
    this.failure_count = 0;
    this.success_count = 0;
    this.last_failure_time = 0;
    console.log('[CircuitBreaker] Circuit manually reset');
  }
}

// Circuit breakers for external services
export const plaid_circuit_breaker = new CircuitBreaker({
  failure_threshold: 5,
  timeout_seconds: 30,
  success_threshold: 2,
});

export const stripe_circuit_breaker = new CircuitBreaker({
  failure_threshold: 5,
  timeout_seconds: 30,
  success_threshold: 2,
});

export const quickbooks_circuit_breaker = new CircuitBreaker({
  failure_threshold: 3,
  timeout_seconds: 60,
  success_threshold: 2,
});

export const llm_circuit_breaker = new CircuitBreaker({
  failure_threshold: 10,
  timeout_seconds: 20,
  success_threshold: 3,
});
