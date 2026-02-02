// file: src/memory/index.ts
// description: Memory system barrel exports and convenience functions
// reference: src/memory/types.ts, src/memory/store.ts

import postgres from 'postgres';
import { createMemoryStore, MemoryStore } from './store';
import type {
  MemoryEntry,
  MemoryType,
  MemoryContent,
  MemoryMetadata,
  MemoryQuery,
  MemoryQueryInput,
  MemorySearchResponse,
  CreateMemoryInput,
  GetMemoriesOptions,
} from './types';

// ============================================================================
// Re-exports
// ============================================================================

export * from './types';
export * from './store';

// ============================================================================
// Singleton Store Instance
// ============================================================================

let _store: MemoryStore | null = null;
let _tenantId: string | null = null;

/**
 * Initialize the memory system with a database connection
 */
export function initMemory(databaseUrl: string, tenantId: string): MemoryStore {
  const sql = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 20,
  });
  
  _store = createMemoryStore(sql);
  _tenantId = tenantId;
  
  return _store;
}

/**
 * Initialize the memory system with an existing postgres connection
 */
export function initMemoryWithConnection(sql: postgres.Sql, tenantId: string): MemoryStore {
  _store = createMemoryStore(sql);
  _tenantId = tenantId;
  
  return _store;
}

/**
 * Get the current memory store instance
 */
export function getMemoryStore(): MemoryStore {
  if (!_store) {
    throw new Error('Memory system not initialized. Call initMemory() or initMemoryWithConnection() first.');
  }
  return _store;
}

/**
 * Get the current tenant ID
 */
export function getCurrentTenantId(): string {
  if (!_tenantId) {
    throw new Error('Memory system not initialized. Call initMemory() or initMemoryWithConnection() first.');
  }
  return _tenantId;
}

/**
 * Set the current tenant context
 */
export function setTenantContext(tenantId: string): void {
  _tenantId = tenantId;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Remember - Store a new memory for an agent
 * 
 * @param agentId - The agent storing this memory
 * @param content - The memory content (text and optional metadata)
 * @param type - The type of memory (defaults to 'context')
 * @param metadata - Optional additional metadata
 * 
 * @example
 * ```typescript
 * await remember('cfo', { text: 'User prefers weekly reports' }, 'learning');
 * await remember('accounts_payable_lead', { text: 'Invoice #123 processed', tags: ['invoice'] }, 'task');
 * ```
 */
export async function remember(
  agentId: string,
  content: MemoryContent | string,
  type: MemoryType = 'context',
  metadata?: Partial<MemoryMetadata>
): Promise<MemoryEntry> {
  const store = getMemoryStore();
  const tenantId = getCurrentTenantId();
  
  const memoryContent: MemoryContent = typeof content === 'string' 
    ? { text: content }
    : content;
  
  const input: CreateMemoryInput = {
    agentId,
    type,
    content: memoryContent,
    metadata: metadata ? { version: 1, ...metadata } : undefined,
  };
  
  return store.saveMemory(tenantId, input);
}

/**
 * Recall - Retrieve memories for an agent based on a query
 * 
 * @param agentId - The agent whose memories to retrieve
 * @param query - Search query (text string or full MemoryQuery object)
 * @param limit - Maximum number of memories to return (default: 10)
 * 
 * @example
 * ```typescript
 * const memories = await recall('cfo', 'cash flow', 5);
 * const memories = await recall('cfo', { types: ['decision', 'learning'] }, 20);
 * ```
 */
export async function recall(
  agentId: string,
  query?: string | MemoryQueryInput,
  limit: number = 10
): Promise<MemoryEntry[]> {
  const store = getMemoryStore();
  const tenantId = getCurrentTenantId();
  
  if (typeof query === 'string') {
    // Simple text search
    const response = await store.searchMemories(tenantId, {
      text: query,
      agentIds: [agentId],
      limit,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      includeDeleted: false,
    });
    return response.results.map(r => r.memory);
  } else if (query) {
    // Full query object
    const fullQuery: MemoryQueryInput = {
      ...query,
      agentIds: query.agentIds ?? [agentId],
      limit: query.limit ?? limit,
      offset: query.offset ?? 0,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      includeDeleted: query.includeDeleted ?? false,
    };
    const response = await store.searchMemories(tenantId, fullQuery);
    return response.results.map(r => r.memory);
  } else {
    // No query - get recent memories
    const result = await store.getMemories(tenantId, agentId, { limit });
    return result.memories;
  }
}

/**
 * Forget - Soft delete a memory
 * 
 * @param agentId - The agent whose memory to delete (for validation)
 * @param memoryId - The ID of the memory to delete
 * 
 * @example
 * ```typescript
 * await forget('cfo', '550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function forget(agentId: string, memoryId: string): Promise<boolean> {
  const store = getMemoryStore();
  const tenantId = getCurrentTenantId();
  
  // Verify the memory belongs to this agent
  const memory = await store.getMemory(tenantId, memoryId);
  if (!memory) {
    return false;
  }
  
  if (memory.agentId !== agentId) {
    throw new Error(`Memory ${memoryId} does not belong to agent ${agentId}`);
  }
  
  return store.deleteMemory(tenantId, memoryId);
}

/**
 * Search memories across all agents (tenant-scoped)
 * 
 * @param query - The search query
 * 
 * @example
 * ```typescript
 * const results = await searchMemories({ text: 'invoice', types: ['task'] });
 * ```
 */
export async function searchMemories(
  query: MemoryQueryInput
): Promise<MemorySearchResponse> {
  const store = getMemoryStore();
  const tenantId = getCurrentTenantId();
  
  const fullQuery: MemoryQueryInput = {
    ...query,
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
    includeDeleted: query.includeDeleted ?? false,
  };
  
  return store.searchMemories(tenantId, fullQuery);
}

/**
 * Get memory statistics for an agent
 * 
 * @param agentId - The agent to get stats for
 */
export async function getMemoryStats(agentId: string): Promise<{
  totalMemories: number;
  byType: Record<MemoryType, number>;
}> {
  const store = getMemoryStore();
  const tenantId = getCurrentTenantId();
  
  const total = await store.getMemoryCount(tenantId, agentId);
  
  // Get counts by type
  const types: MemoryType[] = ['conversation', 'task', 'decision', 'learning', 'context'];
  const byType: Record<MemoryType, number> = {} as Record<MemoryType, number>;
  
  for (const type of types) {
    const result = await store.getMemories(tenantId, agentId, { types: [type], limit: 1 });
    byType[type] = result.total;
  }
  
  return {
    totalMemories: total,
    byType,
  };
}

/**
 * Remember a conversation turn
 */
export async function rememberConversation(
  agentId: string,
  userMessage: string,
  assistantResponse: string,
  metadata?: Partial<MemoryMetadata>
): Promise<MemoryEntry> {
  return remember(
    agentId,
    {
      text: `User: ${userMessage}\nAssistant: ${assistantResponse}`,
      summary: userMessage.substring(0, 100),
    },
    'conversation',
    metadata
  );
}

/**
 * Remember a task execution
 */
export async function rememberTask(
  agentId: string,
  taskDescription: string,
  outcome: 'success' | 'failure',
  details?: string,
  metadata?: Partial<MemoryMetadata>
): Promise<MemoryEntry> {
  return remember(
    agentId,
    {
      text: `Task: ${taskDescription}\nOutcome: ${outcome}${details ? `\nDetails: ${details}` : ''}`,
      tags: ['task', outcome],
    },
    'task',
    {
      ...metadata,
      importance: outcome === 'failure' ? 8 : 5,
    }
  );
}

/**
 * Remember a decision with rationale
 */
export async function rememberDecision(
  agentId: string,
  decision: string,
  rationale: string,
  alternatives?: string[],
  metadata?: Partial<MemoryMetadata>
): Promise<MemoryEntry> {
  const text = alternatives && alternatives.length > 0
    ? `Decision: ${decision}\nRationale: ${rationale}\nAlternatives considered: ${alternatives.join(', ')}`
    : `Decision: ${decision}\nRationale: ${rationale}`;
    
  return remember(
    agentId,
    {
      text,
      summary: decision,
      tags: ['decision'],
    },
    'decision',
    {
      ...metadata,
      importance: 7,
    }
  );
}

/**
 * Remember a learning/insight
 */
export async function rememberLearning(
  agentId: string,
  insight: string,
  source: string,
  confidence: number = 0.8,
  metadata?: Partial<MemoryMetadata>
): Promise<MemoryEntry> {
  return remember(
    agentId,
    {
      text: insight,
      tags: ['learning', 'insight'],
    },
    'learning',
    {
      ...metadata,
      source,
      confidence,
      importance: Math.round(confidence * 10),
    }
  );
}
