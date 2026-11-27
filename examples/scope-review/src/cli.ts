// file: examples/scope-review/src/cli.ts
// description: Offline CLI for the scope-review flow: draft from notes, record a human review, export only after approval
// reference: examples/scope-review/README.md, examples/scope-review/src/review.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { parse_discovery_notes } from './parse-notes';
import { build_scope_draft } from './draft';
import { render_review_view } from './render';
import { sample_projects } from './sample-projects';
import { ReviewRequiredError, create_review_packet, export_scope, packet_from_json, packet_to_json, record_review } from './review';

const USAGE = [
  'Usage (from the repo root):',
  '  npx tsx examples/scope-review/src/cli.ts draft <notes.md> --packet <packet.json>',
  '  npx tsx examples/scope-review/src/cli.ts review <packet.json> --reviewer "<name>" (--approve | --request-changes) [--ack-open-questions] [--comment "<text>"]',
  '  npx tsx examples/scope-review/src/cli.ts export <packet.json> --out <scope.md>',
].join('\n');

function flag_value(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function required(value: string | undefined, label: string): string {
  if (value === undefined || value.startsWith('--')) throw new Error(`Missing ${label}.\n${USAGE}`);
  return value;
}

function run_draft(args: string[]): void {
  const notes_path = required(args[0], '<notes.md>');
  const packet_path = required(flag_value(args, '--packet'), '--packet <packet.json>');
  const draft = build_scope_draft(parse_discovery_notes(readFileSync(notes_path, 'utf8')), sample_projects);
  writeFileSync(packet_path, packet_to_json(create_review_packet(draft)));
  console.log(render_review_view(draft));
  console.log(`\nSaved for review: ${packet_path}. Nothing can be exported until a person approves it.`);
}

function run_review(args: string[]): void {
  const packet_path = required(args[0], '<packet.json>');
  const reviewer = required(flag_value(args, '--reviewer'), '--reviewer "<name>"');
  const approve = args.includes('--approve');
  if (approve === args.includes('--request-changes')) throw new Error(`Pass exactly one of --approve or --request-changes.\n${USAGE}`);
  const packet = packet_from_json(readFileSync(packet_path, 'utf8'));
  const reviewed = record_review(packet, {
    reviewer,
    decision: approve ? 'approved' : 'changes_requested',
    acknowledged_open_questions: args.includes('--ack-open-questions'),
    comment: flag_value(args, '--comment'),
  });
  writeFileSync(packet_path, packet_to_json(reviewed));
  console.log(`Review saved: ${reviewed.review?.decision} by ${reviewer}.`);
}

function run_export(args: string[]): void {
  const packet_path = required(args[0], '<packet.json>');
  const out_path = required(flag_value(args, '--out'), '--out <scope.md>');
  const markdown = export_scope(packet_from_json(readFileSync(packet_path, 'utf8')));
  writeFileSync(out_path, markdown);
  console.log(`Exported approved scope to ${out_path}.`);
}

function main(argv: string[]): number {
  const [command, ...args] = argv;
  try {
    if (command === 'draft') run_draft(args);
    else if (command === 'review') run_review(args);
    else if (command === 'export') run_export(args);
    else {
      console.log(USAGE);
      return command === undefined || command === '--help' ? 0 : 2;
    }
    return 0;
  } catch (error) {
    if (error instanceof ReviewRequiredError) {
      console.error(`${error.message} [${error.reason}]`);
      return 3;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
