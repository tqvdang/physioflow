"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface AppRouteLayoutProps {
  children: ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 flex-col border-r bg-background p-4 lg:flex">
        <div className="mb-8 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex flex-1 flex-col">
        {/* Header skeleton */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <Skeleton className="mb-6 h-10 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppRouteLayout({ children }: AppRouteLayoutProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      login({ redirectPath: window.location.pathname });
    }
  }, [isLoading, isAuthenticated, login, router, locale]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return <AppLayout>{children}</AppLayout>;
}
