// file: src/types/hono.ts
// description: Hono type definitions for ClawKeeper API context
// reference: src/api/server.ts

import type { Context } from 'hono';

/**
 * Custom variables stored in Hono context
 */
export interface AppVariables {
  tenant_id: string;
  user_id: string;
  user_role: string;
}

/**
 * Environment bindings for Hono app
 */
export interface AppEnv {
  Variables: AppVariables;
}

/**
 * Typed context for route handlers
 */
export type AppContext = Context<AppEnv>;
