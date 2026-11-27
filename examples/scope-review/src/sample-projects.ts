// file: examples/scope-review/src/sample-projects.ts
// description: Fictional TechTide sample projects used as scope references (no real clients, names or prices)
// reference: examples/scope-review/src/match.ts, examples/scope-review/src/schemas.ts

import { sample_project_schema, type SampleProject } from './schemas';

// Every project, client and figure below is invented for this example.
const raw_samples: SampleProject[] = [
  {
    id: 'vet-voice-receptionist',
    name: 'After-hours voice receptionist for a two-site vet clinic',
    industry: 'veterinary',
    summary: 'AI voice agent that answers after-hours calls, triages urgency, books appointments and logs call notes.',
    keywords: ['veterinary', 'vet', 'clinic', 'voice', 'phone', 'calls', 'receptionist', 'after-hours', 'appointments', 'booking', 'triage', 'calendar'],
    phases: [
      { name: 'Discovery and call-flow design', weeks: 1, deliverables: ['Call-flow map', 'Triage rules signed off by the clinic'] },
      { name: 'Voice agent build', weeks: 3, deliverables: ['Voice agent on a test number', 'Booking connected to the scheduling system'] },
      { name: 'Tested user journey', weeks: 1, deliverables: ['Scripted test calls with results', 'Escalation path to on-call vet verified'] },
      { name: 'Launch and handoff', weeks: 1, deliverables: ['Go-live on the main number', 'Handoff document and runbook'] },
    ],
    in_scope: ['After-hours call answering', 'Appointment booking', 'Urgent-case escalation to an on-call number', 'Call notes saved to the clinic system'],
    out_of_scope: ['Daytime call handling', 'Payments over the phone', 'Medical advice beyond scripted triage'],
    price_low_cents: 1_200_000n,
    price_high_cents: 1_800_000n,
    follow_up_questions: [
      { question: 'Which scheduling or practice-management system holds the appointment book?', answered_if_any: ['practice management', 'scheduling system', 'calendar'] },
      { question: 'Who is on call for urgent cases, and how should the agent reach them?', answered_if_any: ['on-call', 'on call', 'escalat'] },
    ],
  },
  {
    id: 'law-intake-portal',
    name: 'Client intake portal for a small law office',
    industry: 'legal',
    summary: 'Web intake form with conflict-check prep, document upload and a matter summary for the attorney.',
    keywords: ['law', 'legal', 'attorney', 'firm', 'intake', 'conflict', 'matter', 'portal', 'documents', 'upload', 'consultation', 'clients'],
    phases: [
      { name: 'Intake questions and data map', weeks: 1, deliverables: ['Intake question set per practice area', 'Field map to the case system'] },
      { name: 'Portal build', weeks: 3, deliverables: ['Intake portal on a staging site', 'Document upload with size and type limits'] },
      { name: 'Attorney summary and review', weeks: 2, deliverables: ['Matter summary draft for each intake', 'Attorney review queue'] },
      { name: 'Tested user journey and handoff', weeks: 1, deliverables: ['End-to-end intake test log', 'Handoff document'] },
    ],
    in_scope: ['Online intake form', 'Document upload', 'Conflict-check preparation list', 'Matter summary for attorney review'],
    out_of_scope: ['Legal advice to prospects', 'E-signature of engagement letters', 'Billing and trust accounting'],
    price_low_cents: 1_500_000n,
    price_high_cents: 2_400_000n,
    follow_up_questions: [
      { question: 'Which case or practice-management system should intakes land in?', answered_if_any: ['case management', 'practice management', 'clio-like', 'case system'] },
      { question: 'Which practice areas does the intake need to cover first?', answered_if_any: ['practice area', 'family law', 'estate', 'injury'] },
    ],
  },
  {
    id: 'cpa-month-end-close',
    name: 'Month-end close checklist automation for a CPA office',
    industry: 'accounting',
    summary: 'Automates client document requests, tracks close checklists and flags missing statements before month end.',
    keywords: ['cpa', 'accounting', 'accountant', 'bookkeeping', 'month-end', 'close', 'checklist', 'statements', 'reconciliation', 'tax', 'clients', 'reminders'],
    phases: [
      { name: 'Close process mapping', weeks: 1, deliverables: ['Current close checklist captured', 'Document request templates'] },
      { name: 'Automation build', weeks: 3, deliverables: ['Automated document requests and reminders', 'Close tracker per client'] },
      { name: 'Tested user journey and handoff', weeks: 1, deliverables: ['One full mock close run', 'Handoff document'] },
    ],
    in_scope: ['Client document requests and reminders', 'Per-client close checklist', 'Missing-statement flags'],
    out_of_scope: ['Preparing tax returns', 'Posting journal entries', 'Replacing the ledger software'],
    price_low_cents: 900_000n,
    price_high_cents: 1_400_000n,
    follow_up_questions: [
      { question: 'Which ledger or accounting software do the clients use?', answered_if_any: ['ledger', 'accounting software', 'general ledger'] },
      { question: 'How many clients go through the close each month?', answered_if_any: ['clients per month', 'clients each month', 'client count'] },
    ],
  },
  {
    id: 'realty-lead-follow-up',
    name: 'Listing lead follow-up assistant for a real estate team',
    industry: 'real estate',
    summary: 'Responds to new listing inquiries within minutes, qualifies buyers and books showings for agents.',
    keywords: ['real estate', 'realtor', 'listing', 'listings', 'leads', 'buyers', 'showings', 'agents', 'crm', 'follow-up', 'sms', 'inquiries'],
    phases: [
      { name: 'Lead flow design', weeks: 1, deliverables: ['Lead sources and qualification rules', 'Message templates approved'] },
      { name: 'Assistant build', weeks: 2, deliverables: ['Auto-reply and qualification flow', 'Showing booking into agent calendars'] },
      { name: 'Tested user journey and handoff', weeks: 1, deliverables: ['Test leads run end to end', 'Handoff document'] },
    ],
    in_scope: ['Instant replies to new inquiries', 'Buyer qualification questions', 'Showing booking', 'Lead notes saved to the CRM'],
    out_of_scope: ['Paid ad management', 'Listing photography or copy', 'Contract and offer handling'],
    price_low_cents: 800_000n,
    price_high_cents: 1_300_000n,
    follow_up_questions: [
      { question: 'Which CRM holds the team\'s leads today?', answered_if_any: ['crm'] },
      { question: 'Which lead sources should the assistant answer first?', answered_if_any: ['lead source', 'portal leads', 'website form'] },
    ],
  },
  {
    id: 'stalled-mvp-rescue',
    name: 'Stalled MVP rescue: stabilise, test and hand off',
    industry: 'software',
    summary: 'Takes over a half-built product, fixes the blocking defects, tests the agreed user journey and documents the handoff.',
    keywords: ['mvp', 'stalled', 'rescue', 'prototype', 'founder', 'launch', 'pilot', 'bugs', 'handoff', 'codebase', 'app', 'deploy'],
    phases: [
      { name: 'Codebase audit', weeks: 1, deliverables: ['Audit of blockers and risks', 'Agreed user journey to test'] },
      { name: 'Stabilise and fix blockers', weeks: 3, deliverables: ['Blocking defects fixed', 'Deploy pipeline working'] },
      { name: 'Tested user journey', weeks: 1, deliverables: ['Journey test results', 'Known-issues list'] },
      { name: 'Handoff', weeks: 1, deliverables: ['Handoff document and walkthrough'] },
    ],
    in_scope: ['Codebase audit', 'Fixing launch-blocking defects', 'Deploy pipeline', 'Tested user journey and handoff'],
    out_of_scope: ['New features beyond the agreed journey', 'Long-term hosting and support', 'Brand or visual redesign'],
    price_low_cents: 1_000_000n,
    price_high_cents: 2_000_000n,
    follow_up_questions: [
      { question: 'Can we get repository and hosting access before the audit starts?', answered_if_any: ['repo access', 'repository access', 'github access'] },
      { question: 'Which single user journey must work for the pilot?', answered_if_any: ['user journey', 'core flow', 'happy path'] },
    ],
  },
];

export const sample_projects: readonly SampleProject[] = raw_samples.map((sample) => sample_project_schema.parse(sample));
