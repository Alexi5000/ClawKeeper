// file: examples/scope-review/src/schemas.ts
// description: Zod schemas and types for the TechTide scope-review example (notes, samples, drafts, review packets)
// reference: examples/scope-review/README.md, examples/scope-review/src/draft.ts

import { z } from 'zod';

const cents = z.bigint().nonnegative();

export const discovery_notes_schema = z.object({
  title: z.string().min(1),
  client: z.string().nullable(),
  industry: z.string().nullable(),
  contact: z.string().nullable(),
  decision_maker: z.string().nullable(),
  budget_cents: cents.nullable(),
  budget_raw: z.string().nullable(),
  // ISO date (YYYY-MM-DD) only when the notes state a concrete calendar date.
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  delivery_date_raw: z.string().nullable(),
  users: z.string().nullable(),
  integrations: z.array(z.string()),
  success_criteria: z.string().nullable(),
  body: z.string(),
});
export type DiscoveryNotes = z.infer<typeof discovery_notes_schema>;

export const phase_schema = z.object({
  name: z.string().min(1),
  weeks: z.number().int().positive(),
  deliverables: z.array(z.string().min(1)).min(1),
});
export type Phase = z.infer<typeof phase_schema>;

export const sample_project_schema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  industry: z.string().min(1),
  summary: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(3),
  phases: z.array(phase_schema).min(1),
  in_scope: z.array(z.string().min(1)).min(1),
  out_of_scope: z.array(z.string().min(1)),
  price_low_cents: cents,
  price_high_cents: cents,
  follow_up_questions: z.array(z.object({
    question: z.string().min(1),
    // The question counts as answered when the notes mention any of these words.
    answered_if_any: z.array(z.string().min(1)).min(1),
  })),
});
export type SampleProject = z.infer<typeof sample_project_schema>;

export const match_result_schema = z.object({
  sample_id: z.string(),
  sample_name: z.string(),
  score: z.number().min(0).max(1),
  matched_keywords: z.array(z.string()),
  runner_up: z.object({ sample_id: z.string(), score: z.number() }).nullable(),
});
export type MatchResult = z.infer<typeof match_result_schema>;

export const timeline_entry_schema = z.object({
  phase: z.string(),
  start_week: z.number().int().positive(),
  end_week: z.number().int().positive(),
  deliverables: z.array(z.string()),
});
export type TimelineEntry = z.infer<typeof timeline_entry_schema>;

export const open_question_schema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  question: z.string().min(1),
  why: z.string().min(1),
  blocking: z.boolean(),
});
export type OpenQuestion = z.infer<typeof open_question_schema>;

export const delivery_schema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('stated'),
    delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    latest_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    status: z.literal('open_question'),
    raw_mention: z.string().nullable(),
  }),
]);
export type Delivery = z.infer<typeof delivery_schema>;

export const scope_draft_schema = z.object({
  client: z.string(),
  source_title: z.string(),
  match: match_result_schema,
  summary: z.string(),
  in_scope: z.array(z.string()),
  out_of_scope: z.array(z.string()),
  timeline: z.array(timeline_entry_schema),
  total_weeks: z.number().int().positive(),
  delivery: delivery_schema,
  budget_cents: cents.nullable(),
  reference_price_low_cents: cents,
  reference_price_high_cents: cents,
  open_questions: z.array(open_question_schema),
});
export type ScopeDraft = z.infer<typeof scope_draft_schema>;

export const review_schema = z.object({
  reviewer: z.string().trim().min(2),
  decision: z.enum(['approved', 'changes_requested']),
  reviewed_at: z.string().datetime(),
  reviewed_draft_hash: z.string().regex(/^[a-f0-9]{64}$/),
  acknowledged_open_questions: z.boolean(),
  comment: z.string().nullable(),
});
export type Review = z.infer<typeof review_schema>;

export const review_packet_schema = z.object({
  kind: z.literal('techtide-scope-review-packet'),
  version: z.literal(1),
  created_at: z.string().datetime(),
  draft: scope_draft_schema,
  draft_hash: z.string().regex(/^[a-f0-9]{64}$/),
  review: review_schema.nullable(),
});
export type ReviewPacket = z.infer<typeof review_packet_schema>;
