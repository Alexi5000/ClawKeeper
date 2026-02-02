---
name: invoice-processor
description: "Parse, validate, and categorize invoices using OCR and LLM. Use when processing uploaded invoices, extracting invoice data, validating invoice fields, or categorizing expenses. Handles PDF, image, and scanned invoices with intelligent field extraction."
---

# Invoice Processor Skill

## Purpose

Automates the complete invoice processing workflow from upload to categorization, using OCR for scanned documents and LLM for intelligent field extraction and validation.

## Triggers

- User uploads an invoice document
- Email with invoice attachment received
- API integration sends invoice data
- Manual invoice entry needs validation

## Capabilities

1. **OCR Processing** - Extract text from PDF, PNG, JPG invoice images
2. **Field Extraction** - Identify vendor, amount, date, line items
3. **Data Validation** - Verify required fields, check formats
4. **Duplicate Detection** - Match against existing invoices
5. **Expense Categorization** - Classify expenses to GL accounts
6. **Amount Verification** - Verify line items sum to total

## Instructions

### Step 1: Document Parsing

If document is image or PDF:
1. Use document-parser skill to extract text via OCR
2. Receive raw text output

### Step 2: Field Extraction

Extract required fields using LLM:
- **Vendor Name** - Company issuing the invoice
- **Vendor Email/Address** - Contact information
- **Invoice Number** - Unique identifier
- **Invoice Date** - Date invoice was issued
- **Due Date** - Payment due date
- **Total Amount** - Total amount due
- **Currency** - Currency code (default USD)
- **Line Items** - Array of:
  - Description
  - Quantity
  - Unit Price
  - Total Amount
  - Category (if indicated)

### Step 3: Validation

Validate extracted data:
- All required fields present
- Amounts are numeric and positive
- Dates are valid and logical (due_date >= invoice_date)
- Line items sum equals total amount (within $0.01 tolerance)
- Invoice number not empty

### Step 4: Duplicate Detection

Check for duplicates:
- Match by vendor_name + invoice_number
- Match by vendor_name + amount + invoice_date
- If match found, flag as potential duplicate

### Step 5: Expense Categorization

Categorize each line item:
- Use LLM to classify description to standard categories
- Categories: Office Supplies, Software, Cloud Services, Marketing, Travel, Equipment, Professional Services, Utilities, Rent, Insurance, etc.
- Map to GL account codes if tenant has custom chart of accounts

### Step 6: Structure Output

Return structured JSON:
```json
{
  "vendor_name": "...",
  "vendor_email": "...",
  "invoice_number": "...",
  "invoice_date": "2026-01-15T00:00:00Z",
  "due_date": "2026-02-15T00:00:00Z",
  "amount": 50000,  // cents
  "currency": "USD",
  "line_items": [
    {
      "id": "uuid",
      "description": "...",
      "quantity": 10,
      "unit_price": 1500,  // cents
      "amount": 15000,  // cents
      "category": "Office Supplies"
    }
  ],
  "is_duplicate": false,
  "confidence_score": 0.95,
  "validation_errors": [],
  "suggested_approval_workflow": "auto_approve" // or "manual_review"
}
```

## Error Handling

- **OCR Failed** - Return error, suggest manual entry
- **Missing Required Fields** - Flag fields, suggest manual completion
- **Validation Failed** - Return specific validation errors
- **Duplicate Detected** - Flag but allow manual override
- **Categorization Uncertain** - Mark as "Uncategorized" for manual review

## Integration Points

- **document-parser** - For OCR processing
- **duplicate-detector** (AP worker) - For duplicate checking
- **expense-categorizer** (AP worker) - For GL coding
- **audit-trail** - Log all processing actions

## Models

- **OCR**: Google Document AI
- **Field Extraction**: Claude Sonnet 4
- **Categorization**: Claude Sonnet 4 or Gemini 2.0 Flash

## Security

- Redact PII (SSN, credit card numbers) before LLM processing
- Validate file types (PDF, PNG, JPG only)
- Limit file size (< 10MB)
- Sanitize output before storage

---

Invoke this skill when an invoice needs to be processed from upload to categorized data ready for approval.
