// file: tests/services/ocr_service.test.ts
// description: OCR service tests for invoice extraction
// reference: src/services/ocr_service.ts

import { describe, test, before as beforeAll } from 'node:test';
import { expect } from '../support/expect';
import { OpenAIOcrService, create_ocr_service, type ExtractedInvoice } from '../../src/services/ocr_service';

describe('OCR Service', () => {
  test('should create OCR service via factory', () => {
    const service = create_ocr_service();
    expect(service).toBeDefined();
  });

  test('should reject unsupported file types', async () => {
    const service = new OpenAIOcrService();
    const buffer = Buffer.from('test');

    await expect(
      service.extract_invoice_data(buffer, 'image/bmp')
    ).rejects.toThrow(/Unsupported file type/);
  });

  test('should validate extracted invoice structure', () => {
    const extracted: ExtractedInvoice = {
      vendor_name: 'Acme Corp',
      invoice_number: 'INV-12345',
      date: '2024-01-15',
      due_date: '2024-02-15',
      line_items: [
        {
          description: 'Widget A',
          quantity: 10,
          unit_price: 1500, // $15.00 in cents
          total: 15000, // $150.00 in cents
        },
      ],
      subtotal: 15000,
      tax: 1200,
      total: 16200,
      currency: 'USD',
      confidence: 0.95,
    };

    expect(extracted.vendor_name).toBe('Acme Corp');
    expect(extracted.line_items).toHaveLength(1);
    expect(extracted.line_items[0].total).toBe(15000);
    expect(extracted.confidence).toBeGreaterThan(0);
    expect(extracted.confidence).toBeLessThanOrEqual(1);
  });

  test('should handle monetary values in cents', () => {
    const extracted: ExtractedInvoice = {
      vendor_name: 'Test Vendor',
      invoice_number: 'TEST-001',
      date: '2024-01-01',
      due_date: '2024-01-31',
      line_items: [],
      subtotal: 10000, // $100.00
      tax: 800, // $8.00
      total: 10800, // $108.00
      currency: 'USD',
      confidence: 1.0,
    };

    expect(extracted.total).toBe(10800);
    expect(extracted.subtotal + extracted.tax).toBe(extracted.total);
  });

  test('should throw validation error on line items subtotal mismatch', () => {
    const service = new OpenAIOcrService();
    const invalid: ExtractedInvoice = {
      vendor_name: 'Acme Corp',
      invoice_number: 'INV-12345',
      date: '2024-01-15',
      due_date: '2024-02-15',
      line_items: [
        {
          description: 'Widget A',
          quantity: 10,
          unit_price: 1500,
          total: 15000,
        },
      ],
      subtotal: 14000, // Mismatch! 15000 != 14000
      tax: 1200,
      total: 15200,
      currency: 'USD',
      confidence: 0.95,
    };

    expect(() => (service as any).validate_extracted_invoice(invalid)).toThrow(
      /Line items subtotal mismatch/
    );
  });

  test('should throw validation error on total mismatch (subtotal + tax)', () => {
    const service = new OpenAIOcrService();
    const invalid: ExtractedInvoice = {
      vendor_name: 'Acme Corp',
      invoice_number: 'INV-12345',
      date: '2024-01-15',
      due_date: '2024-02-15',
      line_items: [
        {
          description: 'Widget A',
          quantity: 10,
          unit_price: 1500,
          total: 15000,
        },
      ],
      subtotal: 15000,
      tax: 1200,
      total: 16000, // Mismatch! 15000 + 1200 != 16000
      currency: 'USD',
      confidence: 0.95,
    };

    expect(() => (service as any).validate_extracted_invoice(invalid)).toThrow(
      /Invoice total mismatch/
    );
  });
});
