-- ClawKeeper Row-Level Security (RLS) Policies
-- Ensures tenant data isolation

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION current_user_role() RETURNS VARCHAR AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true)::varchar;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Tenant Policies
-- ============================================================================

-- Super admins can see all tenants, others only their own
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (
        is_super_admin() OR id = current_tenant_id()
    );

-- ============================================================================
-- User Policies
-- ============================================================================

-- Users can only see users in their tenant (or all if super admin)
CREATE POLICY user_tenant_isolation ON users
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Account Policies
-- ============================================================================

CREATE POLICY account_tenant_isolation ON accounts
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Transaction Policies
-- ============================================================================

CREATE POLICY transaction_tenant_isolation ON transactions
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Invoice Policies
-- ============================================================================

CREATE POLICY invoice_tenant_isolation ON invoices
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- Viewers can only read invoices
CREATE POLICY invoice_viewer_read ON invoices
    FOR SELECT
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('viewer', 'accountant', 'tenant_admin', 'super_admin')
    );

-- Only accountants and admins can modify invoices
CREATE POLICY invoice_accountant_write ON invoices
    FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

CREATE POLICY invoice_accountant_update ON invoices
    FOR UPDATE
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

-- ============================================================================
-- Reconciliation Policies
-- ============================================================================

CREATE POLICY reconciliation_tenant_isolation ON reconciliation_tasks
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Report Policies
-- ============================================================================

CREATE POLICY report_tenant_isolation ON financial_reports
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Compliance Policies
-- ============================================================================

CREATE POLICY compliance_tenant_isolation ON compliance_checks
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Audit Log Policies
-- ============================================================================

-- Audit log is read-only and tenant-isolated
CREATE POLICY audit_log_tenant_isolation ON audit_log
    FOR SELECT
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- Only system can insert into audit log
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (true); -- Enforced by trigger

-- ============================================================================
-- Agent Run Policies
-- ============================================================================

CREATE POLICY agent_run_tenant_isolation ON agent_runs
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- ============================================================================
-- Vendor Policies
-- ============================================================================

CREATE POLICY vendor_tenant_isolation ON vendors
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- Viewers can only read vendors
CREATE POLICY vendor_viewer_read ON vendors
    FOR SELECT
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('viewer', 'accountant', 'tenant_admin', 'super_admin')
    );

-- Only accountants and admins can modify vendors
CREATE POLICY vendor_accountant_write ON vendors
    FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

CREATE POLICY vendor_accountant_update ON vendors
    FOR UPDATE
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

CREATE POLICY vendor_admin_delete ON vendors
    FOR DELETE
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin')
    );

-- ============================================================================
-- Customer Policies
-- ============================================================================

CREATE POLICY customer_tenant_isolation ON customers
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- Viewers can only read customers
CREATE POLICY customer_viewer_read ON customers
    FOR SELECT
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('viewer', 'accountant', 'tenant_admin', 'super_admin')
    );

-- Only accountants and admins can modify customers
CREATE POLICY customer_accountant_write ON customers
    FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

CREATE POLICY customer_accountant_update ON customers
    FOR UPDATE
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('accountant', 'tenant_admin', 'super_admin')
    );

CREATE POLICY customer_admin_delete ON customers
    FOR DELETE
    USING (
        tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin')
    );

-- ============================================================================
-- Activity Log Policies
-- ============================================================================

CREATE POLICY activity_log_tenant_isolation ON activity_log
    FOR ALL
    USING (
        is_super_admin() OR tenant_id = current_tenant_id()
    );

-- All authenticated users can read activity log
CREATE POLICY activity_log_read ON activity_log
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
    );

-- Anyone can insert activity log entries
CREATE POLICY activity_log_insert ON activity_log
    FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
    );

-- No updates or deletes allowed (activity log is append-only)

-- ============================================================================
-- Bypass Policies for Service Role
-- ============================================================================

-- Create a service role that can bypass RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clawkeeper_service') THEN
        CREATE ROLE clawkeeper_service;
    END IF;
END
$$;

-- Grant service role bypass privilege
ALTER ROLE clawkeeper_service BYPASSRLS;

-- Service role needs access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO clawkeeper_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO clawkeeper_service;
