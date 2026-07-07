// file: src/memory/store.ts
// description: PostgreSQL-backed memory store with tenant isolation and pgvector semantic search
// reference: src/memory/types.ts, src/memory/embedding_service.ts, src/api/routes/invoices.ts

import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import { create_embedding_service, type IEmbeddingService } from './embedding_service';
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
  private embedding_service: IEmbeddingService;

  constructor(sql: Sql) {
    this.sql = sql;
    this.embedding_service = create_embedding_service();
  }

  /**
   * Generate and store embedding for text content
   */
  private async generate_and_store_embedding(memory_id: string, content: MemoryContent): Promise<void> {
    try {
      // Extract text from content for embedding
      const text_to_embed = this.extract_text_from_content(content);
      
      if (text_to_embed && text_to_embed.length > 0) {
        const embedding = await this.embedding_service.generate(text_to_embed);
        
        // Update memory with embedding
        await this.sql`
          UPDATE memories
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${memory_id}
        `;
        
        console.log(`[Memory] Generated embedding for memory ${memory_id}`);
      }
    } catch (error) {
      // Log but don't fail the save operation
      console.error(`[Memory] Failed to generate embedding for ${memory_id}:`, error);
    }
  }

  /**
   * Extract searchable text from memory content
   */
  private extract_text_from_content(content: MemoryContent): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      // Extract text fields from object content
      const text_parts: string[] = [];
      
      if ('text' in content && typeof content.text === 'string') {
        text_parts.push(content.text);
      }
      if ('title' in content && typeof content.title === 'string') {
        text_parts.push(content.title);
      }
      if ('description' in content && typeof content.description === 'string') {
        text_parts.push(content.description);
      }
      if ('summary' in content && typeof content.summary === 'string') {
        text_parts.push(content.summary);
      }
      
      return text_parts.join(' ').trim();
    }
    
    return '';
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
   * Save a new memory entry with tenant isolation and embedding generation
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

    // Generate and store embedding asynchronously (don't block the response)
    this.generate_and_store_embedding(id, input.content).catch((err) => {
      console.error('[Memory] Embedding generation failed:', err);
    });

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

    // Build dynamic query conditions using placeholders to prevent SQL injection
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    conditions.push(`tenant_id = $${paramIdx++}`);
    values.push(tenantId);

    conditions.push(`agent_id = $${paramIdx++}`);
    values.push(agentId);

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (types && types.length > 0) {
      const placeholders = types.map(() => `$${paramIdx++}`).join(', ');
      conditions.push(`type IN (${placeholders})`);
      values.push(...types);
    }

    if (createdAfter) {
      conditions.push(`created_at >= $${paramIdx++}`);
      values.push(createdAfter);
    }

    if (createdBefore) {
      conditions.push(`created_at <= $${paramIdx++}`);
      values.push(createdBefore);
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : 
                       sortBy === 'importance' ? "(metadata->>'importance')::int" : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count using parameterized query
    const [countResult] = await this.sql.unsafe(
      `SELECT COUNT(*) as count FROM memories WHERE ${whereClause}`,
      values
    ) as any[];
    const total = parseInt(countResult.count, 10);

    // Get paginated results using parameterized query
    const rows = await this.sql.unsafe(
      `SELECT * FROM memories WHERE ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ${limit} OFFSET ${offset}`,
      values
    ) as MemoryRow[];

    return {
      memories: rows.map(row => this.rowToEntry(row)),
      total,
    };
  }

  /**
   * Search memories with semantic search
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

    // Build dynamic query conditions using placeholders to prevent SQL injection
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    conditions.push(`tenant_id = $${paramIdx++}`);
    values.push(tenantId);

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (agentIds && agentIds.length > 0) {
      const placeholders = agentIds.map(() => `$${paramIdx++}`).join(', ');
      conditions.push(`agent_id IN (${placeholders})`);
      values.push(...agentIds);
    }

    if (types && types.length > 0) {
      const placeholders = types.map(() => `$${paramIdx++}`).join(', ');
      conditions.push(`type IN (${placeholders})`);
      values.push(...types);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => `content->'tags' ? $${paramIdx++}`).join(' OR ');
      conditions.push(`(${tagConditions})`);
      values.push(...tags);
    }

    if (createdAfter) {
      conditions.push(`created_at >= $${paramIdx++}`);
      values.push(createdAfter);
    }

    if (createdBefore) {
      conditions.push(`created_at <= $${paramIdx++}`);
      values.push(createdBefore);
    }

    if (minImportance !== undefined) {
      conditions.push(`(metadata->>'importance')::int >= $${paramIdx++}`);
      values.push(minImportance);
    }

    // Try semantic hybrid search if text query is provided
    let queryEmbedding: number[] | null = null;
    if (text) {
      try {
        queryEmbedding = await this.embedding_service.generate(text);
      } catch (err) {
        console.error('[Memory] Failed to generate embedding for query search, falling back to text search:', err);
      }
    }

    if (text && queryEmbedding) {
      // 1. Vector similarity search using cosine distance
      const vectorWhere = [...conditions, 'embedding IS NOT NULL'].join(' AND ');
      const vectorValues = [...values, JSON.stringify(queryEmbedding)];
      const vectorQuery = `
        SELECT 
          *,
          1 - (embedding <=> $${paramIdx}::vector) as similarity
        FROM memories
        WHERE ${vectorWhere}
        ORDER BY similarity DESC
        LIMIT ${limit + offset}
      `;
      const vectorRows = await this.sql.unsafe(vectorQuery, vectorValues) as (MemoryRow & { similarity: number })[];

      // 2. Keyword search for hybrid combination
      const textWhere = [...conditions, `(content->>'text' ILIKE $${paramIdx} OR content->>'summary' ILIKE $${paramIdx})`].join(' AND ');
      const textValues = [...values, `%${text}%`];
      const textQuery = `
        SELECT *
        FROM memories
        WHERE ${textWhere}
        LIMIT ${limit + offset}
      `;
      const textRows = await this.sql.unsafe(textQuery, textValues) as MemoryRow[];

      // 3. Merge and deduplicate
      const seenIds = new Set<string>();
      const merged: MemorySearchResult[] = [];

      for (const row of vectorRows) {
        if (!seenIds.has(row.id)) {
          const contentText = this.extract_text_from_content(row.content);
          merged.push({
            memory: this.rowToEntry(row),
            score: row.similarity,
            highlights: this.extractHighlights(contentText, text),
          });
          seenIds.add(row.id);
        }
      }

      for (const row of textRows) {
        if (!seenIds.has(row.id)) {
          const contentText = this.extract_text_from_content(row.content);
          merged.push({
            memory: this.rowToEntry(row),
            score: this.calculateTextRelevance(contentText, text),
            highlights: this.extractHighlights(contentText, text),
          });
          seenIds.add(row.id);
        }
      }

      // Sort merged results
      if (sortBy === 'importance') {
        merged.sort((a, b) => {
          const impA = a.memory.metadata.importance ?? 0;
          const impB = b.memory.metadata.importance ?? 0;
          return sortOrder === 'asc' ? impA - impB : impB - impA;
        });
      } else if (sortBy === 'createdAt') {
        merged.sort((a, b) => {
          const timeA = new Date(a.memory.createdAt).getTime();
          const timeB = new Date(b.memory.createdAt).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
      } else {
        // default/relevance sorting
        merged.sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        });
      }

      const total = merged.length;
      const paginated = merged.slice(offset, offset + limit);

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
        results: paginated,
        total,
        hasMore: offset + paginated.length < total,
        query: fullQuery,
      };
    }

    // Fallback or non-text standard search
    if (text) {
      conditions.push(`(content->>'text' ILIKE $${paramIdx} OR content->>'summary' ILIKE $${paramIdx})`);
      values.push(`%${text}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = sortBy === 'createdAt' ? 'created_at' :
                       sortBy === 'importance' ? "(metadata->>'importance')::int" : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const [countResult] = await this.sql.unsafe(
      `SELECT COUNT(*) as count FROM memories WHERE ${whereClause}`,
      values
    ) as any[];
    const total = parseInt(countResult.count, 10);

    // Get paginated results
    const rows = await this.sql.unsafe(
      `SELECT * FROM memories WHERE ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ${limit} OFFSET ${offset}`,
      values
    ) as MemoryRow[];

    const results: MemorySearchResult[] = rows.map(row => ({
      memory: this.rowToEntry(row),
      score: text ? this.calculateTextRelevance(this.extract_text_from_content(row.content), text) : undefined,
      highlights: text ? this.extractHighlights(this.extract_text_from_content(row.content), text) : undefined,
    }));

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

  /**
   * Semantic search using pgvector hybrid approach
   * Combines vector similarity with text search and merges results
   */
  async semanticSearch(
    tenantId: string,
    queryText: string,
    options: {
      limit?: number;
      agentIds?: string[];
      types?: MemoryType[];
      minSimilarity?: number;
    } = {}
  ): Promise<MemorySearchResult[]> {
    const { limit = 20, agentIds, types, minSimilarity = 0.7 } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await this.embedding_service.generate(queryText);

      // Build filter conditions using parameters
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      conditions.push(`tenant_id = $${paramIdx++}`);
      values.push(tenantId);

      conditions.push('deleted_at IS NULL');

      if (agentIds && agentIds.length > 0) {
        const placeholders = agentIds.map(() => `$${paramIdx++}`).join(', ');
        conditions.push(`agent_id IN (${placeholders})`);
        values.push(...agentIds);
      }

      if (types && types.length > 0) {
        const placeholders = types.map(() => `$${paramIdx++}`).join(', ');
        conditions.push(`type IN (${placeholders})`);
        values.push(...types);
      }

      // Vector similarity search using cosine distance
      const vectorWhere = [...conditions, 'embedding IS NOT NULL'].join(' AND ');
      const vectorValues = [...values, JSON.stringify(queryEmbedding)];
      const vectorQuery = `
        SELECT 
          *,
          1 - (embedding <=> $${paramIdx}::vector) as similarity
        FROM memories
        WHERE ${vectorWhere}
          AND 1 - (embedding <=> $${paramIdx}::vector) >= ${minSimilarity}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      const vectorResults = await this.sql.unsafe(vectorQuery, vectorValues) as (MemoryRow & { similarity: number })[];

      // Text search fallback with parameters
      const textWhere = conditions.join(' AND ');
      const textValues = [...values, `%${queryText}%`, `%${queryText}%`];
      const textQuery = `
        SELECT *
        FROM memories
        WHERE ${textWhere}
          AND (
            content::text ILIKE $${paramIdx}
            OR metadata::text ILIKE $${paramIdx + 1}
          )
        LIMIT ${Math.floor(limit / 2)}
      `;

      const textResults = await this.sql.unsafe(textQuery, textValues) as MemoryRow[];

      // Merge and deduplicate
      const seenIds = new Set<string>();
      const merged: MemorySearchResult[] = [];

      for (const row of vectorResults) {
        if (!seenIds.has(row.id)) {
          merged.push({
            memory: this.rowToEntry(row),
            score: row.similarity,
            highlights: [],
          });
          seenIds.add(row.id);
        }
      }

      for (const row of textResults) {
        if (!seenIds.has(row.id)) {
          const contentText = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
          merged.push({
            memory: this.rowToEntry(row),
            score: 0.5,
            highlights: this.extractHighlights(contentText, queryText),
          });
          seenIds.add(row.id);
        }
      }

      console.log(`[Memory] Hybrid search: ${merged.length} results (${vectorResults.length} semantic, ${textResults.length} keyword)`);

      return merged.slice(0, limit);
    } catch (error) {
      console.error('[Memory] Semantic search failed, falling back to text search:', error);
      
      // Graceful fallback with parameters
      const fallbackQuery = `
        SELECT *
        FROM memories
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND (
            content::text ILIKE $2
            OR metadata::text ILIKE $3
          )
        LIMIT $4
      `;
      const fallbackValues = [tenantId, `%${queryText}%`, `%${queryText}%`, limit];
      const fallbackResults = await this.sql.unsafe(fallbackQuery, fallbackValues) as MemoryRow[];

      return fallbackResults.map(row => {
        const contentText = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
        return {
          memory: this.rowToEntry(row),
          score: 0.5,
          highlights: this.extractHighlights(contentText, queryText),
        };
      });
    }
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
