"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ROMConfig } from "@/types/checklist";

interface ROMInputProps {
  value: number;
  onChange: (value: number) => void;
  config: ROMConfig;
  baselineValue?: number;
  previousValue?: number;
  disabled?: boolean;
  autoPopulated?: boolean;
}

/**
 * Range of Motion input with degree slider, delta display, and normal range indicator
 */
export function ROMInput({
  value,
  onChange,
  config,
  baselineValue,
  previousValue,
  disabled = false,
  autoPopulated = false,
}: ROMInputProps) {
  const { minDegree, maxDegree, normalMin, normalMax, joint, movement } = config;

  const range = maxDegree - minDegree;
  const deltaFromBaseline = baselineValue !== undefined ? value - baselineValue : null;
  const deltaFromPrevious = previousValue !== undefined ? value - previousValue : null;

  // Determine status based on normal range
  const isInNormalRange = value >= normalMin && value <= normalMax;
  const percentInRange = ((value - minDegree) / range) * 100;
  const normalMinPercent = ((normalMin - minDegree) / range) * 100;
  const normalMaxPercent = ((normalMax - minDegree) / range) * 100;

  const handleIncrement = (amount: number) => {
    if (!disabled) {
      const newValue = Math.min(maxDegree, Math.max(minDegree, value + amount));
      onChange(newValue);
    }
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Header with joint/movement info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{joint}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">{movement}</span>
            {autoPopulated && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                Auto
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              Normal: {normalMin}&deg; - {normalMax}&deg;
            </span>
          </div>
        </div>

        {/* Delta displays */}
        <div className="flex flex-col items-end gap-1">
          {deltaFromBaseline !== null && (
            <DeltaBadge
              delta={deltaFromBaseline}
              label="baseline"
              isPositiveGood={true}
            />
          )}
          {deltaFromPrevious !== null && deltaFromPrevious !== 0 && (
            <DeltaBadge
              delta={deltaFromPrevious}
              label="last visit"
              isPositiveGood={true}
              small
            />
          )}
        </div>
      </div>

      {/* Current value display */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => handleIncrement(-5)}
          disabled={disabled || value <= minDegree}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <Minus className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div
            className={cn(
              "text-4xl font-bold",
              isInNormalRange ? "text-success-600" : "text-warning-600"
            )}
          >
            {value}&deg;
          </div>
          <div
            className={cn(
              "text-sm",
              isInNormalRange ? "text-success-600" : "text-warning-600"
            )}
          >
            {isInNormalRange ? "Normal range" : "Below normal"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleIncrement(5)}
          disabled={disabled || value >= maxDegree}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center active:scale-95 touch-manipulation disabled:opacity-50"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      </div>

      {/* Range slider with normal range indicator */}
      <div className="relative pt-6 pb-2">
        {/* Normal range background */}
        <div
          className="absolute top-6 h-4 bg-success-100 rounded"
          style={{
            left: `${normalMinPercent}%`,
            width: `${normalMaxPercent - normalMinPercent}%`,
          }}
        />

        {/* Track */}
        <div className="relative h-4 bg-muted rounded-full">
          {/* Filled portion */}
          <div
            className={cn(
              "absolute left-0 h-full rounded-full transition-all",
              isInNormalRange ? "bg-success-500" : "bg-warning-500"
            )}
            style={{ width: `${percentInRange}%` }}
          />

          {/* Baseline marker */}
          {baselineValue !== undefined && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded"
              style={{ left: `${((baselineValue - minDegree) / range) * 100}%` }}
              title={`Baseline: ${baselineValue}`}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-primary-600 whitespace-nowrap">
                Baseline
              </div>
            </div>
          )}

          {/* Current value thumb */}
          <input
            type="range"
            min={minDegree}
            max={maxDegree}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-white shadow-lg pointer-events-none transition-all",
              isInNormalRange ? "bg-success-500" : "bg-warning-500"
            )}
            style={{ left: `calc(${percentInRange}% - 16px)` }}
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{minDegree}&deg;</span>
          <span>{maxDegree}&deg;</span>
        </div>
      </div>

      {/* Quick select buttons */}
      <div className="grid grid-cols-5 gap-2">
        {[minDegree, normalMin, Math.round((normalMin + normalMax) / 2), normalMax, maxDegree].map(
          (deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onChange(deg)}
              disabled={disabled}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                "active:scale-95 touch-manipulation",
                value === deg
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {deg}&deg;
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface DeltaBadgeProps {
  delta: number;
  label: string;
  isPositiveGood: boolean;
  small?: boolean;
}

function DeltaBadge({ delta, label, isPositiveGood, small = false }: DeltaBadgeProps) {
  const isGood = isPositiveGood ? delta > 0 : delta < 0;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full font-medium",
        small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        delta === 0
          ? "bg-muted text-muted-foreground"
          : isGood
          ? "bg-success-100 text-success-700"
          : "bg-error-100 text-error-700"
      )}
    >
      <Icon className={cn(small ? "w-3 h-3" : "w-4 h-4")} />
      <span>
        {delta > 0 ? "+" : ""}
        {delta}&deg;
      </span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
