// file: src/integrations/molten_bridge.ts
// description: Bridge for syncing ClawKeeper memories to Molten unified memory system
// reference: src/memory/index.ts, Molten core/memory-api.js

const MOLTEN_API_URL = process.env.MOLTEN_MEMORY_API_URL || 'http://localhost:3000/api/memories';
const TIMEOUT_MS = 10000;
const SYNC_ENABLED = process.env.MOLTEN_SYNC_ENABLED === 'true';

// ClawKeeper type -> Molten type mapping
const TYPE_MAP: Record<string, string> = {
  conversation: 'conversation_summary',
  task: 'context',
  decision: 'decision',
  learning: 'fact',
  context: 'context',
};

/**
 * Sync a memory to Molten's unified memory system
 * Only syncs important memories (importance >= 7) to avoid noise
 */
export async function sync_to_molten(
  agent_id: string,
  tenant_id: string,
  content: string,
  type: string,
  importance: number = 5,
): Promise<string | null> {
  if (!SYNC_ENABLED) return null;
  if (importance < 7) return null; // Only sync important memories

  try {
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${MOLTEN_API_URL}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Id': agent_id,
        'X-Framework': 'clawkeeper',
      },
      body: JSON.stringify({
        content,
        namespace: `clawkeeper:${tenant_id}`,
        agentId: agent_id,
        framework: 'clawkeeper',
        tier: importance >= 8 ? 'long_term' : 'short_term',
        importance: importance / 10, // ClawKeeper uses 1-10, Molten uses 0-1
        metadata: {
          tenant_id,
          source_type: type,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout_id);

    if (!response.ok) {
      console.error(`[MoltenBridge] Sync failed: ${response.status}`);
      return null;
    }

    const data = await response.json() as { memory?: { id?: string } };
    return data.memory?.id || null;
  } catch (err) {
    // Fire-and-forget -- don't let Molten sync failures break ClawKeeper
    console.error(`[MoltenBridge] Sync error: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Recall memories from Molten relevant to ClawKeeper
 */
export async function recall_from_molten(
  query: string,
  tenant_id: string,
  limit: number = 5,
): Promise<Array<{ content: string; score: number }>> {
  if (!SYNC_ENABLED) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });

    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${MOLTEN_API_URL}?${params}`, {
      headers: {
        'X-Agent-Id': 'clawkeeper',
        'X-Framework': 'clawkeeper',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout_id);

    if (!response.ok) return [];

    const data = await response.json() as { results?: Array<{ content: string; score: number }> };
    return data.results || [];
  } catch {
    return [];
  }
}
