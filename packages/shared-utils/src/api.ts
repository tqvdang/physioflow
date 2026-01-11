/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

/**
 * Query parameters type
 */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined | null>;

/**
 * Build query string from parameters object
 * Handles arrays, undefined values, and proper encoding
 */
export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      // Handle arrays by adding multiple entries with same key
      for (const item of value) {
        searchParams.append(key, item);
      }
    } else {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Common API error codes
 */
export const API_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Handle API error and return structured error object
 */
export function handleApiError(error: unknown): ApiError {
  // Handle fetch Response errors
  if (error instanceof Response) {
    return {
      code: getErrorCodeFromStatus(error.status),
      message: getErrorMessageFromStatus(error.status),
      status: error.status,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: API_ERROR_CODES.NETWORK_ERROR,
        message: 'Khong the ket noi den may chu. Vui long kiem tra ket noi mang.',
        status: 0,
      };
    }

    // Timeout errors
    if (error.name === 'AbortError') {
      return {
        code: API_ERROR_CODES.TIMEOUT,
        message: 'Yeu cau qua thoi gian cho. Vui long thu lai.',
        status: 408,
      };
    }

    return {
      code: API_ERROR_CODES.UNKNOWN,
      message: error.message || 'Da xay ra loi khong xac dinh.',
      status: 500,
    };
  }

  // Handle API error responses (from server)
  if (isApiErrorResponse(error)) {
    return {
      code: error.code ?? API_ERROR_CODES.UNKNOWN,
      message: error.message ?? 'Da xay ra loi.',
      status: error.status ?? 500,
      details: error.details,
    };
  }

  // Unknown error type
  return {
    code: API_ERROR_CODES.UNKNOWN,
    message: 'Da xay ra loi khong xac dinh.',
    status: 500,
  };
}

/**
 * Type guard for API error response
 */
function isApiErrorResponse(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Get error code from HTTP status
 */
function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 401:
      return API_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return API_ERROR_CODES.FORBIDDEN;
    case 404:
      return API_ERROR_CODES.NOT_FOUND;
    case 422:
      return API_ERROR_CODES.VALIDATION_ERROR;
    default:
      if (status >= 500) {
        return API_ERROR_CODES.SERVER_ERROR;
      }
      return API_ERROR_CODES.UNKNOWN;
  }
}

/**
 * Get error message from HTTP status (Vietnamese)
 */
function getErrorMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Yeu cau khong hop le.';
    case 401:
      return 'Ban chua dang nhap hoac phien dang nhap da het han.';
    case 403:
      return 'Ban khong co quyen truy cap tai nguyen nay.';
    case 404:
      return 'Khong tim thay tai nguyen yeu cau.';
    case 422:
      return 'Du lieu khong hop le.';
    case 429:
      return 'Qua nhieu yeu cau. Vui long thu lai sau.';
    case 500:
      return 'Loi may chu. Vui long thu lai sau.';
    case 502:
      return 'May chu tam thoi khong kha dung.';
    case 503:
      return 'Dich vu dang bao tri. Vui long thu lai sau.';
    default:
      return 'Da xay ra loi. Vui long thu lai.';
  }
}

/**
 * Retry options for retryWithBackoff
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
  } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Wait before next retry
      await sleep(delay);

      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Default retry condition - retry on network and server errors
 */
function defaultShouldRetry(error: unknown, _attempt: number): boolean {
  // Always retry network errors
  if (error instanceof TypeError && String(error.message).includes('fetch')) {
    return true;
  }

  // Retry on timeout
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  // Retry on 5xx server errors
  if (error instanceof Response && error.status >= 500) {
    return true;
  }

  // Don't retry client errors (4xx)
  if (error instanceof Response && error.status >= 400 && error.status < 500) {
    return false;
  }

  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create URL with base and path
 */
export function buildUrl(base: string, path: string, params?: QueryParams): string {
  // Remove trailing slash from base and leading slash from path
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  const url = `${cleanBase}/${cleanPath}`;

  if (params) {
    return url + buildQueryString(params);
  }

  return url;
}
