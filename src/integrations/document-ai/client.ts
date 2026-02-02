/**
 * Google Document AI Client
 * Invoice OCR and document processing
 * 
 * Rate Limiting Considerations:
 * - Document AI has quotas based on project and processor type
 * - Default: 120 pages per minute for online processing
 * - Batch processing recommended for large volumes
 * - Implement exponential backoff on quota errors
 * - Consider using batch processing for > 15 pages
 * - Cache processed results to avoid re-processing
 */

import type {
  DocumentAIConfig,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  DocumentAIDocument,
  DocumentEntity,
  ExtractedInvoiceData,
  ExtractedLineItem,
  DocumentAIError,
  DocumentAIErrorStatus,
  MoneyValue,
  DetectedBreak,
  LayoutType,
  BoundingPoly,
  HumanReviewStatus,
} from './types';

// Custom error class for Document AI-specific errors
export class DocumentAIClientError extends Error {
  readonly code: number;
  readonly status: DocumentAIErrorStatus;
  readonly details?: Array<Record<string, unknown>>;

  constructor(error: DocumentAIError) {
    super(error.message);
    this.name = 'DocumentAIClientError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }

  isQuotaError(): boolean {
    return this.status === 'RESOURCE_EXHAUSTED';
  }

  isAuthError(): boolean {
    return this.status === 'UNAUTHENTICATED' || this.status === 'PERMISSION_DENIED';
  }

  isNotFound(): boolean {
    return this.status === 'NOT_FOUND';
  }

  isInvalidArgument(): boolean {
    return this.status === 'INVALID_ARGUMENT';
  }
}

// Invoice entity type mappings
const INVOICE_ENTITY_TYPES = {
  invoiceNumber: ['invoice_id', 'invoice_number'],
  invoiceDate: ['invoice_date'],
  dueDate: ['due_date', 'payment_due_date'],
  vendorName: ['supplier_name', 'vendor_name'],
  vendorAddress: ['supplier_address', 'vendor_address'],
  customerName: ['receiver_name', 'customer_name', 'ship_to_name', 'bill_to_name'],
  customerAddress: ['receiver_address', 'customer_address', 'ship_to_address', 'bill_to_address'],
  subtotal: ['net_amount', 'subtotal'],
  tax: ['total_tax_amount', 'tax_amount'],
  total: ['total_amount', 'invoice_total', 'amount_due'],
  currency: ['currency', 'currency_code'],
  paymentTerms: ['payment_terms'],
  purchaseOrder: ['purchase_order', 'po_number'],
} as const;

const LINE_ITEM_ENTITY_TYPE = 'line_item';

export class DocumentAIClient {
  private readonly config: DocumentAIConfig;
  private readonly processorPath: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config?: Partial<DocumentAIConfig>) {
    this.config = {
      projectId: config?.projectId ?? process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID ?? '',
      location: config?.location ?? process.env.GOOGLE_DOCUMENT_AI_LOCATION ?? 'us',
      processorId: config?.processorId ?? process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID ?? '',
      credentials: config?.credentials ?? process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };

    if (!this.config.projectId) {
      throw new Error('Document AI client requires GOOGLE_DOCUMENT_AI_PROJECT_ID');
    }

    this.processorPath = `projects/${this.config.projectId}/locations/${this.config.location}/processors/${this.config.processorId}`;
  }

  /**
   * Get access token for API calls
   * Uses Application Default Credentials or service account key
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Try to get token from metadata server (GCP environment)
    try {
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } }
      );

      if (response.ok) {
        const data = await response.json() as { access_token: string; expires_in: number };
        this.accessToken = data.access_token;
        this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);
        return this.accessToken;
      }
    } catch {
      // Not in GCP environment, fall through to service account
    }

    // Use service account key file
    if (this.config.credentials) {
      // In production, use Google Auth Library
      // This is a simplified placeholder - real implementation would use:
      // const { GoogleAuth } = require('google-auth-library');
      // const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      throw new Error(
        'Service account authentication requires google-auth-library. ' +
        'Install it and implement proper authentication, or run in a GCP environment with default credentials.'
      );
    }

    throw new Error(
      'No credentials available. Set GOOGLE_APPLICATION_CREDENTIALS or run in a GCP environment.'
    );
  }

  /**
   * Make an authenticated request to the Document AI API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const baseUrl = `https://${this.config.location}-documentai.googleapis.com/v1`;
    const url = `${baseUrl}/${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as T | { error: DocumentAIError };

    if (!response.ok) {
      const errorResponse = data as { error: DocumentAIError };
      throw new DocumentAIClientError(errorResponse.error);
    }

    return data as T;
  }

  /**
   * Process a document using Document AI
   * Supports PDF, images (PNG, JPEG, TIFF, GIF, BMP, WebP)
   */
  async processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResponse> {
    const response = await this.request<{
      document: Record<string, unknown>;
      humanReviewStatus?: {
        state: string;
        stateMessage?: string;
        humanReviewOperation?: string;
      };
    }>(`${this.processorPath}:process`, 'POST', {
      rawDocument: {
        content: request.content,
        mimeType: request.mimeType,
      },
      skipHumanReview: request.skipHumanReview ?? false,
    });

    return {
      document: this.mapDocument(response.document),
      humanReviewStatus: response.humanReviewStatus ? {
        state: response.humanReviewStatus.state as HumanReviewStatus['state'],
        stateMessage: response.humanReviewStatus.stateMessage,
        humanReviewOperation: response.humanReviewStatus.humanReviewOperation,
      } : undefined,
    };
  }

  /**
   * Extract structured invoice data from a processed document
   * Maps Document AI entities to a standardized invoice format
   */
  extractInvoiceData(document: DocumentAIDocument): ExtractedInvoiceData {
    const entities = document.entities;
    
    // Helper to find entity by type aliases
    const findEntity = (typeAliases: readonly string[]): DocumentEntity | undefined => {
      return entities.find((e) => 
        typeAliases.some((alias) => e.type.toLowerCase() === alias.toLowerCase())
      );
    };

    // Helper to extract money value
    const extractMoney = (entity: DocumentEntity | undefined): number | null => {
      if (!entity) return null;
      
      if (entity.normalizedValue?.moneyValue) {
        const mv = entity.normalizedValue.moneyValue;
        return Number(mv.units) + (mv.nanos ? mv.nanos / 1e9 : 0);
      }
      
      // Try to parse from text
      const match = entity.mentionText.match(/[\d,]+\.?\d*/);
      if (match) {
        return parseFloat(match[0].replace(/,/g, ''));
      }
      
      return null;
    };

    // Helper to extract date
    const extractDate = (entity: DocumentEntity | undefined): string | null => {
      if (!entity) return null;
      
      if (entity.normalizedValue?.dateValue) {
        const dv = entity.normalizedValue.dateValue;
        return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`;
      }
      
      return entity.mentionText || null;
    };

    // Extract line items
    const lineItemEntities = entities.filter((e) => 
      e.type.toLowerCase() === LINE_ITEM_ENTITY_TYPE
    );

    const lineItems: ExtractedLineItem[] = lineItemEntities.map((lineItem) => {
      const props = lineItem.properties ?? [];
      
      const findProp = (names: string[]): DocumentEntity | undefined => {
        return props.find((p) => 
          names.some((n) => p.type.toLowerCase().includes(n.toLowerCase()))
        );
      };

      const description = findProp(['description', 'item'])?.mentionText ?? null;
      const quantityEntity = findProp(['quantity', 'qty']);
      const unitPriceEntity = findProp(['unit_price', 'price']);
      const amountEntity = findProp(['amount', 'line_amount', 'total']);
      const productCode = findProp(['product_code', 'item_code', 'sku'])?.mentionText ?? null;

      const quantity = quantityEntity 
        ? parseFloat(quantityEntity.mentionText.replace(/[^\d.]/g, ''))
        : null;
      
      const unitPrice = extractMoney(unitPriceEntity);
      const amount = extractMoney(amountEntity);

      return {
        description,
        quantity: isNaN(quantity ?? NaN) ? null : quantity,
        unitPrice,
        amount,
        productCode,
        confidence: lineItem.confidence,
      };
    });

    // Calculate overall confidence
    const confidenceScores = entities.map((e) => e.confidence).filter((c) => c > 0);
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    // Extract currency
    const currencyEntity = findEntity(INVOICE_ENTITY_TYPES.currency);
    const totalEntity = findEntity(INVOICE_ENTITY_TYPES.total);
    let currency: string | null = null;

    if (currencyEntity) {
      currency = currencyEntity.mentionText;
    } else if (totalEntity?.normalizedValue?.moneyValue?.currencyCode) {
      currency = totalEntity.normalizedValue.moneyValue.currencyCode;
    }

    return {
      invoiceNumber: findEntity(INVOICE_ENTITY_TYPES.invoiceNumber)?.mentionText ?? null,
      invoiceDate: extractDate(findEntity(INVOICE_ENTITY_TYPES.invoiceDate)),
      dueDate: extractDate(findEntity(INVOICE_ENTITY_TYPES.dueDate)),
      vendorName: findEntity(INVOICE_ENTITY_TYPES.vendorName)?.mentionText ?? null,
      vendorAddress: findEntity(INVOICE_ENTITY_TYPES.vendorAddress)?.mentionText ?? null,
      customerName: findEntity(INVOICE_ENTITY_TYPES.customerName)?.mentionText ?? null,
      customerAddress: findEntity(INVOICE_ENTITY_TYPES.customerAddress)?.mentionText ?? null,
      subtotal: extractMoney(findEntity(INVOICE_ENTITY_TYPES.subtotal)),
      tax: extractMoney(findEntity(INVOICE_ENTITY_TYPES.tax)),
      total: extractMoney(findEntity(INVOICE_ENTITY_TYPES.total)),
      currency,
      lineItems,
      paymentTerms: findEntity(INVOICE_ENTITY_TYPES.paymentTerms)?.mentionText ?? null,
      purchaseOrder: findEntity(INVOICE_ENTITY_TYPES.purchaseOrder)?.mentionText ?? null,
      rawEntities: entities,
      confidence: avgConfidence,
    };
  }

  /**
   * Convenience method to process a document and extract invoice data
   */
  async processAndExtractInvoice(request: ProcessDocumentRequest): Promise<ExtractedInvoiceData> {
    const response = await this.processDocument(request);
    return this.extractInvoiceData(response.document);
  }

  /**
   * Map raw API response to typed document
   */
  private mapDocument(raw: Record<string, unknown>): DocumentAIDocument {
    const pages = raw.pages as Array<Record<string, unknown>> | undefined;
    const entities = raw.entities as Array<Record<string, unknown>> | undefined;
    const shardInfo = raw.shardInfo as Record<string, unknown> | undefined;
    const error = raw.error as Record<string, unknown> | undefined;
    const revisions = raw.revisions as Array<Record<string, unknown>> | undefined;

    return {
      uri: raw.uri as string | undefined,
      content: raw.content as string | undefined,
      mimeType: String(raw.mimeType ?? ''),
      text: String(raw.text ?? ''),
      pages: (pages ?? []).map((page) => this.mapPage(page)),
      entities: (entities ?? []).map((entity) => this.mapEntity(entity)),
      shardInfo: shardInfo ? {
        shardIndex: String(shardInfo.shardIndex ?? '0'),
        shardCount: String(shardInfo.shardCount ?? '1'),
        textOffset: String(shardInfo.textOffset ?? '0'),
      } : undefined,
      error: error ? {
        code: Number(error.code ?? 0),
        message: String(error.message ?? ''),
        details: error.details as Array<Record<string, unknown>> | undefined,
      } : undefined,
      revisions: revisions?.map((rev) => ({
        agent: rev.agent as string | undefined,
        processor: rev.processor as string | undefined,
        id: rev.id as string | undefined,
        parent: rev.parent as number[] | undefined,
        createTime: rev.createTime as string | undefined,
        humanReview: rev.humanReview as { state: string; stateMessage?: string } | undefined,
      })),
    };
  }

  private mapPage(raw: Record<string, unknown>): DocumentAIDocument['pages'][0] {
    const dimension = raw.dimension as Record<string, unknown> | undefined;
    const layout = raw.layout as Record<string, unknown> | undefined;
    const detectedLanguages = raw.detectedLanguages as Array<Record<string, unknown>> | undefined;
    const blocks = raw.blocks as Array<Record<string, unknown>> | undefined;
    const paragraphs = raw.paragraphs as Array<Record<string, unknown>> | undefined;
    const lines = raw.lines as Array<Record<string, unknown>> | undefined;
    const tokens = raw.tokens as Array<Record<string, unknown>> | undefined;
    const visualElements = raw.visualElements as Array<Record<string, unknown>> | undefined;
    const tables = raw.tables as Array<Record<string, unknown>> | undefined;
    const formFields = raw.formFields as Array<Record<string, unknown>> | undefined;

    return {
      pageNumber: Number(raw.pageNumber ?? 1),
      dimension: {
        width: Number(dimension?.width ?? 0),
        height: Number(dimension?.height ?? 0),
        unit: String(dimension?.unit ?? 'PIXEL'),
      },
      layout: this.mapLayout(layout ?? {}),
      detectedLanguages: (detectedLanguages ?? []).map((dl) => ({
        languageCode: String(dl.languageCode ?? ''),
        confidence: Number(dl.confidence ?? 0),
      })),
      blocks: (blocks ?? []).map((b) => ({
        layout: this.mapLayout(b.layout as Record<string, unknown> ?? {}),
        detectedLanguages: ((b.detectedLanguages as Array<Record<string, unknown>>) ?? []).map((dl) => ({
          languageCode: String(dl.languageCode ?? ''),
          confidence: Number(dl.confidence ?? 0),
        })),
      })),
      paragraphs: (paragraphs ?? []).map((p) => ({
        layout: this.mapLayout(p.layout as Record<string, unknown> ?? {}),
        detectedLanguages: ((p.detectedLanguages as Array<Record<string, unknown>>) ?? []).map((dl) => ({
          languageCode: String(dl.languageCode ?? ''),
          confidence: Number(dl.confidence ?? 0),
        })),
      })),
      lines: (lines ?? []).map((l) => ({
        layout: this.mapLayout(l.layout as Record<string, unknown> ?? {}),
        detectedLanguages: ((l.detectedLanguages as Array<Record<string, unknown>>) ?? []).map((dl) => ({
          languageCode: String(dl.languageCode ?? ''),
          confidence: Number(dl.confidence ?? 0),
        })),
      })),
      tokens: (tokens ?? []).map((t) => ({
        layout: this.mapLayout(t.layout as Record<string, unknown> ?? {}),
        detectedBreak: t.detectedBreak as DetectedBreak | undefined,
        detectedLanguages: ((t.detectedLanguages as Array<Record<string, unknown>>) ?? []).map((dl) => ({
          languageCode: String(dl.languageCode ?? ''),
          confidence: Number(dl.confidence ?? 0),
        })),
      })),
      visualElements: (visualElements ?? []).map((ve) => ({
        layout: this.mapLayout(ve.layout as Record<string, unknown> ?? {}),
        type: String(ve.type ?? ''),
      })),
      tables: (tables ?? []).map((t) => this.mapTable(t)),
      formFields: (formFields ?? []).map((ff) => ({
        fieldName: this.mapLayout(ff.fieldName as Record<string, unknown> ?? {}),
        fieldValue: this.mapLayout(ff.fieldValue as Record<string, unknown> ?? {}),
        correctedKeyText: ff.correctedKeyText as string | undefined,
        correctedValueText: ff.correctedValueText as string | undefined,
        provenance: ff.provenance as DocumentAIDocument['pages'][0]['formFields'][0]['provenance'],
      })),
    };
  }

  private mapLayout(raw: Record<string, unknown>): DocumentAIDocument['pages'][0]['layout'] {
    const textAnchor = raw.textAnchor as Record<string, unknown> | undefined;
    const boundingPoly = raw.boundingPoly as Record<string, unknown> | undefined;

    return {
      textAnchor: {
        textSegments: ((textAnchor?.textSegments as Array<Record<string, unknown>>) ?? []).map((ts) => ({
          startIndex: String(ts.startIndex ?? '0'),
          endIndex: String(ts.endIndex ?? '0'),
        })),
        content: textAnchor?.content as string | undefined,
      },
      confidence: Number(raw.confidence ?? 0),
      boundingPoly: {
        vertices: ((boundingPoly?.vertices as Array<Record<string, unknown>>) ?? []).map((v) => ({
          x: Number(v.x ?? 0),
          y: Number(v.y ?? 0),
        })),
        normalizedVertices: ((boundingPoly?.normalizedVertices as Array<Record<string, unknown>>) ?? []).map((v) => ({
          x: Number(v.x ?? 0),
          y: Number(v.y ?? 0),
        })),
      },
      orientation: (raw.orientation as string ?? 'PAGE_UP') as DocumentAIDocument['pages'][0]['layout']['orientation'],
    };
  }

  private mapTable(raw: Record<string, unknown>): DocumentAIDocument['pages'][0]['tables'][0] {
    const headerRows = raw.headerRows as Array<Record<string, unknown>> | undefined;
    const bodyRows = raw.bodyRows as Array<Record<string, unknown>> | undefined;

    const mapRow = (row: Record<string, unknown>) => ({
      cells: ((row.cells as Array<Record<string, unknown>>) ?? []).map((cell) => ({
        layout: this.mapLayout(cell.layout as Record<string, unknown> ?? {}),
        rowSpan: Number(cell.rowSpan ?? 1),
        colSpan: Number(cell.colSpan ?? 1),
      })),
    });

    return {
      layout: this.mapLayout(raw.layout as Record<string, unknown> ?? {}),
      headerRows: (headerRows ?? []).map(mapRow),
      bodyRows: (bodyRows ?? []).map(mapRow),
    };
  }

  private mapEntity(raw: Record<string, unknown>): DocumentEntity {
    const normalizedValue = raw.normalizedValue as Record<string, unknown> | undefined;
    const properties = raw.properties as Array<Record<string, unknown>> | undefined;
    const pageAnchor = raw.pageAnchor as Record<string, unknown> | undefined;
    const moneyValue = normalizedValue?.moneyValue as Record<string, unknown> | undefined;
    const dateValue = normalizedValue?.dateValue as Record<string, unknown> | undefined;
    const addressValue = normalizedValue?.addressValue as Record<string, unknown> | undefined;

    return {
      type: String(raw.type ?? ''),
      mentionText: String(raw.mentionText ?? ''),
      mentionId: raw.mentionId as string | undefined,
      confidence: Number(raw.confidence ?? 0),
      pageAnchor: pageAnchor ? {
        pageRefs: ((pageAnchor.pageRefs as Array<Record<string, unknown>>) ?? []).map((pr) => ({
          page: String(pr.page ?? '0'),
          layoutType: pr.layoutType as LayoutType | undefined,
          layoutId: pr.layoutId as string | undefined,
          boundingPoly: pr.boundingPoly as BoundingPoly | undefined,
          confidence: pr.confidence as number | undefined,
        })),
      } : undefined,
      id: raw.id as string | undefined,
      normalizedValue: normalizedValue ? {
        text: normalizedValue.text as string | undefined,
        dateValue: dateValue ? {
          year: Number(dateValue.year ?? 0),
          month: Number(dateValue.month ?? 0),
          day: Number(dateValue.day ?? 0),
        } : undefined,
        moneyValue: moneyValue ? {
          currencyCode: String(moneyValue.currencyCode ?? ''),
          units: String(moneyValue.units ?? '0'),
          nanos: moneyValue.nanos as number | undefined,
        } : undefined,
        addressValue: addressValue ? {
          addressLines: (addressValue.addressLines as string[]) ?? [],
          administrativeArea: addressValue.administrativeArea as string | undefined,
          languageCode: addressValue.languageCode as string | undefined,
          locality: addressValue.locality as string | undefined,
          organization: addressValue.organization as string | undefined,
          postalCode: addressValue.postalCode as string | undefined,
          recipients: addressValue.recipients as string[] | undefined,
          regionCode: addressValue.regionCode as string | undefined,
          revision: addressValue.revision as number | undefined,
          sortingCode: addressValue.sortingCode as string | undefined,
          sublocality: addressValue.sublocality as string | undefined,
        } : undefined,
        booleanValue: normalizedValue.booleanValue as boolean | undefined,
        integerValue: normalizedValue.integerValue as string | undefined,
        floatValue: normalizedValue.floatValue as number | undefined,
      } : undefined,
      properties: properties?.map((p) => this.mapEntity(p)),
      provenance: raw.provenance as DocumentEntity['provenance'],
      redacted: Boolean(raw.redacted),
    };
  }
}

// Singleton instance
let documentAIClientInstance: DocumentAIClient | null = null;

export function getDocumentAIClient(config?: Partial<DocumentAIConfig>): DocumentAIClient {
  if (!documentAIClientInstance) {
    documentAIClientInstance = new DocumentAIClient(config);
  }
  return documentAIClientInstance;
}

export function resetDocumentAIClient(): void {
  documentAIClientInstance = null;
}
