# ClawKeeper Release Notes

## Version 0.2.0 - One-Prompt Agent Deployment

**Release Date**: February 4, 2026

### New Features

#### Command Center - One-Prompt Deployment
Deploy all 110 AI agents with a single natural language command. The system automatically:
- Decomposes complex requests into atomic tasks
- Assigns tasks to specialized agents based on capabilities
- Manages dependencies and execution order
- Streams real-time progress updates

#### DeepSeek AI Integration
Switched from Anthropic Claude to DeepSeek for cost-efficient AI reasoning:
- `deepseek-chat` for general tasks
- `deepseek-reasoner` for complex analysis
- 10-100x cost reduction compared to Claude
- OpenAI-compatible API integration

#### Enhanced Agent Management
- Search and filter across all 110 agents
- Select any agent from enhanced dropdown (was limited to 20)
- Start/Stop individual agents with one click
- Real-time status updates

### Improvements

**User Interface:**
- New Command Center page with task visualization
- Enhanced Agent Console with Radix UI components
- Fixed login page visibility (dark mode conflicts resolved)
- Better error handling and user feedback

**Developer Experience:**
- One-command setup: `bun run setup:full`
- Consolidated documentation
- Updated ports for better compatibility (API: 9100, Dashboard: 3000)
- Improved configuration validation

**Code Quality:**
- Removed 10 temporary documentation files
- Updated .gitignore for Cursor/AI artifacts
- Security audit passed (no hardcoded credentials)
- Clean commit history

### Breaking Changes

**Port Changes:**
- API Server: 4004 → 9100
- Dashboard: 5174 → 3000
- Update your `.env` file and restart servers

**AI Provider Change:**
- Now requires `DEEPSEEK_API_KEY` instead of `ANTHROPIC_API_KEY`
- Get your key from: https://platform.deepseek.com/api_keys

### Migration Guide

If upgrading from previous version:

1. **Update .env file:**
   ```env
   PORT=9100
   DEEPSEEK_API_KEY=your-key-here
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   ```

2. **Update dependencies:**
   ```bash
   bun install
   ```

3. **Restart servers:**
   ```bash
   bun run dev
   cd dashboard && bun run dev
   ```

4. **Access new URL:**
   - Old: http://localhost:5174
   - New: http://localhost:3000

### Known Issues

- WebSocket support not yet implemented (TODO in server.ts)
- React Router deprecation warnings (will upgrade to v7 in future release)

### File Changes

**Added (6 files):**
- `src/agents/orchestration_service.ts` - Multi-agent coordination
- `dashboard/src/pages/agents/CommandCenterPage.tsx` - Command Center UI
- `dashboard/src/components/ui/Textarea.tsx` - UI component
- `scripts/full-setup.ts` - One-command database setup
- `scripts/setup-demo.ts` - Demo user creation
- `QUICKSTART.md` - Quick start guide

**Deleted (10 files):**
- Removed temporary documentation and status markers
- Cleaned up .github folder

**Modified (29 files):**
- Core integration changes for DeepSeek
- UI enhancements across dashboard
- Configuration updates for new ports
- Documentation updates

### Stats

- **Commit**: 694ed41
- **Files changed**: 35
- **Insertions**: +1,984
- **Deletions**: -1,412
- **Net change**: +572 lines

### Contributors

- TechTideOhio

---

## How to Use

### Command Center Example

```
Input: "Generate monthly P&L report and reconcile all accounts"

Result:
✓ Task 1: Fetch Account Data → Data/ETL Lead
✓ Task 2: Import Transactions → Integration Lead  
✓ Task 3: Match Transactions → Reconciliation Lead
✓ Task 4: Generate P&L → Reporting Lead
✓ Task 5: Review and Finalize → CFO

Execution Time: ~10-30 seconds
Agents Deployed: 5
Cost: ~$0.01 (with DeepSeek)
```

### Getting Started

See [QUICKSTART.md](./QUICKSTART.md) for setup instructions.

### Feedback

Report issues at: https://github.com/Alexi5000/ClawKeeper/issues
