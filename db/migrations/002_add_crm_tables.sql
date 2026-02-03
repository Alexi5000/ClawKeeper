-- Migration: Add CRM and Agent Management Tables
-- Description: Add vendors, customers, activity_log, and agents tables
-- Date: 2026-02-03

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Vendors Table (for vendor management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB DEFAULT '{}'::jsonb,
    payment_terms INTEGER DEFAULT 30, -- Days
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    tax_id VARCHAR(50),
    website VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_name ON vendors(name);

-- ============================================================================
-- Customers Table (for customer management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB DEFAULT '{}'::jsonb,
    credit_limit BIGINT DEFAULT 0, -- Amount in cents
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    tax_id VARCHAR(50),
    website VARCHAR(255),
    payment_terms INTEGER DEFAULT 30, -- Days
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);

-- ============================================================================
-- Activity Log Table (for activity feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(100),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX idx_activity_agent ON activity_log(agent_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================================================
-- Agents Table (for agent registry and status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ceo', 'orchestrator', 'worker')),
    parent_id VARCHAR(100),
    capabilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'offline', 'error')),
    current_task_id UUID,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_parent ON agents(parent_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_last_active ON agents(last_active_at);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit Log Triggers for Vendors and Customers
-- ============================================================================

CREATE TRIGGER audit_vendors AFTER INSERT OR UPDATE OR DELETE ON vendors
    FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_audit_entry();
