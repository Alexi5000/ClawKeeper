// file: src/agents/orchestrators/accounts_receivable_lead.ts
// description: Accounts Receivable Lead orchestrator - manages customer collections
// reference: src/agents/base.ts, agents/orchestrators/accounts-receivable-lead/AGENT.md

import { BaseAgent, type AgentConfig } from '../base';
import type { LedgerTaskStar } from '../../core/types';
import * as llm from '../../core/llm-client';

const AR_LEAD_CONFIG: AgentConfig = {
  id: 'accounts_receivable_lead',
  name: 'Accounts Receivable Lead',
  description: 'Customer collections orchestrator managing invoicing and payments',
  capabilities: [
    'invoice_parsing',
    'invoice_validation',
    'payment_processing',
  ],
};

export class AccountsReceivableLeadAgent extends BaseAgent {
  constructor(config: Partial<AgentConfig> = {}) {
    super({ ...AR_LEAD_CONFIG, ...config });
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[AR Lead] Processing: ${name}`);

    // Route to appropriate capability handler
    if (required_capabilities.includes('invoice_parsing')) {
      return await this.generate_customer_invoice(input);
    }

    if (required_capabilities.includes('invoice_validation')) {
      return await this.validate_customer_invoice(input);
    }

    if (required_capabilities.includes('payment_processing')) {
      return await this.record_customer_payment(input);
    }

    throw new Error(`No handler for capabilities: ${required_capabilities.join(', ')}`);
  }

  private async generate_customer_invoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('[AR Lead] Generating customer invoice');
    
    const customer_id = String(input.customer_id || '');
    const amount = Number(input.amount || 0);
    
    return {
      success: true,
      invoice_id: crypto.randomUUID(),
      customer_id,
      amount,
      message: 'Customer invoice generated',
    };
  }

  private async validate_customer_invoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const invoice = input.invoice as any;
    const errors: string[] = [];

    if (!invoice.customer_name) errors.push('Customer name is required');
    if (!invoice.invoice_number) errors.push('Invoice number is required');
    if (!invoice.amount || invoice.amount <= 0) errors.push('Amount must be positive');

    return {
      valid: errors.length === 0,
      errors,
      invoice,
    };
  }

  private async record_customer_payment(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const invoice_id = String(input.invoice_id);
    const amount = Number(input.amount || 0);

    console.log(`[AR Lead] Recording customer payment for invoice ${invoice_id}`);

    return {
      success: true,
      invoice_id,
      amount_paid: amount,
      status: 'payment_recorded',
      recorded_at: new Date().toISOString(),
    };
  }
}
