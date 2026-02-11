"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { showMutationError } from "@/lib/error-handling";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/OfflineBanner";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Custom retry function: only retry on network errors, not on 4xx client errors.
 * Retries up to 3 times with exponential backoff.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;

  // Don't retry client errors (4xx)
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  // Retry network errors and server errors (5xx)
  return true;
}

/**
 * Exponential backoff delay: 1000ms * 2^attempt, capped at 30s
 */
function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: shouldRetryQuery,
            retryDelay,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
            onError: showMutationError,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <OfflineBanner />
          {children}
        </ErrorBoundary>
      </AuthProvider>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
