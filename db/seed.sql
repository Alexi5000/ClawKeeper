-- ClawKeeper Seed Data
-- Initial data for development and testing

-- ============================================================================
-- Demo Tenant & Users
-- ============================================================================

-- Insert demo tenant
INSERT INTO tenants (id, name, settings, status)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo Company Inc',
    '{"theme": "light", "currency": "USD", "timezone": "America/New_York"}'::jsonb,
    'active'
) ON CONFLICT DO NOTHING;

-- Insert demo users (password: 'password123' - hashed with bcrypt)
INSERT INTO users (id, tenant_id, email, password_hash, role, name)
VALUES
    (
        '00000000-0000-0000-0001-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'admin@demo.com',
        '$2a$10$a9pdluqRqwqbQIwXpQ0OyOxD2d9dt9SIcsjXGUXxfAdfFJ5ORUNDu', -- password123
        'tenant_admin',
        'Demo Admin'
    ),
    (
        '00000000-0000-0000-0001-000000000002'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'accountant@demo.com',
        '$2a$10$a9pdluqRqwqbQIwXpQ0OyOxD2d9dt9SIcsjXGUXxfAdfFJ5ORUNDu', -- password123
        'accountant',
        'Demo Accountant'
    ),
    (
        '00000000-0000-0000-0001-000000000003'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'viewer@demo.com',
        '$2a$10$a9pdluqRqwqbQIwXpQ0OyOxD2d9dt9SIcsjXGUXxfAdfFJ5ORUNDu', -- password123
        'viewer',
        'Demo Viewer'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Demo Accounts
-- ============================================================================

INSERT INTO accounts (id, tenant_id, name, type, institution, account_number_last4, balance, currency)
VALUES
    (
        '00000000-0000-0000-0002-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'Business Checking',
        'checking',
        'Chase Bank',
        '1234',
        5000000, -- $50,000.00
        'USD'
    ),
    (
        '00000000-0000-0000-0002-000000000002'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'Business Savings',
        'savings',
        'Chase Bank',
        '5678',
        10000000, -- $100,000.00
        'USD'
    ),
    (
        '00000000-0000-0000-0002-000000000003'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'Business Credit Card',
        'credit_card',
        'American Express',
        '9012',
        -250000, -- -$2,500.00 (balance owed)
        'USD'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Demo Transactions
-- ============================================================================

INSERT INTO transactions (tenant_id, account_id, date, amount, category, subcategory, description, payee, reconciled)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0002-000000000001'::uuid,
        NOW() - INTERVAL '5 days',
        -15000, -- -$150.00
        'expense',
        'Office Supplies',
        'Office supplies purchase',
        'Staples',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0002-000000000001'::uuid,
        NOW() - INTERVAL '4 days',
        500000, -- $5,000.00
        'income',
        'Client Payment',
        'Payment from Acme Corp',
        'Acme Corp',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0002-000000000003'::uuid,
        NOW() - INTERVAL '3 days',
        -7500, -- -$75.00
        'expense',
        'Software',
        'Monthly SaaS subscription',
        'Adobe Creative Cloud',
        false
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Demo Invoices
-- ============================================================================

INSERT INTO invoices (
    tenant_id, vendor_name, vendor_email, invoice_number, invoice_date, due_date,
    amount, currency, status, line_items, notes
)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'Office Depot',
        'billing@officedepot.com',
        'INV-2024-001',
        NOW() - INTERVAL '10 days',
        NOW() + INTERVAL '20 days',
        25000, -- $250.00
        'USD',
        'pending_approval',
        '[
            {
                "id": "00000000-0000-0000-0003-000000000001",
                "description": "Printer Paper - 10 reams",
                "quantity": 10,
                "unit_price": "1500",
                "amount": "15000",
                "category": "Office Supplies"
            },
            {
                "id": "00000000-0000-0000-0003-000000000002",
                "description": "Pens - 50 pack",
                "quantity": 2,
                "unit_price": "5000",
                "amount": "10000",
                "category": "Office Supplies"
            }
        ]'::jsonb,
        'Regular monthly office supplies order'
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'AWS',
        'billing@aws.com',
        'AWS-2024-01',
        NOW() - INTERVAL '5 days',
        NOW() + INTERVAL '25 days',
        150000, -- $1,500.00
        'USD',
        'approved',
        '[
            {
                "id": "00000000-0000-0000-0003-000000000003",
                "description": "EC2 Instance Usage",
                "quantity": 1,
                "unit_price": "100000",
                "amount": "100000",
                "category": "Cloud Infrastructure"
            },
            {
                "id": "00000000-0000-0000-0003-000000000004",
                "description": "S3 Storage",
                "quantity": 1,
                "unit_price": "50000",
                "amount": "50000",
                "category": "Cloud Storage"
            }
        ]'::jsonb,
        'Monthly cloud infrastructure costs'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Update Sequences
-- ============================================================================

-- Ensure sequences are set correctly after manual inserts
SELECT setval(pg_get_serial_sequence('tenants', 'id'), (SELECT MAX(id::text)::bigint FROM tenants WHERE id::text ~ '^\d+$'), true);
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id::text)::bigint FROM users WHERE id::text ~ '^\d+$'), true);
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT MAX(id::text)::bigint FROM accounts WHERE id::text ~ '^\d+$'), true);
