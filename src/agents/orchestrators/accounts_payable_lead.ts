// file: src/agents/orchestrators/accounts_payable_lead.ts
// description: Accounts Payable Lead orchestrator - manages invoice processing and vendor payments
// reference: src/agents/base.ts, src/core/llm-client.ts

import { BaseAgent, type AgentConfig } from '../base';
import type { LedgerTaskStar } from '../../core/types';
import * as llm from '../../core/llm-client';

const AP_LEAD_CONFIG: AgentConfig = {
  id: 'accounts_payable_lead',
  name: 'Accounts Payable Lead',
  description: 'Vendor payment orchestrator managing invoice processing and payments',
  capabilities: [
    'invoice_parsing',
    'invoice_validation',
    'invoice_categorization',
    'invoice_approval',
    'payment_processing',
  ],
};

export class AccountsPayableLeadAgent extends BaseAgent {
  constructor(config: Partial<AgentConfig> = {}) {
    super({ ...AP_LEAD_CONFIG, ...config });
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[AP Lead] Processing: ${name}`);

    // Route to appropriate capability handler
    if (required_capabilities.includes('invoice_parsing')) {
      return await this.parse_invoice(input);
    }

    if (required_capabilities.includes('invoice_validation')) {
      return await this.validate_invoice(input);
    }

    if (required_capabilities.includes('invoice_categorization')) {
      return await this.categorize_invoice(input);
    }

    if (required_capabilities.includes('payment_processing')) {
      return await this.process_payment(input);
    }

    throw new Error(`No handler for capabilities: ${required_capabilities.join(', ')}`);
  }

  private async parse_invoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const ocr_text = String(input.ocr_text || input.text || '');
    
    console.log('[AP Lead] Parsing invoice from OCR text');

    try {
      const parsed = await llm.parse_invoice(ocr_text);
      
      console.log(`[AP Lead] Parsed invoice: ${parsed.vendor_name}, Amount: $${parsed.amount / 100}`);

      return {
        success: true,
        invoice_data: parsed,
        requires_review: parsed.confidence < 0.8,
      };
    } catch (error) {
      console.error('[AP Lead] Invoice parsing failed:', error);
      throw error;
    }
  }

  private async validate_invoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const invoice = input.invoice as any;
    const errors: string[] = [];

    // Validate required fields
    if (!invoice.vendor_name) errors.push('Vendor name is required');
    if (!invoice.invoice_number) errors.push('Invoice number is required');
    if (!invoice.amount || invoice.amount <= 0) errors.push('Amount must be positive');
    if (!invoice.due_date) errors.push('Due date is required');

    // Validate amounts
    if (invoice.line_items) {
      const line_total = invoice.line_items.reduce((sum: number, item: any) => sum + item.amount, 0);
      if (Math.abs(line_total - invoice.amount) > 1) {
        errors.push('Line items do not sum to total amount');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      invoice,
    };
  }

  private async categorize_invoice(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const invoice = input.invoice as any;
    
    console.log('[AP Lead] Categorizing invoice line items');

    const categorized_items = await Promise.all(
      invoice.line_items.map(async (item: any) => {
        const category = await llm.categorize_expense(item.description);
        return { ...item, category };
      })
    );

    return {
      invoice: {
        ...invoice,
        line_items: categorized_items,
      },
      categorized: true,
    };
  }

  private async process_payment(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const invoice_id = String(input.invoice_id);
    const payment_method = String(input.payment_method || 'stripe');

    console.log(`[AP Lead] Processing payment for invoice ${invoice_id} via ${payment_method}`);

    // In full implementation, this would call payment gateway skill
    return {
      success: true,
      invoice_id,
      payment_method,
      status: 'paid',
      paid_at: new Date().toISOString(),
      message: 'Payment processed successfully',
    };
  }
}
