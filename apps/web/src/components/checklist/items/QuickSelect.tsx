"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistOption } from "@/types/checklist";

interface QuickSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: ChecklistOption[];
  previousValue?: string;
  disabled?: boolean;
  autoPopulated?: boolean;
  layout?: "horizontal" | "vertical" | "grid";
}

/**
 * Radio-style quick select buttons for single choice
 */
export function QuickSelect({
  value,
  onChange,
  options,
  previousValue,
  disabled = false,
  autoPopulated = false,
  layout = "vertical",
}: QuickSelectProps) {
  const gridClass =
    layout === "horizontal"
      ? "flex flex-wrap gap-2"
      : layout === "grid"
      ? "grid grid-cols-2 gap-2"
      : "flex flex-col gap-2";

  return (
    <div className={cn(gridClass, disabled && "opacity-50 pointer-events-none")}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const wasPrevious = previousValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
              "active:scale-[0.98] touch-manipulation",
              isSelected
                ? "border-primary bg-primary-50 text-primary-700"
                : "border-border bg-background hover:bg-muted/50",
              wasPrevious && !isSelected && "border-dashed border-muted-foreground/50"
            )}
          >
            {/* Radio indicator */}
            <div
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-muted-foreground/50"
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
  );
}
