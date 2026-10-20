BEGIN;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'invoice_tenant_isolation' AND polrelid = 'invoices'::regclass) THEN
        DROP POLICY invoice_tenant_isolation ON invoices;
        CREATE POLICY invoice_tenant_isolation ON invoices
            AS RESTRICTIVE FOR ALL
            USING (is_super_admin() OR tenant_id = current_tenant_id())
            WITH CHECK (is_super_admin() OR tenant_id = current_tenant_id());
        DROP POLICY IF EXISTS invoice_super_admin ON invoices;
        CREATE POLICY invoice_super_admin ON invoices
            FOR ALL
            USING (is_super_admin())
            WITH CHECK (is_super_admin());
    END IF;
END;
$$;
COMMIT;
