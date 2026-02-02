-- ClawKeeper Role-Based Access Control (RBAC)
-- Defines permissions for different user roles

-- ============================================================================
-- Create Roles
-- ============================================================================

DO $$
BEGIN
    -- Super Admin: Full system access
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'super_admin_role') THEN
        CREATE ROLE super_admin_role;
    END IF;

    -- Tenant Admin: Full access within tenant
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tenant_admin_role') THEN
        CREATE ROLE tenant_admin_role;
    END IF;

    -- Accountant: Read/write financial data
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'accountant_role') THEN
        CREATE ROLE accountant_role;
    END IF;

    -- Viewer: Read-only access
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'viewer_role') THEN
        CREATE ROLE viewer_role;
    END IF;
END
$$;

-- ============================================================================
-- Super Admin Permissions
-- ============================================================================

-- Full access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO super_admin_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO super_admin_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO super_admin_role;

-- ============================================================================
-- Tenant Admin Permissions
-- ============================================================================

-- Full access to tenant-scoped tables (RLS will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON reconciliation_tasks TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_reports TO tenant_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_checks TO tenant_admin_role;
GRANT SELECT ON audit_log TO tenant_admin_role;
GRANT SELECT ON agent_runs TO tenant_admin_role;

-- Sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tenant_admin_role;

-- ============================================================================
-- Accountant Permissions
-- ============================================================================

-- Read/write financial data
GRANT SELECT ON tenants TO accountant_role;
GRANT SELECT ON users TO accountant_role;
GRANT SELECT, INSERT, UPDATE ON accounts TO accountant_role;
GRANT SELECT, INSERT, UPDATE ON transactions TO accountant_role;
GRANT SELECT, INSERT, UPDATE ON invoices TO accountant_role;
GRANT SELECT, INSERT, UPDATE ON reconciliation_tasks TO accountant_role;
GRANT SELECT, INSERT ON financial_reports TO accountant_role;
GRANT SELECT ON compliance_checks TO accountant_role;
GRANT SELECT ON audit_log TO accountant_role;
GRANT SELECT ON agent_runs TO accountant_role;

-- Sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO accountant_role;

-- ============================================================================
-- Viewer Permissions
-- ============================================================================

-- Read-only access to all data
GRANT SELECT ON tenants TO viewer_role;
GRANT SELECT ON users TO viewer_role;
GRANT SELECT ON accounts TO viewer_role;
GRANT SELECT ON transactions TO viewer_role;
GRANT SELECT ON invoices TO viewer_role;
GRANT SELECT ON reconciliation_tasks TO viewer_role;
GRANT SELECT ON financial_reports TO viewer_role;
GRANT SELECT ON compliance_checks TO viewer_role;
GRANT SELECT ON audit_log TO viewer_role;
GRANT SELECT ON agent_runs TO viewer_role;

-- ============================================================================
-- Permission Matrix Reference
-- ============================================================================

/*
Permission Matrix:

Entity                  | super_admin | tenant_admin | accountant | viewer
------------------------|-------------|--------------|------------|--------
tenants                 | CRUD        | CRUD*        | R          | R
users                   | CRUD        | CRUD*        | R          | R
accounts                | CRUD        | CRUD*        | CRU        | R
transactions            | CRUD        | CRUD*        | CRU        | R
invoices                | CRUD        | CRUD*        | CRU        | R
reconciliation_tasks    | CRUD        | CRUD*        | CRU        | R
financial_reports       | CRUD        | CRUD*        | CR         | R
compliance_checks       | CRUD        | CRUD*        | R          | R
audit_log               | R           | R*           | R*         | R*
agent_runs              | CRUD        | R*           | R*         | R*

* = tenant-scoped only (via RLS)
C = Create, R = Read, U = Update, D = Delete
*/

-- ============================================================================
-- Helper Function: Check Permission
-- ============================================================================

CREATE OR REPLACE FUNCTION has_permission(
    p_action VARCHAR,
    p_entity VARCHAR,
    p_user_role VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    -- Super admin has all permissions
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- Tenant admin has all permissions within tenant
    IF p_user_role = 'tenant_admin' AND p_action IN ('create', 'read', 'update', 'delete') THEN
        RETURN TRUE;
    END IF;

    -- Accountant permissions
    IF p_user_role = 'accountant' THEN
        IF p_action = 'read' THEN
            RETURN TRUE;
        END IF;
        IF p_action IN ('create', 'update') AND p_entity IN ('accounts', 'transactions', 'invoices', 'reconciliation_tasks') THEN
            RETURN TRUE;
        END IF;
        IF p_action = 'create' AND p_entity = 'financial_reports' THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Viewer permissions
    IF p_user_role = 'viewer' AND p_action = 'read' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row-Level Permission Checks
-- ============================================================================

CREATE OR REPLACE FUNCTION can_approve_invoice(p_invoice_id UUID, p_user_role VARCHAR) RETURNS BOOLEAN AS $$
BEGIN
    -- Only tenant_admin and super_admin can approve invoices
    RETURN p_user_role IN ('tenant_admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_pay_invoice(p_invoice_id UUID, p_user_role VARCHAR) RETURNS BOOLEAN AS $$
BEGIN
    -- Only tenant_admin and super_admin can mark invoices as paid
    RETURN p_user_role IN ('tenant_admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_delete_entity(p_entity VARCHAR, p_user_role VARCHAR) RETURNS BOOLEAN AS $$
BEGIN
    -- Only admins can delete entities
    RETURN p_user_role IN ('tenant_admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
