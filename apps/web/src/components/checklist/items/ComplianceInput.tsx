"use client";

import * as React from "react";
import { Minus, Plus, TrendingUp, TrendingDown, Minus as TrendFlat } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceInputProps {
  value: number; // 0-100 percentage
  onChange: (value: number) => void;
  previousValue?: number;
  step?: number;
  disabled?: boolean;
  autoPopulated?: boolean;
}

const QUICK_VALUES = [0, 25, 50, 75, 100];

/**
 * Get color based on compliance percentage
 */
function getComplianceColor(value: number): string {
  if (value >= 80) return "text-success-600";
  if (value >= 50) return "text-warning-600";
  return "text-error-600";
}

function getComplianceBgColor(value: number): string {
  if (value >= 80) return "bg-success-500";
  if (value >= 50) return "bg-warning-500";
  return "bg-error-500";
}

function getComplianceLabel(value: number): string {
  if (value >= 90) return "Excellent";
  if (value >= 75) return "Good";
  if (value >= 50) return "Fair";
  if (value >= 25) return "Poor";
  return "Very Poor";
}

/**
 * Home exercise compliance percentage input
 * Used to track patient adherence to prescribed exercises
 */
export function ComplianceInput({
  value,
  onChange,
  previousValue,
  step = 5,
  disabled = false,
  autoPopulated = false,
}: ComplianceInputProps) {
  const delta = previousValue !== undefined ? value - previousValue : null;

  const handleIncrement = (amount: number) => {
    if (!disabled) {
      const newValue = Math.min(100, Math.max(0, value + amount));
      onChange(newValue);
    }
  };

  const handleQuickSelect = (pct: number) => {
    if (!disabled) {
      onChange(pct);
    }
  };

  const TrendIcon = delta === null || delta === 0
    ? TrendFlat
    : delta > 0
    ? TrendingUp
    : TrendingDown;

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Circular progress indicator */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className="stroke-muted"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={cn(
                  "transition-all duration-300",
                  value >= 80 ? "stroke-success-500" : value >= 50 ? "stroke-warning-500" : "stroke-error-500"
                )}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${value}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-lg font-bold", getComplianceColor(value))}>
                {value}%
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xl font-bold", getComplianceColor(value))}>
                {getComplianceLabel(value)}
              </span>
              {autoPopulated && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                  Auto
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              Home exercise compliance
            </span>
          </div>
        </div>

        {/* Delta from previous */}
        {delta !== null && delta !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              delta > 0
                ? "bg-success-100 text-success-700"
                : "bg-error-100 text-error-700"
            )}
          >
            <TrendIcon className="w-4 h-4" />
            <span>{delta > 0 ? "+" : ""}{delta}%</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
        {/* Previous value marker */}
        {previousValue !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-muted-foreground/50"
            style={{ left: `${previousValue}%` }}
            title={`Previous: ${previousValue}%`}
          />
        )}
        {/* Current value */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all duration-300 rounded-full",
            getComplianceBgColor(value)
          )}
          style={{ width: `${value}%` }}
        />
      </div>

      {/* Increment controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => handleIncrement(-step)}
          disabled={disabled || value <= 0}
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[100px]">
          <div className={cn("text-4xl font-bold", getComplianceColor(value))}>{value}%</div>
        </div>

        <button
          type="button"
          onClick={() => handleIncrement(step)}
          disabled={disabled || value >= 100}
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2 justify-center">
        {QUICK_VALUES.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => handleQuickSelect(pct)}
            disabled={disabled}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1",
              "active:scale-95 touch-manipulation",
              value === pct
                ? cn(getComplianceBgColor(pct), "text-white")
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {pct}%
          </button>
        ))}
      </div>
    </div>
  );
}
