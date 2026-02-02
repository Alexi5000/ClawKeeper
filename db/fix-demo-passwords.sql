-- Fix demo user passwords
-- Run with: psql $DATABASE_URL -f db/fix-demo-passwords.sql

UPDATE users 
SET password_hash = '$2a$10$a9pdluqRqwqbQIwXpQ0OyOxD2d9dt9SIcsjXGUXxfAdfFJ5ORUNDu'
WHERE email IN ('admin@demo.com', 'accountant@demo.com', 'viewer@demo.com');

-- Verify
SELECT email, 'password updated' as status FROM users 
WHERE email IN ('admin@demo.com', 'accountant@demo.com', 'viewer@demo.com');
