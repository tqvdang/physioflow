"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistOption } from "@/types/checklist";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ChecklistOption[];
  previousValue?: string[];
  disabled?: boolean;
  autoPopulated?: boolean;
  layout?: "vertical" | "grid";
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Multi-select checkbox group for selecting multiple options
 */
export function MultiSelect({
  value,
  onChange,
  options,
  previousValue = [],
  disabled = false,
  autoPopulated = false,
  layout = "vertical",
  minSelections = 0,
  maxSelections,
}: MultiSelectProps) {
  const toggleOption = (optionValue: string) => {
    if (disabled) return;

    const isSelected = value.includes(optionValue);
    let newValue: string[];

    if (isSelected) {
      // Check minimum selections
      if (value.length <= minSelections) return;
      newValue = value.filter((v) => v !== optionValue);
    } else {
      // Check maximum selections
      if (maxSelections && value.length >= maxSelections) return;
      newValue = [...value, optionValue];
    }

    onChange(newValue);
  };

  const selectAll = () => {
    if (disabled) return;
    const maxAllowed = maxSelections ?? options.length;
    onChange(options.slice(0, maxAllowed).map((o) => o.value));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const gridClass =
    layout === "grid"
      ? "grid grid-cols-2 gap-2"
      : "flex flex-col gap-2";

  return (
    <div className={cn("space-y-3", disabled && "opacity-50 pointer-events-none")}>
      {/* Quick actions */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {value.length} of {options.length} selected
          {maxSelections && ` (max ${maxSelections})`}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearAll}
            disabled={value.length === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Clear
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={selectAll}
            disabled={value.length === options.length || (maxSelections !== undefined && value.length >= maxSelections)}
            className="text-primary hover:text-primary/80 disabled:opacity-50"
          >
            Select All
          </button>
        </div>
      </div>

      {/* Options */}
      <div className={gridClass}>
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const wasPrevious = previousValue.includes(option.value);
          const isMaxReached = maxSelections !== undefined && value.length >= maxSelections;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOption(option.value)}
              disabled={disabled || (isMaxReached && !isSelected)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                "active:scale-[0.98] touch-manipulation",
                isSelected
                  ? "border-primary bg-primary-50"
                  : "border-border bg-background hover:bg-muted/50",
                wasPrevious && !isSelected && "border-dashed border-muted-foreground/50",
                isMaxReached && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Checkbox indicator */}
              <div
                className={cn(
                  "flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/50 bg-background"
                )}
              >
                {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isSelected && "text-primary-700")}>
                    {option.label}
                  </span>
                  {wasPrevious && !isSelected && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Previous
                    </span>
                  )}
                  {autoPopulated && isSelected && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                      Auto
                    </span>
                  )}
                </div>
                {option.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
