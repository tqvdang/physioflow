"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Banner displayed when the user is offline.
 * Uses shadcn Alert component to inform users that some features may not work.
 */
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="rounded-none border-0 border-b">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You are offline. Some features may not work.
      </AlertDescription>
    </Alert>
  );
}
