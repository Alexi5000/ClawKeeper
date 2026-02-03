-- ClawKeeper Performance Optimization Migration
-- Adds composite indexes for dashboard query optimization

-- Critical composite indexes for dashboard queries
-- These indexes significantly improve query performance for tenant-filtered operations

-- Invoice queries: Filter by tenant_id and status (dashboard summary)
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);

-- Transaction queries: Filter by tenant_id with date ordering (cash flow charts)
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON transactions(tenant_id, date DESC);

-- Activity log queries: Filter by tenant_id with created_at ordering (recent activity feed)
CREATE INDEX IF NOT EXISTS idx_activity_tenant_created ON activity_log(tenant_id, created_at DESC);

-- Optional: Partial index for pending invoices (reduces index size)
-- This index only includes invoices that need action
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON invoices(tenant_id) 
  WHERE status IN ('pending_approval', 'approved', 'overdue');

-- Add composite index for accounts (balance queries)
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_type ON accounts(tenant_id, type);

-- Add index for customer/vendor lookups
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_name ON vendors(tenant_id, name);
