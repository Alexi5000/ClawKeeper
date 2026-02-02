# Contributing to ClawKeeper

Thank you for your interest in contributing to ClawKeeper! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ClawKeeper.git
   cd clawkeeper
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Alexi5000/ClawKeeper.git
   ```

## Development Environment

### Prerequisites

- [Bun](https://bun.sh/) v1.1.0 or later
- PostgreSQL 15+ (or use Docker)
- Node.js 20+ (for some tooling)

### Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your local configuration:
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_URL` - Redis connection (optional for dev)
   - API keys for integrations (Plaid, Stripe, etc.)

3. **Set up the database**:
   ```bash
   bun run db:migrate
   bun run db:seed  # Optional: load sample data
   ```

4. **Start the development server**:
   ```bash
   bun run dev
   ```

### Dashboard Development

The dashboard is a separate React application:

```bash
cd dashboard
bun install
bun run dev
```

## Code Style

We enforce consistent code style across the project:

### TypeScript Guidelines

- **No `any` types** - Use proper typing or `unknown` with type guards
- **Explicit return types** on exported functions
- **Interface over type** for object shapes (when possible)
- **Prefer `const` assertions** for literal types

### Formatting & Linting

We use Prettier and ESLint:

```bash
# Format code
bun run format

# Lint code
bun run lint

# Fix auto-fixable issues
bun run lint:fix
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add invoice OCR processing
fix: correct tax calculation rounding
docs: update API documentation
chore: upgrade dependencies
```

## Testing

### Running Tests

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Run specific test file
bun test src/skills/__tests__/invoice-processor.test.ts
```

### Writing Tests

- Place tests in `__tests__` directories or use `.test.ts` suffix
- Test file structure should mirror source structure
- Include unit tests for utilities and integration tests for skills
- Mock external services (Plaid, Stripe, etc.)

### Type Checking

```bash
bun run typecheck
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** with clear, atomic commits

3. **Ensure quality**:
   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```

4. **Push and create PR**:
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers
   - Testing performed
   - Screenshots (for UI changes)

### PR Review Guidelines

- PRs require at least one approval
- All CI checks must pass
- Keep PRs focused and reasonably sized
- Respond to feedback constructively

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, etc.)
- Relevant logs or screenshots

### Feature Requests

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- Potential impact on existing functionality

---

Questions? Open a discussion on GitHub or reach out to the maintainers.

Thank you for contributing to ClawKeeper! 🦀
