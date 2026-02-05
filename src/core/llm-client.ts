// file: src/core/llm-client.ts
// description: LLM client for ClawKeeper agent system with DeepSeek support
// reference: src/core/types.ts, src/core/observability.ts

import OpenAI from 'openai';
import { get_opik_client } from './observability';

// DeepSeek client using OpenAI-compatible API
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
});

// ============================================================================
// Types
// ============================================================================

interface CompletionOptions {
  system?: string;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

interface InvoiceParseResult {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number; // cents
  currency: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  confidence: number;
}

// ============================================================================
// Core LLM Functions
// ============================================================================

export async function complete(
  prompt: string,
  options: CompletionOptions = {}
): Promise<string> {
  const {
    system = 'You are a helpful AI assistant.',
    temperature = 0.7,
    max_tokens = 4096,
    model = 'deepseek-chat', // Default to DeepSeek Chat
  } = options;

  const start_time = Date.now();
  const opik = get_opik_client();
  
  // Create Opik trace for this LLM call
  const trace = opik?.trace({
    name: 'llm_completion',
    input: { prompt, system, model },
    metadata: { temperature, max_tokens },
    tags: ['llm', 'deepseek', model],
  });

  try {
    const completion = await deepseek.chat.completions.create({
      model,
      max_tokens,
      temperature,
      messages: [
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response_text = completion.choices[0]?.message?.content || '';
    const latency_ms = Date.now() - start_time;

    // Log usage metrics to Opik
    if (trace) {
      trace.end();
    }

    return response_text;
  } catch (error) {
    // Log error to Opik
    if (trace) {
      trace.end();
    }
    throw error;
  }
}

// ============================================================================
// Specialized LLM Functions
// ============================================================================

export async function parse_invoice(ocr_text: string): Promise<InvoiceParseResult> {
  const prompt = `Extract invoice data from this OCR text:

${ocr_text}

Return JSON with these fields:
{
  "vendor_name": "Company Name",
  "invoice_number": "INV-123",
  "invoice_date": "2026-01-15",
  "due_date": "2026-02-15",
  "amount": 50000,  // total in cents
  "currency": "USD",
  "line_items": [
    {
      "description": "Item description",
      "quantity": 10,
      "unit_price": 1500,  // cents
      "amount": 15000  // cents
    }
  ],
  "confidence": 0.95
}

If a field is unclear, set confidence < 0.8.`;

  const response = await complete(prompt, {
    system: 'You are an expert invoice data extractor. Return only valid JSON.',
    temperature: 0,
    model: 'deepseek-chat',
  });

  // Parse JSON from response
  const json_match = response.match(/\{[\s\S]*\}/);
  if (!json_match) {
    throw new Error('Failed to extract JSON from LLM response');
  }

  return JSON.parse(json_match[0]);
}

export async function categorize_expense(description: string): Promise<string> {
  const prompt = `Categorize this expense:

Description: "${description}"

Return ONE of these categories:
- Office Supplies
- Software & Subscriptions
- Cloud Services
- Marketing & Advertising
- Travel & Entertainment
- Equipment & Furniture
- Professional Services
- Utilities
- Rent & Facilities
- Insurance
- Payroll & Benefits
- Taxes & Licenses
- Uncategorized

Return only the category name, nothing else.`;

  const response = await complete(prompt, {
    system: 'You are an expense categorization expert.',
    temperature: 0,
    max_tokens: 50,
  });

  return response.trim();
}

export async function detect_duplicate_invoice(
  new_invoice: { vendor_name: string; invoice_number: string; amount: number; date: string },
  existing_invoices: Array<{ id: string; vendor_name: string; invoice_number: string; amount: number; date: string }>
): Promise<{ is_duplicate: boolean; match_id: string | null; confidence: number }> {
  // Exact match
  const exact = existing_invoices.find(
    inv => inv.vendor_name === new_invoice.vendor_name && inv.invoice_number === new_invoice.invoice_number
  );
  if (exact) {
    return { is_duplicate: true, match_id: exact.id, confidence: 1.0 };
  }

  // Fuzzy match via LLM
  const prompt = `Is this a duplicate invoice?

New Invoice:
- Vendor: ${new_invoice.vendor_name}
- Invoice #: ${new_invoice.invoice_number}
- Amount: $${new_invoice.amount / 100}
- Date: ${new_invoice.date}

Existing Invoices:
${existing_invoices.slice(0, 10).map((inv, i) => `
${i + 1}. Vendor: ${inv.vendor_name}, Invoice #: ${inv.invoice_number}, Amount: $${inv.amount / 100}, Date: ${inv.date}
`).join('')}

Return JSON:
{
  "is_duplicate": true/false,
  "match_id": "uuid or null",
  "confidence": 0.0-1.0,
  "reason": "explanation"
}`;

  const response = await complete(prompt, {
    system: 'You are an invoice duplicate detection expert.',
    temperature: 0,
  });

  const json_match = response.match(/\{[\s\S]*\}/);
  if (!json_match) {
    return { is_duplicate: false, match_id: null, confidence: 0 };
  }

  return JSON.parse(json_match[0]);
}

export async function generate_financial_report_analysis(
  report_type: string,
  data: Record<string, unknown>
): Promise<string> {
  const prompt = `Analyze this ${report_type} report and provide insights:

${JSON.stringify(data, null, 2)}

Provide:
1. Key takeaways (3-5 bullet points)
2. Areas of concern (if any)
3. Recommendations for improvement
4. Trends compared to typical businesses in this industry

Be concise and actionable.`;

  return await complete(prompt, {
    system: 'You are a CFO providing financial analysis.',
    temperature: 0.5,
    model: 'deepseek-reasoner', // Use reasoner for complex analysis
  });
}

export async function decompose_financial_task(request: string): Promise<Array<{
  name: string;
  description: string;
  required_capabilities: string[];
  dependencies: string[];
}>> {
  const prompt = `Decompose this financial request into atomic tasks.

Request: "${request}"

Available capabilities:
- invoice_parsing, invoice_validation, payment_processing
- transaction_matching, discrepancy_detection
- report_generation, data_aggregation
- bank_sync, accounting_sync
- tax_compliance_check, audit_preparation
- data_import, data_transformation

Return ONLY a valid JSON array, nothing else. Format:
[
  {
    "name": "Task name",
    "description": "What to do",
    "required_capabilities": ["capability1", "capability2"],
    "dependencies": []
  }
]

IMPORTANT: Return only the JSON array, no markdown, no explanation, no code blocks.`;

  const response = await complete(prompt, {
    system: 'You are an expert at decomposing financial workflows. Return ONLY valid JSON arrays, nothing else.',
    temperature: 0.1,
    model: 'deepseek-chat', // Use chat for faster, more reliable JSON
    max_tokens: 2000,
  });

  console.log('[LLM] Raw response:', response.substring(0, 200));

  // Try to extract JSON from response (handle markdown code blocks)
  let json_text = response.trim();
  
  // Remove markdown code blocks if present
  json_text = json_text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find JSON array
  const json_match = json_text.match(/\[[\s\S]*\]/);
  if (!json_match) {
    console.error('[LLM] Failed to find JSON in response:', response);
    // Return a simple fallback task
    return [{
      name: "Execute Request",
      description: request,
      required_capabilities: ["report_generation"],
      dependencies: []
    }];
  }

  try {
    return JSON.parse(json_match[0]);
  } catch (error) {
    console.error('[LLM] Failed to parse JSON:', json_match[0]);
    // Return fallback
    return [{
      name: "Execute Request",
      description: request,
      required_capabilities: ["report_generation"],
      dependencies: []
    }];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function estimate_tokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function calculate_cost(tokens: number, model: string): number {
  // Approximate costs per million tokens (as of 2026)
  const costs: Record<string, { input: number; output: number }> = {
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
    'claude-opus-4-20250514': { input: 15, output: 75 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'gemini-2.0-pro': { input: 1.25, output: 5 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  };

  const cost_per_million = costs[model] || costs['deepseek-chat'];
  return (tokens / 1_000_000) * cost_per_million.input; // Simplified
}
