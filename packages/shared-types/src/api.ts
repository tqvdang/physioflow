/**
 * API response types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Generic API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// -----------------------------------------------------------------------------
// Pagination Types
// -----------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Common Query Parameters
// -----------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface SearchParams extends PaginationParams, SortParams {
  query?: string;
}

// -----------------------------------------------------------------------------
// Batch Operation Types
// -----------------------------------------------------------------------------

export interface BatchResult<T> {
  successful: T[];
  failed: BatchError[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface BatchError {
  index: number;
  id?: string;
  error: ApiError;
}

// -----------------------------------------------------------------------------
// Health Check Types
// -----------------------------------------------------------------------------

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

// -----------------------------------------------------------------------------
// Audit Types
// -----------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  userId: string;
  userName: string;
  changes?: FieldChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface FieldChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

// -----------------------------------------------------------------------------
// File Upload Types
// -----------------------------------------------------------------------------

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface FileUploadRequest {
  entityType: string;
  entityId: string;
  category?: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Export Types
// -----------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ExportRequest {
  format: ExportFormat;
  filters?: Record<string, unknown>;
  columns?: string[];
  dateRange?: DateRangeParams;
}

export interface ExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: ExportFormat;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Notification Types
// -----------------------------------------------------------------------------

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  titleVi?: string;
  message: string;
  messageVi?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// WebSocket Event Types
// -----------------------------------------------------------------------------

export type WebSocketEventType =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'checklist.completed'
  | 'session.started'
  | 'session.completed'
  | 'notification.new'
  | 'user.status_changed';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
  clinicId: string;
  userId?: string;
}

// -----------------------------------------------------------------------------
// Error Codes
// -----------------------------------------------------------------------------

export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic errors
  APPOINTMENT_CONFLICT: 'APPOINTMENT_CONFLICT',
  SCHEDULE_UNAVAILABLE: 'SCHEDULE_UNAVAILABLE',
  SESSION_ALREADY_STARTED: 'SESSION_ALREADY_STARTED',
  CHECKLIST_LOCKED: 'CHECKLIST_LOCKED',
  PATIENT_INACTIVE: 'PATIENT_INACTIVE',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// -----------------------------------------------------------------------------
// HTTP Status Helpers
// -----------------------------------------------------------------------------

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];
