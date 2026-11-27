// file: examples/scope-review/src/review.ts
// description: Human review gate for scope drafts: hashing, approval, and an export that refuses unreviewed or edited drafts
// reference: examples/scope-review/src/draft.ts, examples/scope-review/src/schemas.ts, examples/scope-review/src/render.ts

import { createHash } from 'node:crypto';
import { render_scope_markdown } from './render';
import { review_packet_schema, type ReviewPacket, type ScopeDraft } from './schemas';

export class ReviewRequiredError extends Error {
  readonly reason: 'not_reviewed' | 'changes_requested' | 'draft_changed_after_review' | 'open_questions_not_acknowledged';
  constructor(reason: ReviewRequiredError['reason'], message: string) {
    super(message);
    this.name = 'ReviewRequiredError';
    this.reason = reason;
  }
}

/** JSON with sorted keys and bigint as "<digits>n", so the same draft always hashes the same. */
function canonical_json(value: unknown): string {
  if (typeof value === 'bigint') return JSON.stringify(`${value.toString()}n`);
  if (Array.isArray(value)) return `[${value.map(canonical_json).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonical_json(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hash_draft(draft: ScopeDraft): string {
  return createHash('sha256').update(canonical_json(draft)).digest('hex');
}

export function create_review_packet(draft: ScopeDraft, now: Date = new Date()): ReviewPacket {
  return review_packet_schema.parse({
    kind: 'techtide-scope-review-packet',
    version: 1,
    created_at: now.toISOString(),
    draft,
    draft_hash: hash_draft(draft),
    review: null,
  });
}

export interface ReviewInput {
  reviewer: string;
  decision: 'approved' | 'changes_requested';
  acknowledged_open_questions: boolean;
  comment?: string;
}

/** Records a person's decision on the exact draft they saw. Approval with open questions needs them acknowledged. */
export function record_review(packet: ReviewPacket, input: ReviewInput, now: Date = new Date()): ReviewPacket {
  const has_open_questions = packet.draft.open_questions.length > 0;
  if (input.decision === 'approved' && has_open_questions && !input.acknowledged_open_questions) {
    throw new ReviewRequiredError(
      'open_questions_not_acknowledged',
      `Approval needs the ${packet.draft.open_questions.length} open question(s) acknowledged first.`,
    );
  }
  return review_packet_schema.parse({
    ...packet,
    review: {
      reviewer: input.reviewer,
      decision: input.decision,
      reviewed_at: now.toISOString(),
      reviewed_draft_hash: hash_draft(packet.draft),
      acknowledged_open_questions: input.acknowledged_open_questions,
      comment: input.comment ?? null,
    },
  });
}

/** Throws ReviewRequiredError unless a named person approved this exact draft. */
export function assert_export_allowed(packet: ReviewPacket): void {
  const review = packet.review;
  if (review === null) {
    throw new ReviewRequiredError('not_reviewed', 'Export blocked: this draft has not been reviewed by a person yet.');
  }
  if (review.decision !== 'approved') {
    throw new ReviewRequiredError('changes_requested', `Export blocked: ${review.reviewer} requested changes.`);
  }
  if (review.reviewed_draft_hash !== hash_draft(packet.draft)) {
    throw new ReviewRequiredError('draft_changed_after_review', 'Export blocked: the draft changed after it was approved. Review it again.');
  }
  if (packet.draft.open_questions.length > 0 && !review.acknowledged_open_questions) {
    throw new ReviewRequiredError('open_questions_not_acknowledged', 'Export blocked: open questions were not acknowledged in the review.');
  }
}

export function export_scope(packet: ReviewPacket): string {
  assert_export_allowed(packet);
  const review = packet.review;
  if (review === null) throw new ReviewRequiredError('not_reviewed', 'Export blocked: not reviewed.');
  return render_scope_markdown(packet.draft, review);
}

// Packet files store bigint amounts as "<digits>n" strings and read them back here.
export function packet_to_json(packet: ReviewPacket): string {
  return JSON.stringify(packet, (_key, value: unknown) => (typeof value === 'bigint' ? `${value.toString()}n` : value), 2);
}

export function packet_from_json(text: string): ReviewPacket {
  const parsed: unknown = JSON.parse(text, (_key, value: unknown) =>
    typeof value === 'string' && /^\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value);
  return review_packet_schema.parse(parsed);
}
