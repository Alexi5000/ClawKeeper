/**
 * Google Document AI Integration
 * Invoice OCR and document processing
 */

export { DocumentAIClient, DocumentAIClientError, getDocumentAIClient, resetDocumentAIClient } from './client';

export type {
  // Config
  DocumentAIConfig,
  
  // Process Document
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  DocumentMimeType,
  
  // Document Structure
  DocumentAIDocument,
  DocumentPage,
  PageDimension,
  Layout,
  TextAnchor,
  TextSegment,
  BoundingPoly,
  Vertex,
  NormalizedVertex,
  Orientation,
  DetectedLanguage,
  Block,
  Paragraph,
  Line,
  Token,
  DetectedBreak,
  BreakType,
  VisualElement,
  Table,
  TableRow,
  TableCell,
  FormField,
  Provenance,
  ProvenanceParent,
  ProvenanceType,
  
  // Entities
  DocumentEntity,
  PageAnchor,
  PageRef,
  LayoutType,
  NormalizedValue,
  DateValue,
  DateTimeValue,
  TimeZone,
  MoneyValue,
  AddressValue,
  
  // Human Review
  HumanReviewStatus,
  HumanReviewState,
  
  // Misc
  ShardInfo,
  DocumentRevision,
  HumanReview,
  DocumentError,
  
  // Invoice Extraction
  ExtractedInvoiceData,
  ExtractedLineItem,
  
  // Errors
  DocumentAIError,
  DocumentAIErrorStatus,
} from './types';
