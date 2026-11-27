// file: examples/scope-review/test/scope-review.test.ts
// description: Tests the full offline scope-review flow: notes -> closest sample -> draft -> human review -> export
// reference: examples/scope-review/src/, examples/scope-review/data/discovery-notes/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse_delivery_date, parse_budget_cents, parse_discovery_notes } from '../src/parse-notes';
import { build_scope_draft } from '../src/draft';
import { render_review_view } from '../src/render';
import { sample_projects } from '../src/sample-projects';
import {
  ReviewRequiredError,
  create_review_packet,
  export_scope,
  hash_draft,
  packet_from_json,
  packet_to_json,
  record_review,
} from '../src/review';

const EXAMPLE_DIR = join(import.meta.dirname, '..');
const NOTES_DIR = join(EXAMPLE_DIR, 'data', 'discovery-notes');
const FIXED_NOW = new Date('2026-11-27T12:00:00.000Z');

function load_notes(file: string): ReturnType<typeof parse_discovery_notes> {
  return parse_discovery_notes(readFileSync(join(NOTES_DIR, file), 'utf8'));
}

function draft_for(file: string): ReturnType<typeof build_scope_draft> {
  return build_scope_draft(load_notes(file), sample_projects);
}

function rejects_with(fn: () => unknown, reason: ReviewRequiredError['reason']): void {
  assert.throws(fn, (error: unknown) => error instanceof ReviewRequiredError && error.reason === reason);
}

test('ASAP notes match the vet voice receptionist sample', () => {
  const draft = draft_for('asap-vet-clinic.md');
  assert.equal(draft.match.sample_id, 'vet-voice-receptionist');
  assert.ok(draft.match.score > 0.5, `score ${draft.match.score}`);
  assert.ok(draft.match.matched_keywords.includes('after-hours'));
  assert.ok(draft.match.runner_up !== null && draft.match.runner_up.score < draft.match.score);
});

test('"ASAP" never becomes a delivery date: it stays a blocking open question', () => {
  const draft = draft_for('asap-vet-clinic.md');
  assert.deepEqual(draft.delivery, { status: 'open_question', raw_mention: 'ASAP' });
  const question = draft.open_questions.find((q) => q.id === 'delivery_date');
  assert.ok(question, 'delivery_date question missing');
  assert.equal(question.blocking, true);
  assert.match(question.why, /"ASAP", which is not a calendar date/);
  const view = render_review_view(draft);
  assert.match(view, /Delivery date: OPEN QUESTION, not agreed \(notes say "ASAP"\)/);
  assert.doesNotMatch(view, /\d{4}-\d{2}-\d{2}/, 'review view must not invent a calendar date');
});

test('timeline is relative weeks built from the sample phases', () => {
  const draft = draft_for('asap-vet-clinic.md');
  assert.deepEqual(draft.timeline.map((t) => [t.start_week, t.end_week]), [[1, 1], [2, 4], [5, 5], [6, 6]]);
  assert.equal(draft.total_weeks, 6);
});

test('notes with no delivery date at all also leave it open', () => {
  const draft = draft_for('no-date-mvp.md');
  assert.equal(draft.match.sample_id, 'stalled-mvp-rescue');
  assert.deepEqual(draft.delivery, { status: 'open_question', raw_mention: null });
  const ids = draft.open_questions.map((q) => q.id);
  assert.ok(ids.includes('delivery_date'));
  assert.ok(ids.includes('decision_maker'));
  assert.ok(ids.includes('success_criteria'));
});

test('a stated calendar date is used, with the latest start date worked back from it', () => {
  const draft = draft_for('dated-law-office.md');
  assert.equal(draft.match.sample_id, 'law-intake-portal');
  assert.deepEqual(draft.delivery, { status: 'stated', delivery_date: '2027-04-01', latest_start_date: '2027-02-11' });
  assert.ok(!draft.open_questions.some((q) => q.id === 'delivery_date'));
});

test('only explicit calendar dates parse; vague or impossible ones stay null', () => {
  for (const vague of ['ASAP', 'asap!', 'end of Q1', 'next month', 'before summer', 'March 2027', '2027-02-30', 'TBD']) {
    assert.equal(parse_delivery_date(vague), null, vague);
  }
  assert.equal(parse_delivery_date('2027-03-15'), '2027-03-15');
  assert.equal(parse_delivery_date('March 15, 2027'), '2027-03-15');
  assert.equal(parse_delivery_date(null), null);
});

test('budgets parse to bigint cents', () => {
  assert.equal(parse_budget_cents('$15,000'), 1_500_000n);
  assert.equal(parse_budget_cents('$12k'), 1_200_000n);
  assert.equal(parse_budget_cents('flexible'), null);
  assert.equal(load_notes('no-date-mvp.md').budget_cents, 1_200_000n);
});

test('export is blocked until a person approves the exact draft', () => {
  const packet = create_review_packet(draft_for('asap-vet-clinic.md'), FIXED_NOW);
  rejects_with(() => export_scope(packet), 'not_reviewed');

  const changes = record_review(packet, { reviewer: 'Alex (reviewer)', decision: 'changes_requested', acknowledged_open_questions: false }, FIXED_NOW);
  rejects_with(() => export_scope(changes), 'changes_requested');

  rejects_with(
    () => record_review(packet, { reviewer: 'Alex (reviewer)', decision: 'approved', acknowledged_open_questions: false }, FIXED_NOW),
    'open_questions_not_acknowledged',
  );

  const approved = record_review(packet, { reviewer: 'Alex (reviewer)', decision: 'approved', acknowledged_open_questions: true }, FIXED_NOW);
  const markdown = export_scope(approved);
  assert.match(markdown, /Reviewed and approved by Alex \(reviewer\) on 2026-11-27T12:00:00.000Z/);
  assert.match(markdown, /\*\*Delivery date:\*\* OPEN QUESTION, not agreed \(notes say "ASAP"\)/);
  assert.match(markdown, /\[blocking\] What exact date does this need to be live/);
});

test('editing the draft after approval voids the approval', () => {
  const packet = create_review_packet(draft_for('asap-vet-clinic.md'), FIXED_NOW);
  const approved = record_review(packet, { reviewer: 'Alex (reviewer)', decision: 'approved', acknowledged_open_questions: true }, FIXED_NOW);
  const edited = { ...approved, draft: { ...approved.draft, delivery: { status: 'stated' as const, delivery_date: '2027-01-15', latest_start_date: '2026-12-04' } } };
  rejects_with(() => export_scope(edited), 'draft_changed_after_review');
});

test('packet JSON round-trips with bigint amounts and the same hash', () => {
  const packet = create_review_packet(draft_for('dated-law-office.md'), FIXED_NOW);
  const restored = packet_from_json(packet_to_json(packet));
  assert.equal(restored.draft.budget_cents, 2_000_000n);
  assert.equal(hash_draft(restored.draft), packet.draft_hash);
});

test('all bundled notes are marked fictional', () => {
  for (const file of readdirSync(NOTES_DIR)) {
    assert.match(readFileSync(join(NOTES_DIR, file), 'utf8'), /\(fictional\)/, file);
  }
});

test('CLI flow: draft, export refused before approval, review, export', () => {
  const work = mkdtempSync(join(tmpdir(), 'scope-review-'));
  const packet = join(work, 'packet.json');
  const out = join(work, 'scope.md');
  const cli = (...args: string[]): ReturnType<typeof spawnSync> =>
    spawnSync(process.execPath, ['--import', 'tsx', join(EXAMPLE_DIR, 'src', 'cli.ts'), ...args], { encoding: 'utf8' });

  const drafted = cli('draft', join(NOTES_DIR, 'asap-vet-clinic.md'), '--packet', packet);
  assert.equal(drafted.status, 0, String(drafted.stderr));
  assert.match(String(drafted.stdout), /Closest sample: After-hours voice receptionist/);

  const early = cli('export', packet, '--out', out);
  assert.equal(early.status, 3);
  assert.match(String(early.stderr), /Export blocked: this draft has not been reviewed by a person yet\. \[not_reviewed\]/);
  assert.equal(existsSync(out), false);

  const reviewed = cli('review', packet, '--reviewer', 'Alex (reviewer)', '--approve', '--ack-open-questions');
  assert.equal(reviewed.status, 0, String(reviewed.stderr));

  const exported = cli('export', packet, '--out', out);
  assert.equal(exported.status, 0, String(exported.stderr));
  assert.match(readFileSync(out, 'utf8'), /OPEN QUESTION, not agreed/);

  // Hand-editing the saved packet after approval is caught too.
  const tampered = JSON.parse(readFileSync(packet, 'utf8')) as { draft: { in_scope: string[] } };
  tampered.draft.in_scope.push('Daytime call handling');
  writeFileSync(packet, JSON.stringify(tampered, null, 2));
  const after_edit = cli('export', packet, '--out', join(work, 'second.md'));
  assert.equal(after_edit.status, 3);
  assert.match(String(after_edit.stderr), /\[draft_changed_after_review\]/);
});
