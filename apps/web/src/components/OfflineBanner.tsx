"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Banner displayed when the user is offline.
 * Renders at the top of the page to inform users that some features may not work.
 */
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" />
      <span>You are offline. Some features may not work.</span>
    </div>
  );
}
