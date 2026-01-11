"use client";

/**
 * Quick stats component for patient dashboard
 * Displays pain level, ROM progress, and goal progress
 */

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PatientQuickStats } from "@/types/patient";

interface QuickStatsProps {
  stats: PatientQuickStats;
  className?: string;
  variant?: "compact" | "full";
}

/**
 * Get pain level color based on value
 */
function getPainLevelColor(level: number): string {
  if (level <= 3) return "bg-green-500";
  if (level <= 6) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get progress color based on percentage
 * Exported for potential use in other components
 */
export function getProgressColor(progress: number): string {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-yellow-500";
  return "bg-gray-400";
}

export function QuickStats({
  stats,
  className,
  variant = "full",
}: QuickStatsProps) {
  const painColor = getPainLevelColor(stats.painLevel);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dau:</span>
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white",
              painColor
            )}
          >
            {stats.painLevel}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">ROM:</span>
          <span className="text-sm font-medium">{stats.romProgress}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Muc tieu:</span>
          <span className="text-sm font-medium">{stats.goalProgress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {/* Pain Level */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Muc do dau
            </span>
            <span className="text-2xl font-bold">{stats.painLevel}/10</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", painColor)}
              style={{ width: `${stats.painLevel * 10}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.painLevel <= 3
              ? "Dau nhe"
              : stats.painLevel <= 6
              ? "Dau vua"
              : "Dau nang"}
          </p>
        </CardContent>
      </Card>

      {/* ROM Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Tam van dong (ROM)
            </span>
            <span className="text-2xl font-bold">{stats.romProgress}%</span>
          </div>
          <Progress
            value={stats.romProgress}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            So voi tam van dong binh thuong
          </p>
        </CardContent>
      </Card>

      {/* Goal Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Tien do muc tieu
            </span>
            <span className="text-2xl font-bold">{stats.goalProgress}%</span>
          </div>
          <Progress
            value={stats.goalProgress}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.completedSessions}/{stats.totalSessions} buoi tap hoan thanh
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
