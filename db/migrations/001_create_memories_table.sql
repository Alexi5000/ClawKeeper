-- Migration: 001_create_memories_table
-- Description: Create the memories table for the ClawKeeper memory system
-- Created: 2025-01-XX (auto-generated)

-- ============================================================================
-- Enable Required Extensions
-- ============================================================================

-- Enable uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Create Memories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS memories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (CRITICAL for multi-tenancy)
  tenant_id UUID NOT NULL,
  
  -- Agent identification
  agent_id VARCHAR(255) NOT NULL,
  
  -- Memory type classification
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'conversation',
    'task', 
    'decision',
    'learning',
    'context'
  )),
  
  -- Memory content (flexible JSONB structure)
  -- Expected schema: { text: string, summary?: string, embedding?: number[], entities?: string[], tags?: string[] }
  content JSONB NOT NULL DEFAULT '{}',
  
  -- Additional metadata (flexible JSONB structure)
  -- Expected schema: { source?: string, confidence?: number, expiresAt?: string, relatedMemories?: string[], taskId?: string, userId?: string, importance?: number, version: number }
  metadata JSONB NOT NULL DEFAULT '{"version": 1}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL -- Soft delete support
);

-- ============================================================================
-- Create Indexes for Performance
-- ============================================================================

-- Primary composite index for tenant-scoped queries (most common access pattern)
CREATE INDEX idx_memories_tenant_agent_type 
  ON memories (tenant_id, agent_id, type)
  WHERE deleted_at IS NULL;

-- Index for tenant-level queries
CREATE INDEX idx_memories_tenant_id 
  ON memories (tenant_id)
  WHERE deleted_at IS NULL;

-- Index for time-based queries (sorting, filtering)
CREATE INDEX idx_memories_created_at 
  ON memories (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for type-based filtering
CREATE INDEX idx_memories_type 
  ON memories (tenant_id, type)
  WHERE deleted_at IS NULL;

-- GIN index for JSONB content search (tags, entities)
CREATE INDEX idx_memories_content_tags 
  ON memories USING GIN ((content->'tags'))
  WHERE deleted_at IS NULL;

-- GIN index for full-text search on content.text
CREATE INDEX idx_memories_content_text 
  ON memories USING GIN (to_tsvector('english', content->>'text'))
  WHERE deleted_at IS NULL;

-- Index for importance-based sorting (metadata.importance)
CREATE INDEX idx_memories_importance 
  ON memories (tenant_id, ((metadata->>'importance')::int) DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Index for soft-deleted records (for cleanup operations)
CREATE INDEX idx_memories_deleted 
  ON memories (tenant_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on the memories table
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their own memories
CREATE POLICY tenant_isolation_policy ON memories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Allow service role to bypass RLS (for admin operations)
CREATE POLICY service_role_policy ON memories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS memories_updated_at_trigger ON memories;
CREATE TRIGGER memories_updated_at_trigger
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_memories_updated_at();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE memories IS 'Agent memory storage with tenant isolation for ClawKeeper AI bookkeeping system';
COMMENT ON COLUMN memories.id IS 'Unique memory identifier (UUID)';
COMMENT ON COLUMN memories.tenant_id IS 'Tenant identifier for multi-tenancy isolation';
COMMENT ON COLUMN memories.agent_id IS 'Agent identifier (e.g., cfo, accounts_payable_lead)';
COMMENT ON COLUMN memories.type IS 'Memory type: conversation, task, decision, learning, context';
COMMENT ON COLUMN memories.content IS 'JSONB content with text, summary, embedding, entities, tags';
COMMENT ON COLUMN memories.metadata IS 'JSONB metadata with source, confidence, importance, version, etc.';
COMMENT ON COLUMN memories.created_at IS 'Timestamp when memory was created';
COMMENT ON COLUMN memories.updated_at IS 'Timestamp when memory was last updated';
COMMENT ON COLUMN memories.deleted_at IS 'Soft delete timestamp (NULL = active, non-NULL = deleted)';

-- ============================================================================
-- Grants (adjust based on your role setup)
-- ============================================================================

-- Grant permissions to application role (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON memories TO clawkeeper_app;
-- GRANT USAGE ON SEQUENCE memories_id_seq TO clawkeeper_app;

-- ============================================================================
-- Migration Complete
-- ============================================================================
