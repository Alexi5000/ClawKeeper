// file: examples/scope-review/src/parse-notes.ts
// description: Parses synthetic discovery notes (key: value header plus free text) into typed DiscoveryNotes
// reference: examples/scope-review/data/discovery-notes/, examples/scope-review/src/schemas.ts

import { discovery_notes_schema, type DiscoveryNotes } from './schemas';

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const HEADER_KEYS = new Set([
  'client', 'industry', 'contact', 'decision maker', 'budget', 'delivery date', 'deadline',
  'users', 'integrations', 'success criteria',
]);

/** Values that mean "nobody said" and must never be read as an answer. */
const EMPTY_VALUES = new Set(['', 'tbd', 'unknown', 'n/a', 'na', 'none', '?', '-']);

function clean_value(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return EMPTY_VALUES.has(trimmed.toLowerCase()) ? null : trimmed;
}

function is_real_date(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function to_iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns an ISO date only for an explicit calendar date ("2027-03-15" or "March 15, 2027").
 * Vague wording ("ASAP", "end of Q1", "next month", "before summer") returns null on purpose:
 * a delivery date nobody agreed to must stay an open question, never a guess.
 */
export function parse_delivery_date(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return is_real_date(year, month, day) ? to_iso(year, month, day) : null;
  }
  const long = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(value);
  if (long) {
    const month = MONTHS[long[1].toLowerCase()];
    const [day, year] = [Number(long[2]), Number(long[3])];
    if (month !== undefined && is_real_date(year, month, day)) return to_iso(year, month, day);
  }
  return null;
}

/** "$18,000", "18000 USD", "$18k" -> cents. Ranges or words ("flexible") return null. */
export function parse_budget_cents(raw: string | null): bigint | null {
  if (raw === null) return null;
  const match = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(k)?\s*(?:usd)?$/i.exec(raw.trim());
  if (!match) return null;
  const dollars = BigInt(match[1].replace(/,/g, '')) * (match[2] ? 1000n : 1n);
  return dollars * 100n;
}

export function parse_discovery_notes(text: string): DiscoveryNotes {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const title_line = lines.find((line) => line.startsWith('# '));
  const fields: Record<string, string> = {};
  const body_lines: string[] = [];

  for (const line of lines) {
    if (line === title_line) continue;
    const header = /^([A-Za-z ]+):\s*(.*)$/.exec(line);
    const key = header?.[1].trim().toLowerCase();
    if (header && key !== undefined && HEADER_KEYS.has(key)) {
      fields[key] = header[2];
    } else {
      body_lines.push(line);
    }
  }

  const delivery_raw = clean_value(fields['delivery date'] ?? fields['deadline']);
  const budget_raw = clean_value(fields['budget']);
  const integrations_raw = clean_value(fields['integrations']);

  return discovery_notes_schema.parse({
    title: title_line ? title_line.slice(2).trim() : 'Untitled discovery notes',
    client: clean_value(fields['client']),
    industry: clean_value(fields['industry']),
    contact: clean_value(fields['contact']),
    decision_maker: clean_value(fields['decision maker']),
    budget_cents: parse_budget_cents(budget_raw),
    budget_raw,
    delivery_date: parse_delivery_date(delivery_raw),
    delivery_date_raw: delivery_raw,
    users: clean_value(fields['users']),
    integrations: integrations_raw ? integrations_raw.split(',').map((item) => item.trim()).filter(Boolean) : [],
    success_criteria: clean_value(fields['success criteria']),
    body: body_lines.join('\n').trim(),
  });
}
