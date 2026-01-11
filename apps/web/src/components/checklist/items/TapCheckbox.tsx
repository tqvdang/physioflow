"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TapCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  autoPopulated?: boolean;
}

/**
 * Large, touch-optimized checkbox for one-tap completion
 */
export function TapCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  autoPopulated = false,
}: TapCheckboxProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
        "active:scale-[0.98] touch-manipulation",
        checked
          ? "border-success bg-success-50 text-success-700"
          : "border-border bg-background hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
        autoPopulated && !checked && "border-dashed border-primary/50"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
          checked
            ? "bg-success text-white"
            : "bg-muted border-2 border-border"
        )}
      >
        {checked && <Check className="w-6 h-6" strokeWidth={3} />}
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", checked && "text-success-700")}>
            {label}
          </span>
          {autoPopulated && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
              Auto
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}
