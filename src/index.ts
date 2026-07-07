// file: src/index.ts
// description: ClawKeeper main entry point - starts API server and agent runtime
// reference: src/api/server.ts, src/agents/index.ts

import { agent_runtime } from './agents/index';
import { flush_opik } from './core/observability';

console.log('');
console.log('═'.repeat(50));
console.log('  🔐 ClawKeeper');
console.log('  Policy-gated AI bookkeeping for SMBs');
console.log('═'.repeat(50));
console.log('');

// Start ClawKeeper CEO agent
console.log('[Agents] Initializing agent runtime...');
const clawkeeper = await agent_runtime.get_agent('clawkeeper');
console.log('[Agents] ✅ ClawKeeper CEO agent: ONLINE');

// Start Accounts Payable Lead
try {
  const ap_lead = await agent_runtime.get_agent('accounts_payable_lead');
  console.log('[Agents] ✅ Accounts Payable Lead: ONLINE');
} catch {
  console.log('[Agents] ⏳ Accounts Payable Lead: pending implementation');
}

// Display agent status
console.log('');
console.log('[Status] Agent Runtime:');
const profiles = agent_runtime.get_all_profiles();
for (const profile of profiles) {
  console.log(`  - ${profile.name}: ${profile.status}`);
}

// Start API server
console.log('');
console.log('[API] Starting server...');

const port = Number(process.env.PORT) || 4004;
const server_module = await import('./api/server');

// Start Bun server
Bun.serve({
  port,
  fetch: server_module.default.fetch,
});

console.log(`[API] ✅ Server running on http://localhost:${port}`);
console.log(`[API]    Health: http://localhost:${port}/health`);
console.log(`[API]    Agents: http://localhost:${port}/api/agents/status`);

console.log('');
console.log('═'.repeat(50));
console.log('  ✅ ClawKeeper is ONLINE');
console.log('═'.repeat(50));
console.log('');
console.log('Press Ctrl+C to stop');

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await flush_opik();
  await agent_runtime.stop_all();
  console.log('👋 ClawKeeper stopped');
  process.exit(0);
});

// Keep process alive
await new Promise(() => {});
