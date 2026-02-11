import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder for MeasureList while data is loading.
 * Mimics the table layout with pulsing placeholder rows.
 */
export function MeasureListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {/* Table header skeleton */}
          <div className="flex items-center border-b py-2">
            <Skeleton className="mr-4 h-4 w-24" />
            <Skeleton className="mr-4 h-4 w-20" />
            <Skeleton className="mr-4 h-4 w-12" />
            <Skeleton className="mr-4 h-4 w-16" />
            <div className="ml-auto">
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          {/* Table rows skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center border-b py-3 last:border-0">
              <Skeleton className="mr-4 h-4 w-20" />
              <Skeleton className="mr-4 h-4 w-16" />
              <Skeleton className="mr-4 h-4 w-10" />
              <Skeleton className="mr-4 h-5 w-16 rounded-full" />
              <div className="ml-auto flex gap-1">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
