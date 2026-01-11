"use client";

import * as React from "react";
import { Play, Pause, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionTimerProps {
  elapsedSeconds: number;
  targetSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  compact?: boolean;
}

/**
 * Format seconds to MM:SS or HH:MM:SS display
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Session timer with visual alert at target time and pause/resume capability
 */
export function SessionTimer({
  elapsedSeconds,
  targetSeconds,
  isRunning: _isRunning,
  isPaused,
  onPause,
  onResume,
  compact = false,
}: SessionTimerProps) {
  const isOverTarget = elapsedSeconds > targetSeconds;
  const percentComplete = Math.min((elapsedSeconds / targetSeconds) * 100, 100);
  const targetMinutes = Math.floor(targetSeconds / 60);

  // Alert colors
  const getStatusColor = () => {
    if (isOverTarget) return "text-error";
    if (elapsedSeconds > targetSeconds * 0.9) return "text-warning";
    return "text-foreground";
  };

  const getProgressColor = () => {
    if (isOverTarget) return "bg-error";
    if (elapsedSeconds > targetSeconds * 0.9) return "bg-warning";
    return "bg-primary";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Clock className={cn("w-4 h-4", getStatusColor())} />
        <span className={cn("font-mono font-medium", getStatusColor())}>
          {formatTime(elapsedSeconds)}
        </span>
        {isOverTarget && (
          <AlertTriangle className="w-4 h-4 text-error animate-pulse" />
        )}
        <button
          type="button"
          onClick={isPaused ? onResume : onPause}
          className="p-1 rounded hover:bg-muted"
        >
          {isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2 transition-colors",
        isOverTarget
          ? "border-error bg-error-50"
          : isPaused
          ? "border-warning bg-warning-50"
          : "border-border bg-card"
      )}
    >
      {/* Timer display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isOverTarget
                ? "bg-error text-white"
                : isPaused
                ? "bg-warning text-white"
                : "bg-primary text-white"
            )}
          >
            <Clock className="w-6 h-6" />
          </div>

          <div>
            <div className={cn("text-3xl font-mono font-bold", getStatusColor())}>
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-sm text-muted-foreground">
              {isOverTarget ? (
                <span className="text-error flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Over target by {formatTime(elapsedSeconds - targetSeconds)}
                </span>
              ) : isPaused ? (
                <span className="text-warning">Paused</span>
              ) : (
                <span>Target: {targetMinutes} min</span>
              )}
            </div>
          </div>
        </div>

        {/* Pause/Resume button */}
        <Button
          type="button"
          variant={isPaused ? "default" : "outline"}
          size="lg"
          onClick={isPaused ? onResume : onPause}
          className="gap-2"
        >
          {isPaused ? (
            <>
              <Play className="w-5 h-5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          )}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all duration-1000",
            getProgressColor()
          )}
          style={{ width: `${Math.min(percentComplete, 100)}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 w-0.5 h-full bg-foreground/30"
          style={{ left: "100%" }}
        />
      </div>

      {/* Time remaining */}
      {!isOverTarget && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          {formatTime(targetSeconds - elapsedSeconds)} remaining
        </div>
      )}
    </div>
  );
}
