// file: src/memory/store.ts
// description: PostgreSQL-backed memory store with tenant isolation
// reference: src/memory/types.ts, src/api/routes/invoices.ts

import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import type {
  MemoryEntry,
  MemoryId,
  MemoryQuery,
  MemoryQueryInput,
  MemorySearchResponse,
  MemorySearchResult,
  CreateMemoryInput,
  UpdateMemoryInput,
  GetMemoriesOptions,
  MemoryContent,
  MemoryMetadata,
  MemoryType,
} from './types';

// ============================================================================
// Database Row Types
// ============================================================================

interface MemoryRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  type: string;
  content: MemoryContent;
  metadata: MemoryMetadata;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

// ============================================================================
// Memory Store Class
// ============================================================================

export class MemoryStore {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  /**
   * Transform database row to MemoryEntry
   */
  private rowToEntry(row: MemoryRow): MemoryEntry {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      type: row.type as MemoryType,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      deletedAt: row.deleted_at?.toISOString() ?? null,
    };
  }

  /**
   * Save a new memory entry with tenant isolation
   */
  async saveMemory(tenantId: string, input: CreateMemoryInput): Promise<MemoryEntry> {
    const id = uuid();
    const now = new Date();
    const metadata = input.metadata ?? { version: 1 };

    const [row] = await this.sql<MemoryRow[]>`
      INSERT INTO memories (
        id,
        tenant_id,
        agent_id,
        type,
        content,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${tenantId},
        ${input.agentId},
        ${input.type},
        ${this.sql.json(JSON.parse(JSON.stringify(input.content)))},
        ${this.sql.json(JSON.parse(JSON.stringify(metadata)))},
        ${now},
        ${now}
      )
      RETURNING *
    `;

    return this.rowToEntry(row);
  }

  /**
   * Get a single memory by ID with tenant isolation
   */
  async getMemory(tenantId: string, memoryId: MemoryId): Promise<MemoryEntry | null> {
    const [row] = await this.sql<MemoryRow[]>`
      SELECT *
      FROM memories
      WHERE id = ${memoryId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `;

    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Get memories for a specific agent with filters
   */
  async getMemories(
    tenantId: string,
    agentId: string,
    options: Partial<GetMemoriesOptions> = {}
  ): Promise<{ memories: MemoryEntry[]; total: number }> {
    const {
      types,
      limit = 20,
      offset = 0,
      includeDeleted = false,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build dynamic query conditions
    const conditions: string[] = [
      `tenant_id = '${tenantId}'`,
      `agent_id = '${agentId}'`,
    ];

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (types && types.length > 0) {
      const typeList = types.map(t => `'${t}'`).join(', ');
      conditions.push(`type IN (${typeList})`);
    }

    if (createdAfter) {
      conditions.push(`created_at >= '${createdAfter}'`);
    }

    if (createdBefore) {
      conditions.push(`created_at <= '${createdBefore}'`);
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : 
                       sortBy === 'importance' ? "metadata->>'importance'" : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const [countResult] = await this.sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM memories
      WHERE ${this.sql.unsafe(whereClause)}
    `;
    const total = parseInt(countResult.count, 10);

    // Get paginated results
    const rows = await this.sql<MemoryRow[]>`
      SELECT *
      FROM memories
      WHERE ${this.sql.unsafe(whereClause)}
      ORDER BY ${this.sql.unsafe(sortColumn)} ${this.sql.unsafe(order)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      memories: rows.map(row => this.rowToEntry(row)),
      total,
    };
  }

  /**
   * Search memories with semantic search placeholder
   * TODO: Integrate with vector database (pgvector) for true semantic search
   */
  async searchMemories(
    tenantId: string,
    query: MemoryQueryInput
  ): Promise<MemorySearchResponse> {
    const {
      text,
      types,
      tags,
      agentIds,
      createdAfter,
      createdBefore,
      minImportance,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = query;

    // Build dynamic query conditions
    const conditions: string[] = [`tenant_id = '${tenantId}'`];

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (agentIds && agentIds.length > 0) {
      const agentList = agentIds.map(a => `'${a}'`).join(', ');
      conditions.push(`agent_id IN (${agentList})`);
    }

    if (types && types.length > 0) {
      const typeList = types.map(t => `'${t}'`).join(', ');
      conditions.push(`type IN (${typeList})`);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(t => `content->'tags' ? '${t}'`).join(' OR ');
      conditions.push(`(${tagConditions})`);
    }

    if (createdAfter) {
      conditions.push(`created_at >= '${createdAfter}'`);
    }

    if (createdBefore) {
      conditions.push(`created_at <= '${createdBefore}'`);
    }

    if (minImportance !== undefined) {
      conditions.push(`(metadata->>'importance')::int >= ${minImportance}`);
    }

    // Text search using PostgreSQL full-text search
    if (text) {
      conditions.push(`(
        content->>'text' ILIKE '%${text}%' OR 
        content->>'summary' ILIKE '%${text}%'
      )`);
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = sortBy === 'createdAt' ? 'created_at' :
                       sortBy === 'importance' ? "COALESCE((metadata->>'importance')::int, 0)" :
                       'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const [countResult] = await this.sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM memories
      WHERE ${this.sql.unsafe(whereClause)}
    `;
    const total = parseInt(countResult.count, 10);

    // Get paginated results
    const rows = await this.sql<MemoryRow[]>`
      SELECT *
      FROM memories
      WHERE ${this.sql.unsafe(whereClause)}
      ORDER BY ${this.sql.unsafe(sortColumn)} ${this.sql.unsafe(order)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const results: MemorySearchResult[] = rows.map(row => ({
      memory: this.rowToEntry(row),
      score: text ? this.calculateTextRelevance(row.content.text, text) : undefined,
      highlights: text ? this.extractHighlights(row.content.text, text) : undefined,
    }));

    // Build full query with applied defaults for the response
    const fullQuery: MemoryQuery = {
      text,
      types,
      tags,
      agentIds,
      createdAfter,
      createdBefore,
      minImportance,
      limit,
      offset,
      sortBy,
      sortOrder,
      includeDeleted,
    };

    return {
      results,
      total,
      hasMore: offset + rows.length < total,
      query: fullQuery,
    };
  }

  /**
   * Soft delete a memory with tenant isolation
   */
  async deleteMemory(tenantId: string, memoryId: MemoryId): Promise<boolean> {
    const result = await this.sql`
      UPDATE memories
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = ${memoryId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `;

    return result.count > 0;
  }

  /**
   * Hard delete a memory (permanent removal)
   */
  async hardDeleteMemory(tenantId: string, memoryId: MemoryId): Promise<boolean> {
    const result = await this.sql`
      DELETE FROM memories
      WHERE id = ${memoryId}
        AND tenant_id = ${tenantId}
    `;

    return result.count > 0;
  }

  /**
   * Update an existing memory
   */
  async updateMemory(
    tenantId: string,
    memoryId: MemoryId,
    update: UpdateMemoryInput
  ): Promise<MemoryEntry | null> {
    const existing = await this.getMemory(tenantId, memoryId);
    if (!existing) {
      return null;
    }

    const updatedContent = update.content
      ? { ...existing.content, ...update.content }
      : existing.content;

    const updatedMetadata = update.metadata
      ? { ...existing.metadata, ...update.metadata, version: (existing.metadata.version ?? 0) + 1 }
      : { ...existing.metadata, version: (existing.metadata.version ?? 0) + 1 };

    const [row] = await this.sql<MemoryRow[]>`
      UPDATE memories
      SET content = ${this.sql.json(JSON.parse(JSON.stringify(updatedContent)))},
          metadata = ${this.sql.json(JSON.parse(JSON.stringify(updatedMetadata)))},
          updated_at = NOW()
      WHERE id = ${memoryId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      RETURNING *
    `;

    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Restore a soft-deleted memory
   */
  async restoreMemory(tenantId: string, memoryId: MemoryId): Promise<MemoryEntry | null> {
    const [row] = await this.sql<MemoryRow[]>`
      UPDATE memories
      SET deleted_at = NULL,
          updated_at = NOW()
      WHERE id = ${memoryId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NOT NULL
      RETURNING *
    `;

    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Get memory count for an agent
   */
  async getMemoryCount(tenantId: string, agentId: string): Promise<number> {
    const [result] = await this.sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM memories
      WHERE tenant_id = ${tenantId}
        AND agent_id = ${agentId}
        AND deleted_at IS NULL
    `;

    return parseInt(result.count, 10);
  }

  /**
   * Cleanup expired memories
   */
  async cleanupExpiredMemories(tenantId: string): Promise<number> {
    const result = await this.sql`
      UPDATE memories
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND metadata->>'expiresAt' IS NOT NULL
        AND (metadata->>'expiresAt')::timestamptz < NOW()
    `;

    return result.count;
  }

  /**
   * Calculate simple text relevance score (placeholder for semantic search)
   */
  private calculateTextRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  /**
   * Extract text highlights around matching terms
   */
  private extractHighlights(text: string, query: string, contextChars: number = 50): string[] {
    const highlights: string[] = [];
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let index = textLower.indexOf(queryLower);
    while (index !== -1 && highlights.length < 3) {
      const start = Math.max(0, index - contextChars);
      const end = Math.min(text.length, index + query.length + contextChars);
      let highlight = text.substring(start, end);
      
      if (start > 0) highlight = '...' + highlight;
      if (end < text.length) highlight = highlight + '...';
      
      highlights.push(highlight);
      index = textLower.indexOf(queryLower, index + 1);
    }
    
    return highlights;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new MemoryStore instance
 */
export function createMemoryStore(sql: Sql): MemoryStore {
  return new MemoryStore(sql);
}
