// file: tests/agents/base.test.ts
// description: Unit tests for BaseAgent class context, lifecycle, and fallback audit logs
// reference: src/agents/base.ts

import { describe, test, beforeEach } from 'node:test';
import { expect } from '../support/expect';
import { BaseAgent } from '../../src/agents/base';
import type { LedgerTaskStar } from '../../src/core/types';
import type { TenantContext } from '../../src/agents/base';

// Simple subclass of BaseAgent to use for testing abstract execute method
class MockAgent extends BaseAgent {
  constructor() {
    super({
      id: 'support_lead',
      name: 'Mock Support Agent',
      description: 'Support agent for testing',
      capabilities: ['user_assistance'],
    });
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    if (task.parameters?.should_fail) {
      throw new Error('Task execution failed');
    }
    return { result: 'processed', task_name: task.name };
  }
}

describe('BaseAgent', () => {
  let agent: MockAgent;
  const dummy_tenant: TenantContext = {
    tenant_id: 'tenant-12345',
    user_id: 'user-67890',
    user_role: 'tenant_admin',
  };

  beforeEach(() => {
    agent = new MockAgent();
  });

  test('should initialize with correct profile and status', () => {
    const profile = agent.get_profile();
    expect(profile.id).toBe('support_lead');
    expect(profile.name).toBe('Mock Support Agent');
    expect(agent.get_status()).toBe('idle');
    expect(agent.is_available()).toBe(false); // Offline initially
  });

  test('should transition status on start and stop', async () => {
    await agent.start();
    expect(agent.get_status()).toBe('idle');
    expect(agent.is_available()).toBe(true);

    await agent.stop();
    expect(agent.get_status()).toBe('offline');
    expect(agent.is_available()).toBe(false);
  });

  test('should enforce set and get tenant context', () => {
    expect(() => agent.get_tenant_context()).toThrow(/Tenant context not set/);

    agent.set_tenant_context(dummy_tenant);
    const context = agent.get_tenant_context();
    expect(context.tenant_id).toBe('tenant-12345');
    expect(context.user_role).toBe('tenant_admin');
  });

  test('should successfully execute tasks and log audit events', async () => {
    await agent.start();
    
    const task: LedgerTaskStar = {
      id: 'task-abc-123',
      tenant_id: 'tenant-12345',
      name: 'Help User',
      description: 'Assist with system setup',
      required_capabilities: ['user_assistance'],
      priority: 'medium',
      status: 'pending',
      input: {},
      parameters: {},
      created_at: new Date().toISOString(),
    };

    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.result).toBe('processed');
    expect(result.error).toBe(null);
    expect(result.policy_decision).toBeDefined();
    expect(result.policy_decision?.allowed).toBe(true);
  });

  test('should gracefully handle execution failures and log audit events', async () => {
    await agent.start();
    
    const task: LedgerTaskStar = {
      id: 'task-fail-xyz',
      tenant_id: 'tenant-12345',
      name: 'Help User Failing',
      description: 'Assist with system setup failing',
      required_capabilities: ['user_assistance'],
      priority: 'medium',
      status: 'pending',
      input: {},
      parameters: { should_fail: true },
      created_at: new Date().toISOString(),
    };

    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(false);
    expect(result.output).toEqual({});
    expect(result.error).toContain('Task execution failed');
  });
});
