"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PainSliderProps {
  value: number;
  onChange: (value: number) => void;
  previousValue?: number;
  disabled?: boolean;
  autoPopulated?: boolean;
}

const PAIN_EMOJIS = [
  { emoji: "😊", label: "No pain" },
  { emoji: "🙂", label: "Minimal" },
  { emoji: "😐", label: "Mild" },
  { emoji: "😕", label: "Uncomfortable" },
  { emoji: "😣", label: "Moderate" },
  { emoji: "😖", label: "Distracting" },
  { emoji: "😫", label: "Distressing" },
  { emoji: "😰", label: "Severe" },
  { emoji: "😱", label: "Intense" },
  { emoji: "😵", label: "Unbearable" },
  { emoji: "💀", label: "Worst possible" },
];

/**
 * Get color based on pain level (0-10)
 */
function getPainColor(value: number): string {
  if (value <= 2) return "bg-success-500";
  if (value <= 4) return "bg-warning-400";
  if (value <= 6) return "bg-warning-500";
  if (value <= 8) return "bg-error-400";
  return "bg-error-500";
}

function getPainTextColor(value: number): string {
  if (value <= 2) return "text-success-700";
  if (value <= 4) return "text-warning-700";
  if (value <= 6) return "text-warning-700";
  return "text-error-700";
}

/**
 * Touch-optimized pain scale slider with emoji faces and color gradient
 */
export function PainSlider({
  value,
  onChange,
  previousValue,
  disabled = false,
  autoPopulated = false,
}: PainSliderProps) {
  const delta = previousValue !== undefined ? value - previousValue : null;

  const handleQuickSelect = (level: number) => {
    if (!disabled) {
      onChange(level);
    }
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{PAIN_EMOJIS[value]?.emoji ?? "?"}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", getPainTextColor(value))}>
                {value}
              </span>
              <span className="text-lg text-muted-foreground">/ 10</span>
              {autoPopulated && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                  Auto
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {PAIN_EMOJIS[value]?.label ?? "Unknown"}
            </span>
          </div>
        </div>

        {/* Delta from previous */}
        {delta !== null && delta !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              delta > 0
                ? "bg-error-100 text-error-700"
                : "bg-success-100 text-success-700"
            )}
          >
            <span>{delta > 0 ? "+" : ""}{delta}</span>
            <span className="text-xs">from last</span>
          </div>
        )}
      </div>

      {/* Color gradient track */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-success-400 via-warning-400 to-error-500">
        {/* Previous value marker */}
        {previousValue !== undefined && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted-foreground/60 border-2 border-white shadow-sm"
            style={{ left: `calc(${previousValue * 10}% - 6px)` }}
            title={`Previous: ${previousValue}`}
          />
        )}

        {/* Current value indicator */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-white shadow-lg transition-all",
            getPainColor(value)
          )}
          style={{ left: `calc(${value * 10}% - 12px)` }}
        />
      </div>

      {/* Quick select buttons - large touch targets */}
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleQuickSelect(i)}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all",
              "active:scale-95 touch-manipulation",
              value === i
                ? cn(getPainColor(i), "text-white shadow-md")
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Emoji quick select for touch */}
      <div className="flex justify-between overflow-x-auto pb-2 -mx-2 px-2 gap-2">
        {[0, 2, 4, 6, 8, 10].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => handleQuickSelect(level)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[52px]",
              "active:scale-95 touch-manipulation",
              value === level
                ? "bg-primary-100 ring-2 ring-primary"
                : "hover:bg-muted"
            )}
          >
            <span className="text-2xl">{PAIN_EMOJIS[level]?.emoji ?? "?"}</span>
            <span className="text-xs text-muted-foreground">{level}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
