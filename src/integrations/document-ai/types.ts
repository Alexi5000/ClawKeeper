/**
 * Google Document AI Integration Types
 * Invoice OCR and document processing
 */

// Configuration
export interface DocumentAIConfig {
  projectId: string;
  location: string;
  processorId: string;
  credentials?: string; // Path to service account JSON
}

// Process Document
export interface ProcessDocumentRequest {
  content: string; // Base64 encoded document
  mimeType: DocumentMimeType;
  skipHumanReview?: boolean;
}

export type DocumentMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/tiff'
  | 'image/gif'
  | 'image/bmp'
  | 'image/webp';

export interface ProcessDocumentResponse {
  document: DocumentAIDocument;
  humanReviewStatus?: HumanReviewStatus;
}

export interface DocumentAIDocument {
  uri?: string;
  content?: string;
  mimeType: string;
  text: string;
  pages: DocumentPage[];
  entities: DocumentEntity[];
  shardInfo?: ShardInfo;
  error?: DocumentError;
  revisions?: DocumentRevision[];
}

export interface DocumentPage {
  pageNumber: number;
  dimension: PageDimension;
  layout: Layout;
  detectedLanguages: DetectedLanguage[];
  blocks: Block[];
  paragraphs: Paragraph[];
  lines: Line[];
  tokens: Token[];
  visualElements: VisualElement[];
  tables: Table[];
  formFields: FormField[];
}

export interface PageDimension {
  width: number;
  height: number;
  unit: string;
}

export interface Layout {
  textAnchor: TextAnchor;
  confidence: number;
  boundingPoly: BoundingPoly;
  orientation: Orientation;
}

export interface TextAnchor {
  textSegments: TextSegment[];
  content?: string;
}

export interface TextSegment {
  startIndex: string;
  endIndex: string;
}

export interface BoundingPoly {
  vertices: Vertex[];
  normalizedVertices: NormalizedVertex[];
}

export interface Vertex {
  x: number;
  y: number;
}

export interface NormalizedVertex {
  x: number;
  y: number;
}

export type Orientation = 'PAGE_UP' | 'PAGE_RIGHT' | 'PAGE_DOWN' | 'PAGE_LEFT';

export interface DetectedLanguage {
  languageCode: string;
  confidence: number;
}

export interface Block {
  layout: Layout;
  detectedLanguages: DetectedLanguage[];
}

export interface Paragraph {
  layout: Layout;
  detectedLanguages: DetectedLanguage[];
}

export interface Line {
  layout: Layout;
  detectedLanguages: DetectedLanguage[];
}

export interface Token {
  layout: Layout;
  detectedBreak?: DetectedBreak;
  detectedLanguages: DetectedLanguage[];
}

export interface DetectedBreak {
  type: BreakType;
}

export type BreakType = 'UNKNOWN' | 'SPACE' | 'WIDE_SPACE' | 'HYPHEN';

export interface VisualElement {
  layout: Layout;
  type: string;
}

export interface Table {
  layout: Layout;
  headerRows: TableRow[];
  bodyRows: TableRow[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  layout: Layout;
  rowSpan: number;
  colSpan: number;
}

export interface FormField {
  fieldName: Layout;
  fieldValue: Layout;
  correctedKeyText?: string;
  correctedValueText?: string;
  provenance?: Provenance;
}

export interface Provenance {
  revision: number;
  id: number;
  parents?: ProvenanceParent[];
  type: ProvenanceType;
}

export interface ProvenanceParent {
  revision: number;
  index: number;
  id: number;
}

export type ProvenanceType =
  | 'OPERATION_TYPE_UNSPECIFIED'
  | 'ADD'
  | 'REMOVE'
  | 'REPLACE'
  | 'EVAL_REQUESTED'
  | 'EVAL_APPROVED'
  | 'EVAL_SKIPPED';

// Entities (extracted fields)
export interface DocumentEntity {
  type: string;
  mentionText: string;
  mentionId?: string;
  confidence: number;
  pageAnchor?: PageAnchor;
  id?: string;
  normalizedValue?: NormalizedValue;
  properties?: DocumentEntity[];
  provenance?: Provenance;
  redacted: boolean;
}

export interface PageAnchor {
  pageRefs: PageRef[];
}

export interface PageRef {
  page: string;
  layoutType?: LayoutType;
  layoutId?: string;
  boundingPoly?: BoundingPoly;
  confidence?: number;
}

export type LayoutType =
  | 'LAYOUT_TYPE_UNSPECIFIED'
  | 'BLOCK'
  | 'PARAGRAPH'
  | 'LINE'
  | 'TOKEN'
  | 'VISUAL_ELEMENT'
  | 'TABLE'
  | 'FORM_FIELD';

export interface NormalizedValue {
  text?: string;
  dateValue?: DateValue;
  datetimeValue?: DateTimeValue;
  moneyValue?: MoneyValue;
  addressValue?: AddressValue;
  booleanValue?: boolean;
  integerValue?: string;
  floatValue?: number;
}

export interface DateValue {
  year: number;
  month: number;
  day: number;
}

export interface DateTimeValue {
  year: number;
  month: number;
  day: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
  utcOffset?: string;
  timeZone?: TimeZone;
}

export interface TimeZone {
  id: string;
  version?: string;
}

export interface MoneyValue {
  currencyCode: string;
  units: string;
  nanos?: number;
}

export interface AddressValue {
  addressLines: string[];
  administrativeArea?: string;
  languageCode?: string;
  locality?: string;
  organization?: string;
  postalCode?: string;
  recipients?: string[];
  regionCode?: string;
  revision?: number;
  sortingCode?: string;
  sublocality?: string;
}

// Human Review
export interface HumanReviewStatus {
  state: HumanReviewState;
  stateMessage?: string;
  humanReviewOperation?: string;
}

export type HumanReviewState =
  | 'STATE_UNSPECIFIED'
  | 'SKIPPED'
  | 'VALIDATION_PASSED'
  | 'IN_PROGRESS'
  | 'ERROR';

// Shard Info (for large documents)
export interface ShardInfo {
  shardIndex: string;
  shardCount: string;
  textOffset: string;
}

// Revision
export interface DocumentRevision {
  agent?: string;
  processor?: string;
  id?: string;
  parent?: number[];
  createTime?: string;
  humanReview?: HumanReview;
}

export interface HumanReview {
  state: string;
  stateMessage?: string;
}

// Document Error
export interface DocumentError {
  code: number;
  message: string;
  details?: Array<Record<string, unknown>>;
}

// Invoice-specific extracted data (high-level)
export interface ExtractedInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  vendorName: string | null;
  vendorAddress: string | null;
  customerName: string | null;
  customerAddress: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  lineItems: ExtractedLineItem[];
  paymentTerms: string | null;
  purchaseOrder: string | null;
  rawEntities: DocumentEntity[];
  confidence: number;
}

export interface ExtractedLineItem {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  productCode: string | null;
  confidence: number;
}

// Document AI Errors
export interface DocumentAIError {
  code: number;
  message: string;
  status: DocumentAIErrorStatus;
  details?: Array<Record<string, unknown>>;
}

export type DocumentAIErrorStatus =
  | 'OK'
  | 'CANCELLED'
  | 'UNKNOWN'
  | 'INVALID_ARGUMENT'
  | 'DEADLINE_EXCEEDED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'UNAUTHENTICATED'
  | 'RESOURCE_EXHAUSTED'
  | 'FAILED_PRECONDITION'
  | 'ABORTED'
  | 'OUT_OF_RANGE'
  | 'UNIMPLEMENTED'
  | 'INTERNAL'
  | 'UNAVAILABLE'
  | 'DATA_LOSS';
