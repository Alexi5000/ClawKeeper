// file: src/agents/worker_registry.ts
// description: Dynamic worker registry that loads metadata from AGENT.md files
// reference: src/agents/worker_base.ts

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { WorkerAgent, type WorkerMetadata } from './worker_base';
import type { LedgerCapability } from '../core/types';

interface WorkerDefinition {
  domain: string;
  workers: WorkerMetadata[];
}

const WORKERS_DIR = join(process.cwd(), 'agents', 'workers');

// Map domain folders to parent orchestrator IDs
const DOMAIN_TO_PARENT: Record<string, string> = {
  ap: 'accounts_payable_lead',
  ar: 'accounts_receivable_lead',
  cfo: 'cfo',
  reconciliation: 'reconciliation_lead',
  compliance: 'compliance_lead',
  reporting: 'reporting_lead',
  integration: 'integration_lead',
  data: 'data_etl_lead',
  support: 'support_lead',
};

// Map worker types to capabilities
const WORKER_TYPE_TO_CAPABILITIES: Record<string, LedgerCapability[]> = {
  // AP workers
  'invoice-parser': ['invoice_parsing', 'document_parsing'],
  'invoice-validator': ['invoice_validation', 'data_validation'],
  'payment-processor': ['payment_processing'],
  'payment-scheduler': ['payment_processing'],
  'expense-categorizer': ['invoice_categorization'],
  'duplicate-detector': ['data_validation'],
  'approval-router': ['invoice_approval'],
  'vendor-manager': ['data_validation'],
  'tax-classifier': ['tax_compliance_check'],
  'three-way-matcher': ['transaction_matching'],
  'early-payment-advisor': ['report_analysis'],
  'accrual-calculator': ['data_transformation'],
  'aging-report-generator': ['report_generation'],
  'policy-enforcer': ['policy_enforcement'],
  'document-archiver': ['data_transformation'],
  
  // AR workers
  'invoice-generator': ['invoice_parsing'],
  'invoice-sender': ['email_processing'],
  'payment-recorder': ['payment_processing'],
  'payment-matcher': ['transaction_matching'],
  'collections-agent': ['user_assistance'],
  'aging-analyst': ['report_generation'],
  'credit-analyst': ['report_analysis'],
  'dispute-handler': ['user_assistance'],
  'adjustment-processor': ['data_transformation'],
  'revenue-recognizer': ['report_generation'],
  'reminder-scheduler': ['email_processing'],
  'statement-generator': ['report_generation'],
  'bad-debt-assessor': ['report_analysis'],
  'payment-plan-manager': ['user_assistance'],
  'customer-portal-manager': ['user_assistance'],
  
  // CFO workers
  'strategic-planner': ['forecasting'],
  'cash-flow-analyst': ['forecasting'],
  'budget-manager': ['report_generation'],
  'financial-modeler': ['forecasting'],
  'kpi-tracker': ['report_generation'],
  'variance-analyst': ['report_analysis'],
  'investment-advisor': ['report_analysis'],
  'risk-assessor': ['report_analysis'],
  
  // Reconciliation workers
  'transaction-matcher': ['transaction_matching'],
  'amount-matcher': ['transaction_matching'],
  'date-matcher': ['transaction_matching'],
  'payee-matcher': ['transaction_matching'],
  'discrepancy-detector': ['discrepancy_detection'],
  'discrepancy-investigator': ['discrepancy_resolution'],
  'balance-verifier': ['transaction_matching'],
  'adjustment-creator': ['data_transformation'],
  'exception-handler': ['error_recovery'],
  'outstanding-item-tracker': ['report_generation'],
  'reconciliation-reporter': ['report_generation'],
  'transaction-importer': ['data_import'],
  
  // Compliance workers
  'tax-compliance-checker': ['tax_compliance_check'],
  'audit-preparer': ['audit_preparation'],
  'policy-enforcer': ['policy_enforcement'],
  'fraud-detector': ['discrepancy_detection'],
  'segregation-checker': ['policy_enforcement'],
  'approval-limit-enforcer': ['policy_enforcement'],
  'regulatory-reporter': ['report_generation'],
  'internal-control-monitor': ['policy_enforcement'],
  'document-retention-manager': ['data_transformation'],
  'compliance-dashboarder': ['report_generation'],
  
  // Reporting workers
  'pl-generator': ['report_generation'],
  'balance-sheet-generator': ['report_generation'],
  'cash-flow-generator': ['report_generation'],
  'chart-generator': ['report_generation'],
  'custom-report-builder': ['report_generation'],
  'data-aggregator': ['data_transformation'],
  'report-formatter': ['report_generation'],
  'export-handler': ['data_transformation'],
  'comparative-analyzer': ['report_analysis'],
  'ratio-calculator': ['report_analysis'],
  'dashboard-creator': ['report_generation'],
  'report-scheduler': ['report_generation'],
  
  // Integration workers
  'plaid-connector': ['bank_sync'],
  'stripe-integrator': ['payment_gateway_integration'],
  'quickbooks-syncer': ['accounting_sync'],
  'xero-syncer': ['accounting_sync'],
  'paypal-integrator': ['payment_gateway_integration'],
  'webhook-processor': ['data_import'],
  'oauth-flow-handler': ['user_assistance'],
  'api-credential-manager': ['data_validation'],
  'rate-limit-manager': ['error_recovery'],
  'circuit-breaker-manager': ['error_recovery'],
  'integration-health-monitor': ['report_generation'],
  'data-mapper': ['data_transformation'],
  
  // Data/ETL workers
  'csv-importer': ['data_import'],
  'excel-importer': ['data_import'],
  'json-importer': ['data_import'],
  'data-transformer': ['data_transformation'],
  'data-validator': ['data_validation'],
  'data-enricher': ['data_transformation'],
  'schema-mapper': ['data_transformation'],
  'deduplicator': ['data_validation'],
  'bulk-processor': ['data_import'],
  'migration-specialist': ['data_import'],
  
  // Support workers
  'help-desk-agent': ['user_assistance'],
  'error-diagnostician': ['error_recovery'],
  'escalation-manager': ['escalation_handling'],
  'recovery-specialist': ['error_recovery'],
  'onboarding-specialist': ['user_assistance'],
  'documentation-writer': ['user_assistance'],
};

export class WorkerRegistry {
  private workers: Map<string, WorkerMetadata> = new Map();
  private worker_instances: Map<string, WorkerAgent> = new Map();

  constructor() {
    this.load_all_workers();
  }

  private load_all_workers(): void {
    console.log('Loading worker definitions...');
    
    const domains = readdirSync(WORKERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const domain of domains) {
      const domain_path = join(WORKERS_DIR, domain);
      const worker_dirs = readdirSync(domain_path, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const worker_dir of worker_dirs) {
        const worker_id = this.generate_worker_id(domain, worker_dir);
        const capabilities = WORKER_TYPE_TO_CAPABILITIES[worker_dir] || ['data_validation'];
        
        const metadata: WorkerMetadata = {
          id: worker_id,
          name: this.format_name(worker_dir),
          description: `${this.format_name(worker_dir)} worker for ${domain}`,
          type: 'worker',
          parent_id: DOMAIN_TO_PARENT[domain] || 'clawkeeper',
          domain,
          capabilities,
        };

        this.workers.set(worker_id, metadata);
      }
    }

    console.log(`✅ Loaded ${this.workers.size} worker definitions`);
  }

  private generate_worker_id(domain: string, worker_dir: string): string {
    return `${domain}_${worker_dir.replace(/-/g, '_')}`;
  }

  private format_name(worker_dir: string): string {
    return worker_dir
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  get_worker(worker_id: string): WorkerAgent | null {
    if (this.worker_instances.has(worker_id)) {
      return this.worker_instances.get(worker_id)!;
    }

    const metadata = this.workers.get(worker_id);
    if (!metadata) {
      return null;
    }

    const worker = new WorkerAgent(metadata);
    this.worker_instances.set(worker_id, worker);
    return worker;
  }

  get_all_workers(): WorkerMetadata[] {
    return Array.from(this.workers.values());
  }

  get_workers_by_domain(domain: string): WorkerMetadata[] {
    return Array.from(this.workers.values()).filter(w => w.domain === domain);
  }

  get_workers_by_parent(parent_id: string): WorkerMetadata[] {
    return Array.from(this.workers.values()).filter(w => w.parent_id === parent_id);
  }
}

// Singleton instance
export const worker_registry = new WorkerRegistry();
