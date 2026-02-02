// file: src/agents/index.ts
// description: Agent factory and registry for ClawKeeper system
// reference: src/agents/base.ts, Constellation pattern

import { BaseAgent } from './base';
import { ClawKeeperAgent } from './clawkeeper';
import { AccountsPayableLeadAgent } from './orchestrators/accounts_payable_lead';
import type { LedgerAgentId } from '../core/types';

/**
 * Agent factory - creates agent instances by ID
 */
export function create_agent(agent_id: LedgerAgentId): BaseAgent {
  switch (agent_id) {
    case 'clawkeeper':
      return new ClawKeeperAgent();
    
    case 'accounts_payable_lead':
      return new AccountsPayableLeadAgent();
    
    // Other orchestrators would be added here
    case 'cfo':
    case 'accounts_receivable_lead':
    case 'reconciliation_lead':
    case 'compliance_lead':
    case 'reporting_lead':
    case 'integration_lead':
    case 'data_etl_lead':
    case 'support_lead':
      // Placeholder - to be implemented
      throw new Error(`Agent ${agent_id} not yet implemented`);
    
    default:
      throw new Error(`Unknown agent: ${agent_id}`);
  }
}

/**
 * Agent runtime - manages agent lifecycle
 */
export class AgentRuntime {
  private agents: Map<LedgerAgentId, BaseAgent> = new Map();

  async get_agent(agent_id: LedgerAgentId): Promise<BaseAgent> {
    // Lazy initialization
    if (!this.agents.has(agent_id)) {
      const agent = create_agent(agent_id);
      await agent.start();
      this.agents.set(agent_id, agent);
    }

    return this.agents.get(agent_id)!;
  }

  async stop_all(): Promise<void> {
    for (const [id, agent] of this.agents.entries()) {
      console.log(`Stopping agent: ${id}`);
      await agent.stop();
    }
    this.agents.clear();
  }

  get_all_profiles() {
    return Array.from(this.agents.values()).map(agent => agent.get_profile());
  }
}

// Singleton instance
export const agent_runtime = new AgentRuntime();
