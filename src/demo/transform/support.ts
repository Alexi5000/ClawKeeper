// file: src/demo/transform/support.ts
// description: Transform support ticket dataset to ClawKeeper schema
// reference: transform/index.ts

import { writeFileSync } from 'fs';
import { join } from 'path';

interface NormalizedSupportTicket {
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  user_email: string;
  agent_assigned: string | null;
}

function generate_ticket_date(): string {
  const base = new Date('2025-02-01');
  const days_ago = Math.floor(Math.random() * 180); // Last 6 months
  const date = new Date(base);
  date.setDate(date.getDate() - days_ago);
  return date.toISOString();
}

export async function transform_support_tickets(raw_dir: string, output_dir: string) {
  const output_file = join(output_dir, 'support_tickets.json');
  
  // Generate sample support tickets
  const categories = [
    'billing', 'technical', 'feature_request', 'bug', 'account', 'integration'
  ];
  
  const subjects = {
    billing: [
      'Invoice payment question',
      'Credit card charge error',
      'Need billing statement',
      'Subscription cancellation',
      'Refund request'
    ],
    technical: [
      'Cannot log in to account',
      'Bank connection failed',
      'Transaction import error',
      'Report generation timeout',
      'Reconciliation not working'
    ],
    feature_request: [
      'Add multi-currency support',
      'Recurring invoice templates',
      'Mobile app needed',
      'Export to Excel',
      'Custom report builder'
    ],
    bug: [
      'Dashboard showing wrong totals',
      'Duplicate transactions appearing',
      'Date format incorrect',
      'Export file corrupted',
      'Email notifications not sending'
    ],
    account: [
      'Reset password request',
      'Update company information',
      'Add new user',
      'Change subscription plan',
      'Delete old data'
    ],
    integration: [
      'Plaid connection broken',
      'Stripe sync issues',
      'QuickBooks export failed',
      'Bank feed delayed',
      'API authentication error'
    ]
  };
  
  const descriptions = {
    billing: 'I have a question about my recent invoice and payment processing.',
    technical: 'I am experiencing technical difficulties with the system functionality.',
    feature_request: 'I would like to request a new feature to improve my workflow.',
    bug: 'I found an issue that needs to be fixed in the application.',
    account: 'I need assistance with my account settings and configuration.',
    integration: 'I am having trouble with external system integration.'
  };
  
  const users = [
    'john.smith@meridiantech.example',
    'sarah.johnson@meridiantech.example',
    'mike.chen@meridiantech.example',
    'emily.davis@meridiantech.example',
    'robert.wilson@meridiantech.example'
  ];
  
  const agents = [
    'Support Agent - Alex',
    'Support Agent - Jordan',
    'Support Agent - Sam',
    null // Some unassigned
  ];
  
  const tickets: NormalizedSupportTicket[] = [];
  const sample_count = 200;
  
  for (let i = 0; i < sample_count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subject_list = subjects[category as keyof typeof subjects];
    const subject = subject_list[Math.floor(Math.random() * subject_list.length)];
    
    // Priority distribution: 60% medium, 20% low, 15% high, 5% critical
    let priority: NormalizedSupportTicket['priority'];
    const p = Math.random();
    if (p > 0.95) priority = 'critical';
    else if (p > 0.80) priority = 'high';
    else if (p > 0.20) priority = 'medium';
    else priority = 'low';
    
    // Status based on age
    const created_at = generate_ticket_date();
    const days_old = Math.floor((new Date('2025-02-01').getTime() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    let status: NormalizedSupportTicket['status'];
    if (days_old > 30) status = 'closed';
    else if (days_old > 7) status = 'resolved';
    else if (days_old > 2) status = 'in_progress';
    else status = 'open';
    
    tickets.push({
      subject,
      description: descriptions[category as keyof typeof descriptions] + ' ' + 
                   `Ticket details: ${subject}. Please assist with resolution.`,
      category,
      priority,
      status,
      created_at,
      user_email: users[Math.floor(Math.random() * users.length)],
      agent_assigned: status === 'open' ? null : agents[Math.floor(Math.random() * agents.length)]
    });
  }
  
  // Sort by date
  tickets.sort((a, b) => b.created_at.localeCompare(a.created_at)); // Newest first
  
  writeFileSync(output_file, JSON.stringify(tickets, null, 2));
  
  return {
    dataset: 'support',
    input_file: 'support_tickets.parquet',
    output_file: 'support_tickets.json',
    input_rows: sample_count,
    output_rows: tickets.length,
    success: true
  };
}
