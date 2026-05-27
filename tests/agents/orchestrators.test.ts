// file: tests/agents/orchestrators.test.ts
// description: Unit tests for the remaining 8 orchestrator agents in the ClawKeeper system
// reference: src/agents/orchestrators/*.ts, tests/support/expect.ts

import { describe, test } from 'node:test';
import { expect } from '../support/expect';
import { CFOAgent } from '../../src/agents/orchestrators/cfo';
import { AccountsReceivableLeadAgent } from '../../src/agents/orchestrators/accounts_receivable_lead';
import { ReconciliationLeadAgent } from '../../src/agents/orchestrators/reconciliation_lead';
import { ComplianceLeadAgent } from '../../src/agents/orchestrators/compliance_lead';
import { ReportingLeadAgent } from '../../src/agents/orchestrators/reporting_lead';
import { IntegrationLeadAgent } from '../../src/agents/orchestrators/integration_lead';
import { DataETLLeadAgent } from '../../src/agents/orchestrators/data_etl_lead';
import { SupportLeadAgent } from '../../src/agents/orchestrators/support_lead';
import type { LedgerTaskStar } from '../../src/core/types';
import type { TenantContext } from '../../src/agents/base';

const dummy_tenant: TenantContext = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0001-000000000001',
  user_role: 'tenant_admin',
};

function create_test_task(
  agent_id: string,
  capability: string,
  input: Record<string, unknown> = {},
  parameters: Record<string, unknown> = { approval_id: 'dummy-approval-id' }
): LedgerTaskStar {
  return {
    id: crypto.randomUUID(),
    tenant_id: dummy_tenant.tenant_id,
    name: `Test Task for ${capability}`,
    description: `Testing ${capability} execution`,
    required_capabilities: [capability as any],
    assigned_agent: agent_id as any,
    status: 'assigned',
    priority: 'normal',
    input,
    parameters,
    created_at: new Date().toISOString(),
  };
}

describe('CFOAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new CFOAgent();
    expect(agent.get_id()).toBe('cfo');
    expect(agent.get_name()).toBe('CFO');
    expect(agent.get_capabilities()).toContain('forecasting');
    expect(agent.get_capabilities()).toContain('report_analysis');
    expect(agent.get_capabilities()).toContain('report_generation');
  });

  test('should route forecasting capability successfully', async () => {
    const agent = new CFOAgent();
    await agent.start();
    const task = create_test_task('cfo', 'forecasting', { period: '6 months' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.forecast_period).toBe('6 months');
    await agent.stop();
  });

  test('should route report_analysis capability successfully', async () => {
    const agent = new CFOAgent();
    await agent.start();
    const task = create_test_task('cfo', 'report_analysis');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.analysis).toBe('Financial reports analyzed successfully');
    await agent.stop();
  });

  test('should route report_generation capability successfully', async () => {
    const agent = new CFOAgent();
    await agent.start();
    const task = create_test_task('cfo', 'report_generation', { report_type: 'q2_forecast' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.report_type).toBe('q2_forecast');
    await agent.stop();
  });
});

describe('AccountsReceivableLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new AccountsReceivableLeadAgent();
    expect(agent.get_id()).toBe('accounts_receivable_lead');
    expect(agent.get_capabilities()).toContain('invoice_parsing');
    expect(agent.get_capabilities()).toContain('invoice_validation');
    expect(agent.get_capabilities()).toContain('payment_processing');
  });

  test('should route invoice_parsing capability successfully', async () => {
    const agent = new AccountsReceivableLeadAgent();
    await agent.start();
    const task = create_test_task('accounts_receivable_lead', 'invoice_parsing', { customer_id: 'cust_abc', amount: 15000 });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.customer_id).toBe('cust_abc');
    expect(result.output.amount).toBe(15000);
    expect(result.output.invoice_id).toBeDefined();
    await agent.stop();
  });

  test('should route invoice_validation capability successfully', async () => {
    const agent = new AccountsReceivableLeadAgent();
    await agent.start();
    const task = create_test_task('accounts_receivable_lead', 'invoice_validation', {
      invoice: {
        customer_name: 'Jane Doe',
        invoice_number: 'AR-99',
        amount: 25000,
      },
    });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.valid).toBe(true);
    expect(result.output.errors).toHaveLength(0);
    await agent.stop();
  });

  test('should route payment_processing capability successfully', async () => {
    const agent = new AccountsReceivableLeadAgent();
    await agent.start();
    const task = create_test_task('accounts_receivable_lead', 'payment_processing', { invoice_id: 'inv_ar_123', amount: 5000 });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.invoice_id).toBe('inv_ar_123');
    expect(result.output.amount_paid).toBe(5000);
    await agent.stop();
  });
});

describe('ReconciliationLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new ReconciliationLeadAgent();
    expect(agent.get_id()).toBe('reconciliation_lead');
    expect(agent.get_capabilities()).toContain('transaction_matching');
    expect(agent.get_capabilities()).toContain('discrepancy_detection');
    expect(agent.get_capabilities()).toContain('discrepancy_resolution');
  });

  test('should route transaction_matching capability successfully', async () => {
    const agent = new ReconciliationLeadAgent();
    await agent.start();
    const task = create_test_task('reconciliation_lead', 'transaction_matching', { account_id: 'acc_77' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.account_id).toBe('acc_77');
    await agent.stop();
  });

  test('should route discrepancy_detection capability successfully', async () => {
    const agent = new ReconciliationLeadAgent();
    await agent.start();
    const task = create_test_task('reconciliation_lead', 'discrepancy_detection');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.discrepancies_found).toBe(0);
    await agent.stop();
  });

  test('should route discrepancy_resolution capability successfully', async () => {
    const agent = new ReconciliationLeadAgent();
    await agent.start();
    const task = create_test_task('reconciliation_lead', 'discrepancy_resolution', { discrepancy_id: 'disc_456' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.discrepancy_id).toBe('disc_456');
    expect(result.output.resolution).toBe('resolved');
    await agent.stop();
  });
});

describe('ComplianceLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new ComplianceLeadAgent();
    expect(agent.get_id()).toBe('compliance_lead');
    expect(agent.get_capabilities()).toContain('tax_compliance_check');
    expect(agent.get_capabilities()).toContain('audit_preparation');
    expect(agent.get_capabilities()).toContain('policy_enforcement');
  });

  test('should route tax_compliance_check capability successfully', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'tax_compliance_check');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.compliant).toBe(true);
    await agent.stop();
  });

  test('should route audit_preparation capability successfully', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'audit_preparation');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.documents_prepared).toBe(0);
    await agent.stop();
  });

  test('should route policy_enforcement capability successfully', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'policy_enforcement', { policy_id: 'pol_segregation' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.policy_id).toBe('pol_segregation');
    await agent.stop();
  });

  test('should pass compliance policy checks on valid invoices', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'policy_enforcement', {
      entity_type: 'invoice',
      invoice: {
        amount: 25000n, // $250.00 in cents
        created_by: 'user_a',
        approved_by: 'user_b',
        approver_role: 'accountant',
      },
    });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    const output = result.output as any;
    expect(output.success).toBe(true);
    expect(output.violations).toHaveLength(0);
    await agent.stop();
  });

  test('should report segregation of duties violation when creator and approver are identical', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'policy_enforcement', {
      entity_type: 'invoice',
      invoice: {
        amount: 25000n,
        created_by: 'user_a',
        approved_by: 'user_a',
        approver_role: 'accountant',
      },
    });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true); // Task execution is successful but policy has violations
    const output = result.output as any;
    expect(output.success).toBe(false);
    expect(output.violations).toHaveLength(1);
    expect(output.violations[0].code).toBe('SEGREGATION_OF_DUTIES_VIOLATION');
    await agent.stop();
  });

  test('should report approval limit violation when amount exceeds accountant threshold', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'policy_enforcement', {
      entity_type: 'invoice',
      invoice: {
        amount: 60000n, // $600.00 in cents (> $500.00 threshold)
        created_by: 'user_a',
        approved_by: 'user_b',
        approver_role: 'accountant',
      },
    });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    const output = result.output as any;
    expect(output.success).toBe(false);
    expect(output.violations).toHaveLength(1);
    expect(output.violations[0].code).toBe('APPROVAL_LIMIT_EXCEEDED');
    await agent.stop();
  });

  test('should report violation when viewer role approves any invoice', async () => {
    const agent = new ComplianceLeadAgent();
    await agent.start();
    const task = create_test_task('compliance_lead', 'policy_enforcement', {
      entity_type: 'invoice',
      invoice: {
        amount: 100n, // $1.00 in cents
        created_by: 'user_a',
        approved_by: 'user_b',
        approver_role: 'viewer', // viewer has 0n limit
      },
    });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    const output = result.output as any;
    expect(output.success).toBe(false);
    expect(output.violations).toHaveLength(1);
    expect(output.violations[0].code).toBe('APPROVAL_LIMIT_EXCEEDED');
    await agent.stop();
  });
});

describe('ReportingLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new ReportingLeadAgent();
    expect(agent.get_id()).toBe('reporting_lead');
    expect(agent.get_capabilities()).toContain('report_generation');
    expect(agent.get_capabilities()).toContain('report_analysis');
  });

  test('should route report_generation capability successfully', async () => {
    const agent = new ReportingLeadAgent();
    await agent.start();
    const task = create_test_task('reporting_lead', 'report_generation', { report_type: 'balance_sheet' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.report_type).toBe('balance_sheet');
    expect(result.output.report_id).toBeDefined();
    await agent.stop();
  });

  test('should route report_analysis capability successfully', async () => {
    const agent = new ReportingLeadAgent();
    await agent.start();
    const task = create_test_task('reporting_lead', 'report_analysis');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.insights).toHaveLength(0);
    await agent.stop();
  });
});

describe('IntegrationLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new IntegrationLeadAgent();
    expect(agent.get_id()).toBe('integration_lead');
    expect(agent.get_capabilities()).toContain('bank_sync');
    expect(agent.get_capabilities()).toContain('accounting_sync');
    expect(agent.get_capabilities()).toContain('payment_gateway_integration');
  });

  test('should route bank_sync capability successfully', async () => {
    const agent = new IntegrationLeadAgent();
    await agent.start();
    const task = create_test_task('integration_lead', 'bank_sync', { account_id: 'acc_plaid_123' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.account_id).toBe('acc_plaid_123');
    await agent.stop();
  });

  test('should route accounting_sync capability successfully', async () => {
    const agent = new IntegrationLeadAgent();
    await agent.start();
    const task = create_test_task('integration_lead', 'accounting_sync', { system: 'xero' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.system).toBe('xero');
    await agent.stop();
  });

  test('should route payment_gateway_integration capability successfully', async () => {
    const agent = new IntegrationLeadAgent();
    await agent.start();
    const task = create_test_task('integration_lead', 'payment_gateway_integration', { gateway: 'paypal' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.gateway).toBe('paypal');
    await agent.stop();
  });
});

describe('DataETLLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new DataETLLeadAgent();
    expect(agent.get_id()).toBe('data_etl_lead');
    expect(agent.get_capabilities()).toContain('data_import');
    expect(agent.get_capabilities()).toContain('data_transformation');
    expect(agent.get_capabilities()).toContain('data_validation');
  });

  test('should route data_import capability successfully', async () => {
    const agent = new DataETLLeadAgent();
    await agent.start();
    const task = create_test_task('data_etl_lead', 'data_import', { source: 'excel' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.source).toBe('excel');
    await agent.stop();
  });

  test('should route data_transformation capability successfully', async () => {
    const agent = new DataETLLeadAgent();
    await agent.start();
    const task = create_test_task('data_etl_lead', 'data_transformation');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    await agent.stop();
  });

  test('should route data_validation capability successfully', async () => {
    const agent = new DataETLLeadAgent();
    await agent.start();
    const task = create_test_task('data_etl_lead', 'data_validation');
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.errors).toHaveLength(0);
    await agent.stop();
  });
});

describe('SupportLeadAgent', () => {
  test('should initialize with correct metadata and capabilities', () => {
    const agent = new SupportLeadAgent();
    expect(agent.get_id()).toBe('support_lead');
    expect(agent.get_capabilities()).toContain('user_assistance');
    expect(agent.get_capabilities()).toContain('error_recovery');
    expect(agent.get_capabilities()).toContain('escalation_handling');
  });

  test('should route user_assistance capability successfully', async () => {
    const agent = new SupportLeadAgent();
    await agent.start();
    const task = create_test_task('support_lead', 'user_assistance', { query: 'How do I add a vendor?' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.query).toBe('How do I add a vendor?');
    expect(result.output.ticket_id).toBeDefined();
    await agent.stop();
  });

  test('should route error_recovery capability successfully', async () => {
    const agent = new SupportLeadAgent();
    await agent.start();
    const task = create_test_task('support_lead', 'error_recovery', { error_id: 'err_555' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.error_id).toBe('err_555');
    expect(result.output.recovered).toBe(true);
    await agent.stop();
  });

  test('should route escalation_handling capability successfully', async () => {
    const agent = new SupportLeadAgent();
    await agent.start();
    const task = create_test_task('support_lead', 'escalation_handling', { ticket_id: 'tkt_888' });
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.ticket_id).toBe('tkt_888');
    expect(result.output.escalated_to).toBe('senior_support');
    await agent.stop();
  });
});

describe('Orchestrator Security and Policy Guardrails', () => {
  test('should reject task execution if capability not in agent definition', async () => {
    const agent = new CFOAgent(); // CFO doesn't have 'payment_processing' capability
    await agent.start();
    const task = create_test_task('cfo', 'payment_processing', {}, null as any); // Pass null parameters so it doesn't try to use dummy approval
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(false);
    expect(result.error).toContain('is missing required capabilities: payment_processing');
    await agent.stop();
  });

  test('should reject task execution if tenant context does not match task tenant', async () => {
    const agent = new CFOAgent();
    await agent.start();
    const task = create_test_task('cfo', 'forecasting');
    
    // Modify task tenant_id to something else
    task.tenant_id = '00000000-0000-0000-0000-999999999999';
    
    const result = await agent.execute_task(task, dummy_tenant);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Task tenant does not match');
    await agent.stop();
  });
});
