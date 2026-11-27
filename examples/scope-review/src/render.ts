// file: examples/scope-review/src/render.ts
// description: Text renderings of a scope draft: an on-screen review view and the approved markdown export
// reference: examples/scope-review/src/review.ts, examples/scope-review/src/cli.ts

import { money } from './draft';
import type { Review, ScopeDraft } from './schemas';

function delivery_line(draft: ScopeDraft): string {
  if (draft.delivery.status === 'stated') {
    return `${draft.delivery.delivery_date} (work must start by ${draft.delivery.latest_start_date} for ${draft.total_weeks} weeks)`;
  }
  const said = draft.delivery.raw_mention === null ? 'not mentioned' : `notes say "${draft.delivery.raw_mention}"`;
  return `OPEN QUESTION, not agreed (${said})`;
}

function timeline_lines(draft: ScopeDraft): string[] {
  return draft.timeline.map((entry) => {
    const weeks = entry.start_week === entry.end_week ? `Week ${entry.start_week}` : `Weeks ${entry.start_week}-${entry.end_week}`;
    return `- ${weeks}: ${entry.phase} (${entry.deliverables.join('; ')})`;
  });
}

function question_lines(draft: ScopeDraft): string[] {
  if (draft.open_questions.length === 0) return ['- None'];
  return draft.open_questions.map((q) => `- ${q.blocking ? '[blocking] ' : ''}${q.question}\n  Why: ${q.why}`);
}

function budget_line(draft: ScopeDraft): string {
  const reference = `${money(draft.reference_price_low_cents)} to ${money(draft.reference_price_high_cents)}`;
  return draft.budget_cents === null ? `not stated (reference ${reference})` : `${money(draft.budget_cents)} (reference ${reference})`;
}

export function render_review_view(draft: ScopeDraft): string {
  const runner_up = draft.match.runner_up ? `, runner-up ${draft.match.runner_up.sample_id} (${draft.match.runner_up.score})` : '';
  return [
    `DRAFT, NOT REVIEWED: ${draft.client}`,
    `Source notes: ${draft.source_title}`,
    '',
    `Closest sample: ${draft.match.sample_name} [${draft.match.sample_id}]`,
    `  score ${draft.match.score}, matched on: ${draft.match.matched_keywords.join(', ') || 'nothing'}${runner_up}`,
    '',
    'Draft scope',
    ...draft.in_scope.map((item) => `- ${item}`),
    'Out of scope',
    ...draft.out_of_scope.map((item) => `- ${item}`),
    '',
    `Timeline (${draft.total_weeks} weeks, relative to the agreed start)`,
    ...timeline_lines(draft),
    `Delivery date: ${delivery_line(draft)}`,
    `Budget: ${budget_line(draft)}`,
    '',
    `Questions still to ask (${draft.open_questions.length})`,
    ...question_lines(draft),
  ].join('\n');
}

export function render_scope_markdown(draft: ScopeDraft, review: Review): string {
  return [
    `# Scope: ${draft.client}`,
    '',
    `Reviewed and approved by ${review.reviewer} on ${review.reviewed_at}.${review.comment ? ` Comment: ${review.comment}` : ''}`,
    `Based on sample project: ${draft.match.sample_name}.`,
    '',
    '## Summary',
    draft.summary,
    '',
    '## In scope',
    ...draft.in_scope.map((item) => `- ${item}`),
    '',
    '## Out of scope',
    ...draft.out_of_scope.map((item) => `- ${item}`),
    '',
    `## Timeline (${draft.total_weeks} weeks)`,
    ...timeline_lines(draft),
    '',
    `**Delivery date:** ${delivery_line(draft)}`,
    '',
    `**Budget:** ${budget_line(draft)}`,
    '',
    '## Open questions',
    ...question_lines(draft),
    '',
  ].join('\n');
}
