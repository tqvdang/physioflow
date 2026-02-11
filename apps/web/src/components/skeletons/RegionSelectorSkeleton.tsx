import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder for RegionSelector while data is loading.
 * Mimics the select trigger appearance with a pulsing animation.
 */
export function RegionSelectorSkeleton() {
  return (
    <Skeleton className="h-10 w-full rounded-md" />
  );
}
