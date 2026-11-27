// file: examples/scope-review/src/draft.ts
// description: Builds a draft scope, week-by-week timeline and open-questions list from discovery notes and the closest sample
// reference: examples/scope-review/src/match.ts, examples/scope-review/src/parse-notes.ts, examples/scope-review/src/schemas.ts

import { find_closest_sample, notes_text } from './match';
import {
  scope_draft_schema,
  type Delivery,
  type DiscoveryNotes,
  type OpenQuestion,
  type SampleProject,
  type ScopeDraft,
  type TimelineEntry,
} from './schemas';

/** Below this score the notes look like no sample, and the draft says so. */
export const WEAK_MATCH_SCORE = 0.25;

export function build_timeline(sample: SampleProject): TimelineEntry[] {
  let next_week = 1;
  return sample.phases.map((phase) => {
    const entry = { phase: phase.name, start_week: next_week, end_week: next_week + phase.weeks - 1, deliverables: [...phase.deliverables] };
    next_week += phase.weeks;
    return entry;
  });
}

function subtract_weeks(iso_date: string, weeks: number): string {
  const date = new Date(`${iso_date}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - weeks * 7);
  return date.toISOString().slice(0, 10);
}

export function resolve_delivery(notes: DiscoveryNotes, total_weeks: number): Delivery {
  if (notes.delivery_date === null) {
    return { status: 'open_question', raw_mention: notes.delivery_date_raw };
  }
  return { status: 'stated', delivery_date: notes.delivery_date, latest_start_date: subtract_weeks(notes.delivery_date, total_weeks) };
}

function delivery_question(notes: DiscoveryNotes): OpenQuestion {
  const why = notes.delivery_date_raw === null
    ? 'The notes give no delivery date. The timeline is in relative weeks until one is agreed.'
    : `The notes say "${notes.delivery_date_raw}", which is not a calendar date. The timeline is in relative weeks until one is agreed.`;
  return { id: 'delivery_date', question: 'What exact date does this need to be live, and what happens if it slips?', why, blocking: true };
}

function money(cents: bigint): string {
  const dollars = cents / 100n;
  return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function collect_open_questions(notes: DiscoveryNotes, sample: SampleProject, match_score: number): OpenQuestion[] {
  const questions: OpenQuestion[] = [];
  if (notes.delivery_date === null) questions.push(delivery_question(notes));

  if (notes.budget_cents === null) {
    questions.push({
      id: 'budget',
      question: 'What budget range is approved for this project?',
      why: notes.budget_raw === null ? 'No budget in the notes.' : `The notes say "${notes.budget_raw}", which is not a single amount.`,
      blocking: true,
    });
  } else if (notes.budget_cents < sample.price_low_cents) {
    questions.push({
      id: 'budget_below_reference',
      question: 'The budget is below the closest sample\'s range. Which in-scope items can move to a later phase?',
      why: `Budget ${money(notes.budget_cents)} vs reference ${money(sample.price_low_cents)} to ${money(sample.price_high_cents)}.`,
      blocking: false,
    });
  }

  if (notes.decision_maker === null) {
    questions.push({ id: 'decision_maker', question: 'Who signs off on the scope and the final handoff?', why: 'No decision maker in the notes.', blocking: true });
  }
  if (notes.success_criteria === null) {
    questions.push({ id: 'success_criteria', question: 'What result would make this a success 30 days after launch?', why: 'No success criteria in the notes.', blocking: false });
  }
  if (notes.users === null) {
    questions.push({ id: 'users', question: 'Who will use this day to day, and how many people?', why: 'No users in the notes.', blocking: false });
  }

  const text = notes_text(notes);
  sample.follow_up_questions.forEach((follow_up, index) => {
    const answered = follow_up.answered_if_any.some((word) => text.includes(word.toLowerCase()));
    if (!answered) {
      questions.push({ id: `sample_${index + 1}`, question: follow_up.question, why: `Needed for "${sample.name}" and not covered in the notes.`, blocking: false });
    }
  });

  if (match_score < WEAK_MATCH_SCORE) {
    questions.push({
      id: 'project_type',
      question: 'The notes match no sample project closely. What kind of build is this?',
      why: `Best match scored ${match_score}, under ${WEAK_MATCH_SCORE}.`,
      blocking: true,
    });
  }
  return questions;
}

export function build_scope_draft(notes: DiscoveryNotes, samples: readonly SampleProject[]): ScopeDraft {
  const match = find_closest_sample(notes, samples);
  const sample = samples.find((candidate) => candidate.id === match.sample_id);
  if (sample === undefined) throw new Error(`Matched sample ${match.sample_id} is missing`);

  const timeline = build_timeline(sample);
  const total_weeks = timeline[timeline.length - 1].end_week;

  return scope_draft_schema.parse({
    client: notes.client ?? 'Unnamed client',
    source_title: notes.title,
    match,
    summary: sample.summary,
    in_scope: [...sample.in_scope],
    out_of_scope: [...sample.out_of_scope],
    timeline,
    total_weeks,
    delivery: resolve_delivery(notes, total_weeks),
    budget_cents: notes.budget_cents,
    reference_price_low_cents: sample.price_low_cents,
    reference_price_high_cents: sample.price_high_cents,
    open_questions: collect_open_questions(notes, sample, match.score),
  });
}

export { money };
