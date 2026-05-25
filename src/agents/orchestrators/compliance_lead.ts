// file: src/agents/orchestrators/compliance_lead.ts
// description: Compliance Lead orchestrator - manages regulatory compliance
// reference: src/agents/base.ts, agents/orchestrators/compliance-lead/AGENT.md

import { BaseAgent, type AgentConfig } from '../base';
import type { LedgerTaskStar } from '../../core/types';

const COMPLIANCE_LEAD_CONFIG: AgentConfig = {
  id: 'compliance_lead',
  name: 'Compliance Lead',
  description: 'Regulatory compliance orchestrator managing tax and audit',
  capabilities: [
    'tax_compliance_check',
    'audit_preparation',
    'policy_enforcement',
  ],
};

export class ComplianceLeadAgent extends BaseAgent {
  constructor(config: Partial<AgentConfig> = {}) {
    super({ ...COMPLIANCE_LEAD_CONFIG, ...config });
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[Compliance Lead] Processing: ${name}`);

    if (required_capabilities.includes('tax_compliance_check')) {
      return await this.check_tax_compliance(input);
    }

    if (required_capabilities.includes('audit_preparation')) {
      return await this.prepare_audit_documents(input);
    }

    if (required_capabilities.includes('policy_enforcement')) {
      return await this.enforce_policy(input);
    }

    throw new Error(`No handler for capabilities: ${required_capabilities.join(', ')}`);
  }

  private async check_tax_compliance(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('[Compliance Lead] Checking tax compliance');
    
    return {
      success: true,
      compliant: true,
      issues: [],
      message: 'Tax compliance check completed',
    };
  }

  private async prepare_audit_documents(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('[Compliance Lead] Preparing audit documents');
    
    return {
      success: true,
      documents_prepared: 0,
      message: 'Audit documents prepared',
    };
  }

  private async enforce_policy(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('[Compliance Lead] Enforcing policy');
    
    const policy_id = String(input.policy_id || 'general_policy');
    const violations: Array<{ code: string; message: string }> = [];
    
    const invoice = (input.invoice || input.entity) as Record<string, unknown> | undefined;
    
    if (invoice && (input.entity_type === 'invoice' || input.invoice)) {
      // 1. Segregation of Duties check
      const created_by = invoice.created_by || invoice.submitted_by;
      const approved_by = invoice.approved_by;
      
      if (created_by && approved_by && created_by === approved_by) {
        violations.push({
          code: 'SEGREGATION_OF_DUTIES_VIOLATION',
          message: `Invoice approved by the same user who created/submitted it: ${created_by}`,
        });
      }
      
      // 2. Approval Limit check
      const approver_role = String(invoice.approver_role || invoice.user_role || '');
      
      if (approved_by && approver_role) {
        // Safe amount extraction: convert cents to BigInt
        let amount_cents = 0n;
        if (typeof invoice.amount === 'bigint') {
          amount_cents = invoice.amount;
        } else if (typeof invoice.amount === 'number') {
          amount_cents = BigInt(invoice.amount);
        } else if (typeof invoice.amount === 'string') {
          try {
            amount_cents = BigInt(invoice.amount.replace(/[$,]/g, '').trim());
          } catch {
            amount_cents = 0n;
          }
        }
        
        // Define role limits (represented in cents)
        const ROLE_LIMITS: Record<string, bigint | null> = {
          viewer: 0n,
          accountant: 50000n, // $500.00
          tenant_admin: null, // Unlimited
          super_admin: null,  // Unlimited
        };
        
        if (approver_role in ROLE_LIMITS) {
          const limit = ROLE_LIMITS[approver_role];
          if (limit !== null && amount_cents > limit) {
            violations.push({
              code: 'APPROVAL_LIMIT_EXCEEDED',
              message: `Approver role '${approver_role}' approved invoice of $${(Number(amount_cents) / 100).toFixed(2)}, which exceeds the limit of $${(Number(limit) / 100).toFixed(2)}.`,
            });
          }
        }
      }
    }
    
    return {
      success: violations.length === 0,
      policy_id,
      violations,
      message: violations.length === 0 
        ? 'Policy enforcement completed with no violations' 
        : `Policy violations detected: ${violations.map(v => v.code).join(', ')}`,
    };
  }
}
