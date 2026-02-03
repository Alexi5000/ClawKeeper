-- ClawKeeper Database Schema
-- Multi-tenant bookkeeping system with RLS and RBAC

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Tenants & Users
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'accountant', 'viewer')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Financial Entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'loan', 'investment', 'other')),
    institution VARCHAR(255),
    account_number_last4 CHAR(4),
    balance BIGINT NOT NULL DEFAULT 0, -- Amount in cents
    currency CHAR(3) DEFAULT 'USD',
    plaid_account_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_type ON accounts(type);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    amount BIGINT NOT NULL, -- Amount in cents (negative for expenses)
    category VARCHAR(50) NOT NULL CHECK (category IN ('income', 'expense', 'transfer', 'adjustment')),
    subcategory VARCHAR(100),
    description TEXT,
    payee VARCHAR(255),
    reconciled BOOLEAN DEFAULT FALSE,
    plaid_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_reconciled ON transactions(reconciled);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_email VARCHAR(255),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    amount BIGINT NOT NULL, -- Amount in cents
    currency CHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'paid', 'overdue', 'cancelled')),
    line_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_name);

-- ============================================================================
-- Reconciliation
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    matched_count INTEGER DEFAULT 0,
    unmatched_count INTEGER DEFAULT 0,
    discrepancies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reconciliation_tenant ON reconciliation_tasks(tenant_id);
CREATE INDEX idx_reconciliation_account ON reconciliation_tasks(account_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_tasks(status);

-- ============================================================================
-- Reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('profit_loss', 'balance_sheet', 'cash_flow', 'accounts_payable_aging', 'accounts_receivable_aging', 'custom')),
    period JSONB NOT NULL,
    data JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_reports_tenant ON financial_reports(tenant_id);
CREATE INDEX idx_reports_type ON financial_reports(type);
CREATE INDEX idx_reports_generated ON financial_reports(generated_at);

-- ============================================================================
-- Compliance & Audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('tax_compliance', 'audit_readiness', 'policy_violation', 'unusual_activity')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
    details TEXT NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_tenant ON compliance_checks(tenant_id);
CREATE INDEX idx_compliance_type ON compliance_checks(type);
CREATE INDEX idx_compliance_status ON compliance_checks(status);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject', 'export', 'import')),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- Agent Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(100) NOT NULL,
    task_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'ready', 'assigned', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    error TEXT
);

CREATE INDEX idx_agent_runs_tenant ON agent_runs(tenant_id);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_started ON agent_runs(started_at);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_tasks_updated_at BEFORE UPDATE ON reconciliation_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit Log Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all changes to financial entities
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, changes)
        VALUES (NEW.tenant_id, current_setting('app.current_user_id', true)::uuid, 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, changes)
        VALUES (NEW.tenant_id, current_setting('app.current_user_id', true)::uuid, 'update', TG_TABLE_NAME, NEW.id, 
                jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, changes)
        VALUES (OLD.tenant_id, current_setting('app.current_user_id', true)::uuid, 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to financial tables
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_accounts AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION log_audit_entry();
