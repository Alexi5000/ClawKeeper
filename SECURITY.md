# Security Policy

## Reporting Security Vulnerabilities

We take the security of ClawKeeper seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email security reports to:

**Email**: security@clawkeeper.ai (or create a private security advisory on GitHub)

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
2. **Investigation**: We will investigate and confirm the vulnerability
3. **Resolution**: We will work on a fix and keep you updated on progress
4. **Disclosure**: Once fixed, we will coordinate public disclosure with you
5. **Credit**: We will credit you in our security advisories (unless you prefer to remain anonymous)

### Security Update Process

1. Security patches will be released as soon as possible
2. Critical vulnerabilities will be patched within 7 days
3. High-severity issues within 30 days
4. Medium/low-severity issues in the next regular release

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Best Practices

When deploying ClawKeeper:

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique values for `JWT_SECRET` (minimum 32 characters)
- Rotate API keys regularly
- Use environment-specific credentials (dev/staging/prod)

### Database
- Enable Row-Level Security (RLS) policies (included in setup)
- Use strong database passwords
- Restrict database network access
- Enable SSL/TLS for database connections in production
- Regular backups with encryption

### API Keys
- Use production API keys only in production
- Plaid: Use production environment only for real accounts
- Stripe: Use live keys only in production
- Store API keys in secure secret management systems

### Network Security
- Deploy behind HTTPS/TLS (use Let's Encrypt or similar)
- Configure CORS appropriately for your domain
- Enable rate limiting (configured by default)
- Use firewall rules to restrict access

### Multi-Tenancy
- RLS policies enforce tenant isolation at database level
- Never bypass tenant context in API calls
- Validate tenant access in all operations
- Audit all cross-tenant operations

### Audit Logging
- Review audit logs regularly for suspicious activity
- Retain logs according to compliance requirements
- Monitor for unusual patterns (excessive API calls, failed logins)

### Updates
- Keep ClawKeeper updated to the latest version
- Subscribe to security advisories
- Test updates in staging before production

## Known Security Considerations

### Demo Credentials
Demo data includes test credentials documented in `src/demo/README.md`. These are for development/testing only and should NEVER be used in production:
- `password123` - Demo seed password
- `Demo123!` - Demo generated password

### Console Logging
Development mode includes console.log statements for debugging. In production:
- Set `LOG_LEVEL=error` in environment
- Consider implementing structured logging to a secure destination
- Never log sensitive data (passwords, API keys, PII)

### Circuit Breakers
Circuit breakers protect external API calls. Monitor circuit breaker states to detect:
- Repeated failures (potential attack or misconfiguration)
- Unexpected state transitions

## Compliance

ClawKeeper is designed with compliance in mind:

- **GDPR**: Personal data can be exported and deleted per tenant
- **SOC 2**: Audit logging and access controls support SOC 2 compliance
- **Financial Regulations**: Immutable audit trail for all financial transactions
- **Data Residency**: Deploy in your required geographic region

## Security Features

Built-in security features:

- Row-Level Security (RLS) for tenant isolation
- Role-Based Access Control (RBAC)
- Immutable audit logging
- Rate limiting per tenant and endpoint
- Circuit breakers for external services
- Input validation with Zod schemas
- PII detection before LLM processing
- JWT-based authentication
- Bcrypt password hashing
- SQL injection prevention (parameterized queries)

## Contact

For security-related questions (non-vulnerabilities):
- Documentation: See `/docs` directory
- General questions: Open a GitHub Discussion
- Security team: security@clawkeeper.ai

Thank you for helping keep ClawKeeper secure!
