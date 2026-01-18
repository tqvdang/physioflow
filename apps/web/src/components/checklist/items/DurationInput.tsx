"use client";

import * as React from "react";
import { Minus, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DurationInputProps {
  value: number; // minutes
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  previousValue?: number;
  disabled?: boolean;
  autoPopulated?: boolean;
}

const QUICK_DURATIONS = [5, 10, 15, 20, 30, 45, 60];

/**
 * Duration input for treatment time logging with quick select buttons
 */
export function DurationInput({
  value,
  onChange,
  min = 1,
  max = 120,
  step = 5,
  previousValue,
  disabled = false,
  autoPopulated = false,
}: DurationInputProps) {
  const delta = previousValue !== undefined ? value - previousValue : null;

  const handleIncrement = (amount: number) => {
    if (!disabled) {
      const newValue = Math.min(max, Math.max(min, value + amount));
      onChange(newValue);
    }
  };

  const handleQuickSelect = (minutes: number) => {
    if (!disabled) {
      onChange(minutes);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {formatDuration(value)}
              </span>
              {autoPopulated && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                  Auto
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              Treatment duration
            </span>
          </div>
        </div>

        {/* Delta from previous */}
        {delta !== null && delta !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              delta > 0
                ? "bg-primary-100 text-primary-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span>{delta > 0 ? "+" : ""}{delta} min</span>
            <span className="text-xs opacity-70">vs last</span>
          </div>
        )}
      </div>

      {/* Increment controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => handleIncrement(-step)}
          disabled={disabled || value <= min}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <Minus className="w-6 h-6" />
        </button>

        <div className="text-center min-w-[80px]">
          <div className="text-4xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">minutes</div>
        </div>

        <button
          type="button"
          onClick={() => handleIncrement(step)}
          disabled={disabled || value >= max}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_DURATIONS.filter((d) => d >= min && d <= max).map((duration) => (
          <button
            key={duration}
            type="button"
            onClick={() => handleQuickSelect(duration)}
            disabled={disabled}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "active:scale-95 touch-manipulation",
              value === duration
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {formatDuration(duration)}
          </button>
        ))}
      </div>

      {/* Previous value reference */}
      {previousValue !== undefined && previousValue !== value && (
        <div className="text-center text-xs text-muted-foreground">
          Previous session: {formatDuration(previousValue)}
        </div>
      )}
    </div>
  );
}
