"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrengthRatingProps {
  value: number; // 0-5 MMT scale
  onChange: (value: number) => void;
  previousValue?: number;
  baselineValue?: number;
  disabled?: boolean;
  autoPopulated?: boolean;
  showDescription?: boolean;
}

/**
 * Manual Muscle Testing (MMT) grades
 * Standard 0-5 scale used in physical therapy
 */
const MMT_GRADES = [
  {
    grade: 0,
    label: "0",
    name: "Zero",
    description: "No visible or palpable muscle contraction",
    color: "bg-error-500",
    textColor: "text-error-700",
    bgColor: "bg-error-50",
  },
  {
    grade: 1,
    label: "1",
    name: "Trace",
    description: "Visible or palpable contraction, no movement",
    color: "bg-error-400",
    textColor: "text-error-600",
    bgColor: "bg-error-50",
  },
  {
    grade: 2,
    label: "2",
    name: "Poor",
    description: "Full ROM with gravity eliminated",
    color: "bg-warning-500",
    textColor: "text-warning-700",
    bgColor: "bg-warning-50",
  },
  {
    grade: 3,
    label: "3",
    name: "Fair",
    description: "Full ROM against gravity, no resistance",
    color: "bg-warning-400",
    textColor: "text-warning-600",
    bgColor: "bg-warning-50",
  },
  {
    grade: 4,
    label: "4",
    name: "Good",
    description: "Full ROM against moderate resistance",
    color: "bg-success-400",
    textColor: "text-success-600",
    bgColor: "bg-success-50",
  },
  {
    grade: 5,
    label: "5",
    name: "Normal",
    description: "Full ROM against maximum resistance",
    color: "bg-success-500",
    textColor: "text-success-700",
    bgColor: "bg-success-50",
  },
];

/**
 * Strength rating input using MMT 0-5 scale
 * Large touch-friendly buttons for quick selection
 */
export function StrengthRating({
  value,
  onChange,
  previousValue,
  baselineValue,
  disabled = false,
  autoPopulated = false,
  showDescription = true,
}: StrengthRatingProps) {
  const currentGrade = MMT_GRADES[value] ?? MMT_GRADES[0];
  const deltaFromBaseline = baselineValue !== undefined ? value - baselineValue : null;
  const deltaFromPrevious = previousValue !== undefined ? value - previousValue : null;

  const handleSelect = (grade: number) => {
    if (!disabled) {
      onChange(grade);
    }
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
      {/* Current grade display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold",
              currentGrade?.color ?? "bg-muted"
            )}
          >
            {value}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xl font-bold", currentGrade?.textColor ?? "text-muted-foreground")}>
                {currentGrade?.name ?? "Unknown"}
              </span>
              {autoPopulated && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                  Auto
                </span>
              )}
            </div>
            {showDescription && (
              <span className="text-sm text-muted-foreground">
                {currentGrade?.description ?? ""}
              </span>
            )}
          </div>
        </div>

        {/* Delta displays */}
        <div className="flex flex-col items-end gap-1">
          {deltaFromBaseline !== null && deltaFromBaseline !== 0 && (
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

      {/* Grade selection buttons */}
      <div className="grid grid-cols-6 gap-2">
        {MMT_GRADES.map((grade) => {
          const isSelected = value === grade.grade;
          const wasPrevious = previousValue === grade.grade;
          const wasBaseline = baselineValue === grade.grade;

          return (
            <button
              key={grade.grade}
              type="button"
              onClick={() => handleSelect(grade.grade)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                "active:scale-95 touch-manipulation",
                isSelected
                  ? cn("border-current", grade.bgColor, grade.textColor)
                  : "border-border bg-background hover:bg-muted/50",
                wasPrevious && !isSelected && "border-dashed border-muted-foreground"
              )}
            >
              {/* Grade number */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors",
                  isSelected ? cn(grade.color, "text-white") : "bg-muted text-muted-foreground"
                )}
              >
                {grade.label}
              </div>

              {/* Grade name */}
              <span className={cn("text-xs font-medium", isSelected ? grade.textColor : "text-muted-foreground")}>
                {grade.name}
              </span>

              {/* Markers */}
              {wasBaseline && !isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border border-white" title="Baseline" />
              )}
              {wasPrevious && !isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                  prev
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Reference information */}
      {(baselineValue !== undefined || previousValue !== undefined) && (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {baselineValue !== undefined && (
            <span>
              Baseline: <strong>{baselineValue}/5</strong> ({MMT_GRADES[baselineValue]?.name ?? "Unknown"})
            </span>
          )}
          {previousValue !== undefined && previousValue !== baselineValue && (
            <span>
              Previous: <strong>{previousValue}/5</strong> ({MMT_GRADES[previousValue]?.name ?? "Unknown"})
            </span>
          )}
        </div>
      )}
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
        {delta}
      </span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
