// file: src/memory/types.ts
// description: Type definitions for the ClawKeeper memory system
// reference: src/core/types.ts

import { z } from 'zod';
import type { TenantId } from '../core/types';

// ============================================================================
// Memory Type Enum
// ============================================================================

export const MemoryType = z.enum([
  'conversation',  // Chat/interaction history
  'task',          // Task execution records
  'decision',      // Decision rationale and outcomes
  'learning',      // Learned patterns and insights
  'context',       // Contextual information for agents
]);
export type MemoryType = z.infer<typeof MemoryType>;

// ============================================================================
// Memory Entry
// ============================================================================

export const MemoryId = z.string().uuid();
export type MemoryId = z.infer<typeof MemoryId>;

export const AgentId = z.string();
export type AgentId = z.infer<typeof AgentId>;

export const MemoryContent = z.object({
  text: z.string(),
  summary: z.string().optional(),
  embedding: z.array(z.number()).optional(), // Vector embedding for semantic search
  entities: z.array(z.string()).optional(),  // Extracted entities
  tags: z.array(z.string()).optional(),      // User-defined tags
});
export type MemoryContent = z.infer<typeof MemoryContent>;

export const MemoryMetadata = z.object({
  source: z.string().optional(),           // Where the memory came from
  confidence: z.number().min(0).max(1).optional(), // Confidence score
  expiresAt: z.string().datetime().optional(),     // TTL for ephemeral memories
  relatedMemories: z.array(z.string().uuid()).optional(), // Links to other memories
  taskId: z.string().uuid().optional(),    // Associated task
  userId: z.string().uuid().optional(),    // Associated user
  importance: z.number().min(1).max(10).optional(), // Importance score 1-10
  version: z.number().default(1),          // Version for updates
}).passthrough(); // Allow additional fields
export type MemoryMetadata = z.infer<typeof MemoryMetadata>;

export const MemoryEntry = z.object({
  id: MemoryId,
  tenantId: z.string().uuid(),
  agentId: AgentId,
  type: MemoryType,
  content: MemoryContent,
  metadata: MemoryMetadata,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});
export type MemoryEntry = z.infer<typeof MemoryEntry>;

// ============================================================================
// Memory Query Interface
// ============================================================================

export const MemorySortField = z.enum(['createdAt', 'importance', 'relevance']);
export type MemorySortField = z.infer<typeof MemorySortField>;

export const MemorySortOrder = z.enum(['asc', 'desc']);
export type MemorySortOrder = z.infer<typeof MemorySortOrder>;

export const MemoryQuery = z.object({
  // Text search
  text: z.string().optional(),
  
  // Filters
  types: z.array(MemoryType).optional(),
  tags: z.array(z.string()).optional(),
  agentIds: z.array(AgentId).optional(),
  
  // Time range
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  
  // Importance filter
  minImportance: z.number().min(1).max(10).optional(),
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  
  // Sorting
  sortBy: MemorySortField.default('createdAt'),
  sortOrder: MemorySortOrder.default('desc'),
  
  // Include deleted (soft-deleted) memories
  includeDeleted: z.boolean().default(false),
});
export type MemoryQuery = z.infer<typeof MemoryQuery>;

/** Input type for creating a MemoryQuery with optional defaults */
export type MemoryQueryInput = z.input<typeof MemoryQuery>;

// ============================================================================
// Memory Search Result
// ============================================================================

export const MemorySearchResult = z.object({
  memory: MemoryEntry,
  score: z.number().min(0).max(1).optional(), // Relevance score for semantic search
  highlights: z.array(z.string()).optional(), // Matching text snippets
});
export type MemorySearchResult = z.infer<typeof MemorySearchResult>;

export const MemorySearchResponse = z.object({
  results: z.array(MemorySearchResult),
  total: z.number(),
  hasMore: z.boolean(),
  query: MemoryQuery,
});
export type MemorySearchResponse = z.infer<typeof MemorySearchResponse>;

// ============================================================================
// Create/Update DTOs
// ============================================================================

export const CreateMemoryInput = z.object({
  agentId: AgentId,
  type: MemoryType,
  content: MemoryContent,
  metadata: MemoryMetadata.optional(),
});
export type CreateMemoryInput = z.infer<typeof CreateMemoryInput>;

export const UpdateMemoryInput = z.object({
  content: MemoryContent.partial().optional(),
  metadata: MemoryMetadata.partial().optional(),
});
export type UpdateMemoryInput = z.infer<typeof UpdateMemoryInput>;

// ============================================================================
// Memory Options
// ============================================================================

export const GetMemoriesOptions = z.object({
  types: z.array(MemoryType).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeDeleted: z.boolean().default(false),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  sortBy: MemorySortField.default('createdAt'),
  sortOrder: MemorySortOrder.default('desc'),
});
export type GetMemoriesOptions = z.infer<typeof GetMemoriesOptions>;
