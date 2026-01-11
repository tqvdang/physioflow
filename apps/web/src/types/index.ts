/**
 * Common type definitions for PhysioFlow
 */

// Re-export auth types
export * from "./auth";

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

/**
 * User role types
 */
export type UserRole = "admin" | "doctor" | "therapist" | "receptionist" | "patient";

/**
 * Session status for therapy sessions
 */
export type SessionStatus = "pending" | "in_progress" | "completed" | "cancelled";

// Re-export checklist types
export * from "./checklist";

// Re-export patient types
export * from "./patient";

// Re-export exercise types
export * from "./exercise";

// Re-export appointment types
export * from "./appointment";
