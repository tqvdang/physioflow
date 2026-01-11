"use client";

import * as React from "react";
import { Check, X, Minus, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

type YesNoNAValue = "yes" | "no" | "na" | null;

interface YesNoNAProps {
  value: YesNoNAValue;
  onChange: (value: YesNoNAValue) => void;
  labels?: {
    yes?: string;
    no?: string;
    na?: string;
  };
  previousValue?: YesNoNAValue;
  disabled?: boolean;
  autoPopulated?: boolean;
  showNA?: boolean;
}

const DEFAULT_LABELS = {
  yes: "Yes",
  no: "No",
  na: "N/A",
};

/**
 * Yes/No/N/A toggle with large touch targets
 */
export function YesNoNA({
  value,
  onChange,
  labels = DEFAULT_LABELS,
  previousValue,
  disabled = false,
  autoPopulated = false,
  showNA = true,
}: YesNoNAProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  const options: {
    value: YesNoNAValue;
    label: string;
    icon: React.ComponentType<LucideProps>;
    selectedClass: string;
    iconClass: string;
  }[] = [
    {
      value: "yes",
      label: mergedLabels.yes,
      icon: Check,
      selectedClass: "border-success bg-success-50 text-success-700",
      iconClass: "bg-success text-white",
    },
    {
      value: "no",
      label: mergedLabels.no,
      icon: X,
      selectedClass: "border-error bg-error-50 text-error-700",
      iconClass: "bg-error text-white",
    },
    ...(showNA
      ? [
          {
            value: "na" as YesNoNAValue,
            label: mergedLabels.na,
            icon: Minus,
            selectedClass: "border-muted-foreground bg-muted text-muted-foreground",
            iconClass: "bg-muted-foreground text-white",
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex gap-2",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const wasPrevious = previousValue === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(isSelected ? null : option.value)}
            disabled={disabled}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              "active:scale-[0.98] touch-manipulation",
              isSelected
                ? option.selectedClass
                : "border-border bg-background hover:bg-muted/50",
              wasPrevious && !isSelected && "border-dashed"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                isSelected ? option.iconClass : "bg-muted"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={2.5} />
            </div>

            <div className="text-center">
              <span className="font-medium">{option.label}</span>
              {wasPrevious && !isSelected && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Previous
                </div>
              )}
              {autoPopulated && isSelected && (
                <div className="text-xs mt-0.5 px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 inline-block">
                  Auto
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
