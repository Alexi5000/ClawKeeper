---
name: document-parser
description: "OCR and parse documents including invoices, receipts, and bank statements. Use when extracting text from PDF/images, parsing scanned documents, or processing uploaded files. Supports Google Document AI and Tesseract OCR."
---

# Document Parser Skill

## Purpose

Extracts text and structured data from documents using OCR technology, enabling automated processing of invoices, receipts, statements, and contracts.

## Triggers

- PDF or image document uploaded
- Scanned invoice needs processing
- Receipt needs expense categorization
- Bank statement needs reconciliation

## Capabilities

1. **OCR Text Extraction** - Convert images to text
2. **PDF Parsing** - Extract text from PDF documents
3. **Structured Data Extraction** - Identify fields, tables, line items
4. **Document Classification** - Classify document type
5. **Quality Assessment** - Assess OCR confidence

## Instructions

### Step 1: Document Type Detection

Classify document:
- **Invoice** - Vendor bill
- **Receipt** - Proof of purchase
- **Bank Statement** - Monthly statement
- **Contract** - Legal agreement
- **Other** - Unknown type

Use file name, content patterns, or LLM classification.

### Step 2: OCR Processing

#### Google Document AI (Preferred)

```typescript
const document_ai = require('@google-cloud/documentai');
const client = new document_ai.DocumentProcessorServiceClient();

const [result] = await client.processDocument({
  name: processor_name,
  rawDocument: {
    content: file_buffer.toString('base64'),
    mimeType: 'application/pdf',
  },
});

const extracted_text = result.document.text;
const entities = result.document.entities;  // Pre-extracted fields
```

#### Tesseract OCR (Fallback)

```bash
tesseract invoice.png output -l eng
```

### Step 3: Field Extraction

For **Invoices**, extract:
- Vendor name and address
- Invoice number and date
- Due date
- Line items (description, quantity, price)
- Subtotal, tax, total

For **Receipts**, extract:
- Merchant name
- Date and time
- Items purchased
- Total amount

For **Bank Statements**, extract:
- Account number
- Statement period
- Transaction list (date, description, amount)
- Beginning and ending balance

### Step 4: Structured Output

Return JSON with confidence scores:
```json
{
  "document_type": "invoice",
  "confidence": 0.92,
  "raw_text": "...",
  "extracted_fields": {
    "vendor_name": "Office Depot",
    "invoice_number": "INV-2024-001",
    "invoice_date": "2026-01-15",
    "due_date": "2026-02-15",
    "total_amount": "250.00",
    "currency": "USD",
    "line_items": [
      {
        "description": "Printer Paper",
        "quantity": "10",
        "unit_price": "15.00",
        "total": "150.00"
      }
    ]
  },
  "field_confidence": {
    "vendor_name": 0.95,
    "invoice_number": 0.89,
    "total_amount": 0.98
  },
  "requires_manual_review": false
}
```

### Step 5: Quality Check

Assess quality:
- **High Confidence** (> 0.9) - Auto-process
- **Medium Confidence** (0.7 - 0.9) - Flag for review
- **Low Confidence** (< 0.7) - Require manual entry

Check for:
- Missing required fields
- Illegible text
- Poor image quality
- Incomplete document

### Step 6: Post-Processing

- **Normalize Data** - Standardize dates, amounts
- **Validate** - Check logical consistency
- **Enhance** - Add context from database (e.g., known vendor)

## Error Handling

- **OCR Failed** - Return error, suggest higher quality scan
- **Unsupported Format** - Return error, list supported formats
- **Encrypted PDF** - Request password or unlocked version
- **Large File** - Split into pages, process individually
- **Poor Quality** - Suggest rescan, adjust DPI

## File Type Support

| Type | Extension | OCR Required |
|------|-----------|--------------|
| PDF (text) | .pdf | No |
| PDF (scanned) | .pdf | Yes |
| Image | .png, .jpg, .jpeg | Yes |
| Not Supported | .doc, .docx, .xls | Convert first |

## Integration Points

- **Google Document AI** - Primary OCR engine
- **Tesseract** - Fallback OCR
- **invoice-parser** (AP worker) - For invoice-specific parsing
- **data-validator** (Data worker) - For validation

## Models

- **OCR**: Google Document AI or Tesseract
- **Classification**: Claude Sonnet 4 or Gemini Flash
- **Field Extraction**: Claude Sonnet 4 (when OCR confidence low)

## Security

- Validate file type and size before processing
- Scan for malware (if uploaded by user)
- Never store raw documents longer than needed
- Redact PII from logs
- Encrypt documents at rest

## Performance

- **Target**: < 10s for invoice OCR
- **Batch Processing**: Process up to 50 invoices concurrently
- **Caching**: Cache OCR results for 24h (in case reprocessing needed)

---

Invoke this skill as the first step when processing any scanned or PDF document.
