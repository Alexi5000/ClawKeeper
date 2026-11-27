# TechTide scope review (example)

A small, offline tool that turns discovery-call notes into a reviewable scope draft. It is an isolated example: nothing in `src/`, the API, the dashboard or the root test suite imports it.

Every client, person, project and price in this folder is fictional.

## What it does

1. **Reads discovery notes** (`data/discovery-notes/*.md`): a few `Key: value` lines plus free text.
2. **Finds the closest sample project** from five fictional TechTide samples (`src/sample-projects.ts`), by keyword overlap, and shows the keywords behind the pick and the runner-up.
3. **Drafts a scope and timeline**: in scope, out of scope, phases in relative weeks, budget against the sample's reference range.
4. **Lists the questions you still need to ask**: missing budget, decision maker, users, success criteria, the sample's own follow-ups, and a weak match.
5. **Requires a human review before export.** The draft is saved as a review packet with a SHA-256 hash. Export refuses unless a named reviewer approved that exact draft and acknowledged its open questions. Editing the draft after approval voids the approval.

### Delivery dates are never guessed

Only an explicit calendar date (`2027-04-01` or `April 1, 2027`) counts. "ASAP", "end of Q1", "next month", "TBD" or no mention at all leave the delivery date as a **blocking open question**. The timeline stays in relative weeks and the export says `OPEN QUESTION, not agreed`.

## Run it (from the repo root, no keys, no network)

```bash
# 1. Draft: prints the review view and saves a packet
npx tsx examples/scope-review/src/cli.ts draft examples/scope-review/data/discovery-notes/asap-vet-clinic.md --packet /tmp/packet.json

# 2. Export before review: refused, exit code 3
npx tsx examples/scope-review/src/cli.ts export /tmp/packet.json --out /tmp/scope.md

# 3. A person reviews it (approval needs open questions acknowledged)
npx tsx examples/scope-review/src/cli.ts review /tmp/packet.json --reviewer "Your Name" --approve --ack-open-questions

# 4. Export: writes the approved scope as markdown
npx tsx examples/scope-review/src/cli.ts export /tmp/packet.json --out /tmp/scope.md
```

`--request-changes` records a rejection instead; export stays blocked.

## Test it

```bash
node --test --import tsx examples/scope-review/test/*.test.ts
npx tsc -p examples/scope-review/tsconfig.json
```

The tests cover the full flow: matching, the ASAP and missing-date cases, a stated date, the review gate (no review, changes requested, unacknowledged questions, edits after approval), the packet file round-trip, and the CLI end to end.

## Files

| Path | Role |
| --- | --- |
| `src/schemas.ts` | Zod schemas for notes, samples, drafts and review packets |
| `src/parse-notes.ts` | Notes parser; strict date and budget parsing |
| `src/sample-projects.ts` | Fictional sample projects |
| `src/match.ts` | Closest-sample matcher |
| `src/draft.ts` | Scope, timeline and open questions |
| `src/review.ts` | Review packet, approval and the export gate |
| `src/render.ts` | Review view and markdown export |
| `src/cli.ts` | `draft`, `review`, `export` commands |

Money is stored as `bigint` cents, as in the rest of ClawKeeper.
