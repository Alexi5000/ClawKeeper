// file: src/guardrails/audit-logger.ts
// description: Audit logging for ClawKeeper with immutable trail
// reference: db/schema.sql audit_log table

import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';

export interface AuditLogEntry {
  tenant_id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'export' | 'import';
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogger {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  /**
   * Log audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.sql`
        INSERT INTO audit_log (
          id, tenant_id, user_id, action, entity_type, entity_id,
          changes, ip_address, user_agent
        )
        VALUES (
          ${uuid()},
          ${entry.tenant_id},
          ${entry.user_id},
          ${entry.action},
          ${entry.entity_type},
          ${entry.entity_id},
          ${entry.changes ? JSON.stringify(entry.changes) : null},
          ${entry.ip_address || null},
          ${entry.user_agent || null}
        )
      `;
    } catch (error) {
      // Never block main operation due to audit log failure
      console.error('[AuditLogger] Failed to log audit entry:', error);
    }
  }

  /**
   * Query audit log
   */
  async query(filters: {
    tenant_id: string;
    user_id?: string;
    entity_type?: string;
    entity_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) {
    let query = this.sql`
      SELECT *
      FROM audit_log
      WHERE tenant_id = ${filters.tenant_id}
    `;

    // Apply filters
    if (filters.user_id) {
      query = this.sql`${query} AND user_id = ${filters.user_id}`;
    }

    if (filters.entity_type) {
      query = this.sql`${query} AND entity_type = ${filters.entity_type}`;
    }

    if (filters.entity_id) {
      query = this.sql`${query} AND entity_id = ${filters.entity_id}`;
    }

    if (filters.start_date) {
      query = this.sql`${query} AND timestamp >= ${filters.start_date}`;
    }

    if (filters.end_date) {
      query = this.sql`${query} AND timestamp <= ${filters.end_date}`;
    }

    const limit = filters.limit || 100;
    query = this.sql`${query} ORDER BY timestamp DESC LIMIT ${limit}`;

    return await query;
  }

  /**
   * Get audit trail for specific entity
   */
  async get_entity_trail(tenant_id: string, entity_type: string, entity_id: string) {
    return await this.sql`
      SELECT 
        audit_log.*,
        users.name as user_name,
        users.email as user_email
      FROM audit_log
      LEFT JOIN users ON audit_log.user_id = users.id
      WHERE audit_log.tenant_id = ${tenant_id}
      AND audit_log.entity_type = ${entity_type}
      AND audit_log.entity_id = ${entity_id}
      ORDER BY audit_log.timestamp ASC
    `;
  }

  /**
   * Generate audit report
   */
  async generate_report(tenant_id: string, start_date: string, end_date: string) {
    const entries = await this.query({ tenant_id, start_date, end_date, limit: 10000 });

    // Aggregate by action type
    const by_action = entries.reduce((acc: Record<string, number>, entry: any) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {});

    // Aggregate by entity type
    const by_entity = entries.reduce((acc: Record<string, number>, entry: any) => {
      acc[entry.entity_type] = (acc[entry.entity_type] || 0) + 1;
      return acc;
    }, {});

    // Aggregate by user
    const by_user = entries.reduce((acc: Record<string, number>, entry: any) => {
      acc[entry.user_id] = (acc[entry.user_id] || 0) + 1;
      return acc;
    }, {});

    return {
      period: { start_date, end_date },
      total_actions: entries.length,
      by_action,
      by_entity,
      by_user,
      entries: entries.slice(0, 100), // Latest 100
    };
  }
}
