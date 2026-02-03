// file: src/agents/index.ts
// description: Agent factory and registry for ClawKeeper system
// reference: src/agents/base.ts, Constellation pattern

import { BaseAgent } from './base';
import { ClawKeeperAgent } from './clawkeeper';
import { AccountsPayableLeadAgent } from './orchestrators/accounts_payable_lead';
import { CFOAgent } from './orchestrators/cfo';
import { AccountsReceivableLeadAgent } from './orchestrators/accounts_receivable_lead';
import { ReconciliationLeadAgent } from './orchestrators/reconciliation_lead';
import { ComplianceLeadAgent } from './orchestrators/compliance_lead';
import { ReportingLeadAgent } from './orchestrators/reporting_lead';
import { IntegrationLeadAgent } from './orchestrators/integration_lead';
import { DataETLLeadAgent } from './orchestrators/data_etl_lead';
import { SupportLeadAgent } from './orchestrators/support_lead';
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
    
    case 'cfo':
      return new CFOAgent();
    
    case 'accounts_receivable_lead':
      return new AccountsReceivableLeadAgent();
    
    case 'reconciliation_lead':
      return new ReconciliationLeadAgent();
    
    case 'compliance_lead':
      return new ComplianceLeadAgent();
    
    case 'reporting_lead':
      return new ReportingLeadAgent();
    
    case 'integration_lead':
      return new IntegrationLeadAgent();
    
    case 'data_etl_lead':
      return new DataETLLeadAgent();
    
    case 'support_lead':
      return new SupportLeadAgent();
    
    default:
      throw new Error(`Unknown agent: ${agent_id}`);
  }
}

import { worker_registry } from './worker_registry';
import type { AgentProfile } from '../core/types';

/**
 * Agent runtime - manages agent lifecycle for all 110 agents
 */
export class AgentRuntime {
  private agents: Map<string, BaseAgent> = new Map();

  async get_agent(agent_id: string): Promise<BaseAgent> {
    // Lazy initialization
    if (!this.agents.has(agent_id)) {
      let agent: BaseAgent;
      
      // Try orchestrator/CEO agents first
      if (['clawkeeper', 'cfo', 'accounts_payable_lead', 'accounts_receivable_lead',
           'reconciliation_lead', 'compliance_lead', 'reporting_lead', 
           'integration_lead', 'data_etl_lead', 'support_lead'].includes(agent_id)) {
        agent = create_agent(agent_id as LedgerAgentId);
      } else {
        // Try worker agents
        const worker = worker_registry.get_worker(agent_id);
        if (!worker) {
          throw new Error(`Unknown agent: ${agent_id}`);
        }
        agent = worker;
      }
      
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

  get_all_profiles(): AgentProfile[] {
    const profiles: AgentProfile[] = [];
    
    // Add orchestrator and CEO agents
    for (const agent of this.agents.values()) {
      profiles.push(agent.get_profile());
    }
    
    // Add all worker metadata (even if not initialized)
    const worker_metadata = worker_registry.get_all_workers();
    for (const metadata of worker_metadata) {
      if (!this.agents.has(metadata.id)) {
        profiles.push({
          id: metadata.id as any,
          name: metadata.name,
          description: metadata.description,
          capabilities: metadata.capabilities,
          status: 'idle',
          current_task: null,
          metadata: {
            type: metadata.type,
            parent_id: metadata.parent_id,
            domain: metadata.domain,
          },
        });
      }
    }
    
    return profiles;
  }
  
  get_agent_count(): { total: number; ceo: number; orchestrators: number; workers: number } {
    const workers = worker_registry.get_all_workers();
    return {
      total: 1 + 9 + workers.length, // CEO + 9 orchestrators + workers
      ceo: 1,
      orchestrators: 9,
      workers: workers.length,
    };
  }
}

// Singleton instance
export const agent_runtime = new AgentRuntime();
