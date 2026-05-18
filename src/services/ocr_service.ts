// file: src/services/ocr_service.ts
// description: Invoice OCR extraction service using OpenAI Vision API
// reference: src/api/routes/invoices.ts, OpenAI GPT-4o vision

import OpenAI from 'openai';

export interface ExtractedInvoice {
  vendor_name: string;
  invoice_number: string;
  date: string;
  due_date: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  confidence: number;
}

export interface IOcrService {
  extract_invoice_data(image_buffer: Buffer, mime_type: string): Promise<ExtractedInvoice>;
}

export class OpenAIOcrService implements IOcrService {
  private client: OpenAI;

  constructor(api_key?: string) {
    this.client = new OpenAI({
      apiKey: api_key || process.env.OPENAI_API_KEY || 'dummy-key-for-testing',
    });
  }

  async extract_invoice_data(image_buffer: Buffer, mime_type: string): Promise<ExtractedInvoice> {
    // Validate mime type
    const supported_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!supported_types.includes(mime_type)) {
      throw new Error(`Unsupported file type: ${mime_type}. Supported: ${supported_types.join(', ')}`);
    }

    // Convert buffer to base64 data URL
    const base64_image = `data:${mime_type};base64,${image_buffer.toString('base64')}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert invoice OCR system. Extract structured data from invoice images with high accuracy. 
Always return valid JSON matching the schema. If any field is unclear, use best estimates and lower the confidence score.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all invoice data from this image. Return JSON with this exact structure:
{
  "vendor_name": "string",
  "invoice_number": "string",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number (in cents),
      "total": number (in cents)
    }
  ],
  "subtotal": number (in cents),
  "tax": number (in cents),
  "total": number (in cents),
  "currency": "USD" | "CAD" | etc,
  "confidence": number (0.0 to 1.0)
}

Important: Convert all monetary amounts to cents (multiply dollars by 100). Be precise with line items.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64_image,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistency
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI Vision API');
      }

      const extracted = JSON.parse(content) as ExtractedInvoice;

      // Validate required fields
      this.validate_extracted_invoice(extracted);

      console.log(`[OCR] Extracted invoice: ${extracted.vendor_name}, ${extracted.invoice_number}, $${extracted.total / 100}, confidence: ${extracted.confidence}`);

      return extracted;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error('[OCR] OpenAI API error:', error.message, error.status);
        throw new Error(`OCR failed: ${error.message}`);
      }
      throw error;
    }
  }

  private validate_extracted_invoice(invoice: ExtractedInvoice): void {
    const required_fields = [
      'vendor_name',
      'invoice_number',
      'date',
      'total',
      'currency',
      'confidence',
    ];

    for (const field of required_fields) {
      if (!(field in invoice) || invoice[field as keyof ExtractedInvoice] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate confidence score
    if (invoice.confidence < 0 || invoice.confidence > 1) {
      throw new Error(`Invalid confidence score: ${invoice.confidence}`);
    }

    // Validate line items structure
    if (!Array.isArray(invoice.line_items)) {
      throw new Error('line_items must be an array');
    }

    for (const item of invoice.line_items) {
      if (!item.description || typeof item.quantity !== 'number' || typeof item.unit_price !== 'number') {
        throw new Error('Invalid line item structure');
      }
    }

    // Validate monetary values are in cents (positive integers)
    const monetary_fields = ['subtotal', 'tax', 'total'];
    for (const field of monetary_fields) {
      const value = invoice[field as keyof ExtractedInvoice] as number;
      if (typeof value !== 'number' || value < 0) {
        throw new Error(`Invalid ${field}: must be a non-negative number`);
      }
    }

    // Validate line items sum matches subtotal and total
    if (invoice.line_items.length > 0) {
      const computed_subtotal = invoice.line_items.reduce((sum, item) => sum + item.total, 0);
      if (computed_subtotal !== invoice.subtotal) {
        throw new Error(`Line items subtotal mismatch: items sum to ${computed_subtotal} cents, but subtotal is ${invoice.subtotal} cents`);
      }

      const computed_total = computed_subtotal + (invoice.tax || 0);
      if (computed_total !== invoice.total) {
        throw new Error(`Invoice total mismatch: computed total is ${computed_total} cents (subtotal ${computed_subtotal} + tax ${invoice.tax || 0}), but total is ${invoice.total} cents`);
      }
    }
  }
}

// Export factory function for dependency injection
export function create_ocr_service(): IOcrService {
  return new OpenAIOcrService();
}
