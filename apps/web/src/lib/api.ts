/**
 * API Client for PhysioFlow backend services
 */

import { ensureValidToken, logout } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7011/api";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Request options for API calls
 */
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  const url = new URL(endpoint, API_BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Core fetch wrapper with error handling and authentication
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, params, headers: customHeaders, skipAuth = false, ...restOptions } = options;

  // Get valid access token (refreshes if needed)
  let token: string | null = null;
  if (!skipAuth && typeof window !== "undefined") {
    token = await ensureValidToken();
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const config: RequestInit = {
    ...restOptions,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const url = buildUrl(endpoint, params);

  const response = await fetch(url, config);

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401 && !skipAuth) {
    // Attempt to logout and redirect to login
    await logout();
    throw new ApiError("Session expired. Please login again.", 401, "session_expired");
  }

  if (!response.ok) {
    let errorMessage = "An error occurred";
    let errorCode: string | undefined;
    let errorDetails: Record<string, unknown> | undefined;

    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message ?? errorMessage;
      errorCode = errorBody.code;
      errorDetails = errorBody.details;
    } catch {
      // Response body is not JSON
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: null as T };
  }

  return response.json();
}

/**
 * API client with typed methods
 */
export const api = {
  /**
   * GET request
   */
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { ...options, method: "POST", body });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { ...options, method: "PUT", body });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { ...options, method: "PATCH", body });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchApi<T>(endpoint, { ...options, method: "DELETE" });
  },
};

/**
 * Download a PDF file from the API.
 * Opens the PDF in a new tab or triggers download.
 */
export async function downloadPDF(
  endpoint: string,
  filename?: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<void> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = await ensureValidToken();
  }

  const headers: HeadersInit = {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = buildUrl(endpoint, params);
  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    let errorMessage = "Failed to download PDF";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message ?? errorMessage;
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(errorMessage, response.status);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  // Determine filename from Content-Disposition header or use provided filename
  const contentDisposition = response.headers.get("Content-Disposition");
  let downloadFilename = filename ?? "report.pdf";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      downloadFilename = match[1];
    }
  }

  // Trigger download
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = downloadFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export default api;
