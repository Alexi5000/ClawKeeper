// file: examples/scope-review/src/match.ts
// description: Picks the closest fictional sample project for a set of discovery notes, with the keywords that explain the pick
// reference: examples/scope-review/src/sample-projects.ts, examples/scope-review/src/schemas.ts

import { match_result_schema, type DiscoveryNotes, type MatchResult, type SampleProject } from './schemas';

export function notes_text(notes: DiscoveryNotes): string {
  return [notes.title, notes.industry ?? '', notes.users ?? '', notes.integrations.join(' '), notes.success_criteria ?? '', notes.body]
    .join('\n')
    .toLowerCase();
}

function mentions(text: string, keyword: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

interface Scored { sample: SampleProject; score: number; matched: string[] }

function score_sample(text: string, notes: DiscoveryNotes, sample: SampleProject): Scored {
  const matched = sample.keywords.filter((keyword) => mentions(text, keyword));
  const industry_bonus = notes.industry !== null && notes.industry.toLowerCase().includes(sample.industry) ? 0.2 : 0;
  const score = Math.min(1, matched.length / sample.keywords.length + industry_bonus);
  return { sample, score: Math.round(score * 1000) / 1000, matched };
}

/** Deterministic: highest score wins, ties go to the sample id that sorts first. */
export function find_closest_sample(notes: DiscoveryNotes, samples: readonly SampleProject[]): MatchResult {
  if (samples.length === 0) throw new Error('No sample projects to match against');
  const text = notes_text(notes);
  const ranked = samples
    .map((sample) => score_sample(text, notes, sample))
    .sort((a, b) => b.score - a.score || a.sample.id.localeCompare(b.sample.id));
  const [best, second] = ranked;
  return match_result_schema.parse({
    sample_id: best.sample.id,
    sample_name: best.sample.name,
    score: best.score,
    matched_keywords: best.matched,
    runner_up: second ? { sample_id: second.sample.id, score: second.score } : null,
  });
}
