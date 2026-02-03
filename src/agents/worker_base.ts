// file: src/agents/worker_base.ts
// description: Base worker agent class with generic capability handling
// reference: src/agents/base.ts

import { BaseAgent, type AgentConfig } from './base';
import type { LedgerTaskStar, LedgerCapability } from '../core/types';

export interface WorkerMetadata {
  id: string;
  name: string;
  description: string;
  type: 'worker';
  parent_id: string;
  domain: string;
  capabilities: LedgerCapability[];
}

export class WorkerAgent extends BaseAgent {
  protected metadata: WorkerMetadata;

  constructor(metadata: WorkerMetadata) {
    super({
      id: metadata.id as any,
      name: metadata.name,
      description: metadata.description,
      capabilities: metadata.capabilities,
    });
    this.metadata = metadata;
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[${this.metadata.name}] Processing: ${name}`);

    // Generic worker execution - delegates based on capability
    const capability = required_capabilities[0]; // Use first capability
    
    return await this.execute_capability(capability, input);
  }

  protected async execute_capability(
    capability: string,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Generic capability execution
    console.log(`[${this.metadata.name}] Executing capability: ${capability}`);
    
    return {
      success: true,
      worker_id: this.metadata.id,
      worker_name: this.metadata.name,
      capability,
      message: `${capability} completed by ${this.metadata.name}`,
      processed_at: new Date().toISOString(),
    };
  }
}
