"use client";

import * as React from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TapCheckbox,
  PainSlider,
  ROMInput,
  QuickSelect,
  YesNoNA,
  VoiceText,
  MultiSelect,
} from "./items";
import { Input } from "@/components/ui/input";
import type {
  ChecklistTemplateItem,
  ChecklistItemResponse,
  ChecklistResponseValue,
} from "@/types/checklist";

interface ChecklistItemProps {
  item: ChecklistTemplateItem;
  response: ChecklistItemResponse | undefined;
  onValueChange: (value: ChecklistResponseValue) => void;
  disabled?: boolean;
}

/**
 * Render the appropriate input component based on input type
 */
export function ChecklistItem({
  item,
  response,
  onValueChange,
  disabled = false,
}: ChecklistItemProps) {
  const value = response?.value ?? null;
  const previousValue = response?.previousValue;
  const baselineValue = response?.baselineValue;
  const autoPopulated = response?.autoPopulated ?? false;

  const renderInput = () => {
    switch (item.inputType) {
      case "checkbox":
        return (
          <TapCheckbox
            checked={value === true}
            onChange={(checked) => onValueChange(checked)}
            label={item.label}
            description={item.description}
            disabled={disabled}
            autoPopulated={autoPopulated}
          />
        );

      case "pain_scale":
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <PainSlider
              value={typeof value === "number" ? value : 0}
              onChange={(v) => onValueChange(v)}
              previousValue={typeof previousValue === "number" ? previousValue : undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "rom":
        if (!item.romConfig) {
          return <div className="text-error">ROM config missing</div>;
        }
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <ROMInput
              value={typeof value === "number" ? value : item.romConfig.normalMin}
              onChange={(v) => onValueChange(v)}
              config={item.romConfig}
              baselineValue={typeof baselineValue === "number" ? baselineValue : undefined}
              previousValue={typeof previousValue === "number" ? previousValue : undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "quick_select":
        if (!item.options?.length) {
          return <div className="text-error">Options missing</div>;
        }
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <QuickSelect
              value={typeof value === "string" ? value : null}
              onChange={(v) => onValueChange(v)}
              options={item.options}
              previousValue={typeof previousValue === "string" ? previousValue : undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "yes_no_na":
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <YesNoNA
              value={value as "yes" | "no" | "na" | null}
              onChange={(v) => onValueChange(v)}
              previousValue={previousValue as "yes" | "no" | "na" | undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "voice_text":
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <VoiceText
              value={typeof value === "string" ? value : ""}
              onChange={(v) => onValueChange(v)}
              placeholder={item.description}
              previousValue={typeof previousValue === "string" ? previousValue : undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "multi_select":
        if (!item.options?.length) {
          return <div className="text-error">Options missing</div>;
        }
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <MultiSelect
              value={Array.isArray(value) ? value : []}
              onChange={(v) => onValueChange(v)}
              options={item.options}
              previousValue={Array.isArray(previousValue) ? previousValue : undefined}
              disabled={disabled}
              autoPopulated={autoPopulated}
            />
          </div>
        );

      case "text":
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <Input
              type="text"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={item.description || "Enter text..."}
              disabled={disabled}
              className="h-12 text-base"
            />
            {previousValue && previousValue !== value && (
              <p className="text-xs text-muted-foreground">
                Previous: {String(previousValue)}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div className="space-y-2">
            <ItemHeader item={item} autoPopulated={autoPopulated} />
            <Input
              type="number"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => onValueChange(Number(e.target.value))}
              placeholder={item.description || "Enter number..."}
              disabled={disabled}
              className="h-12 text-base"
            />
            {typeof previousValue === "number" && previousValue !== value && (
              <DeltaDisplay current={value as number} previous={previousValue} />
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 rounded-lg bg-muted text-muted-foreground">
            Unknown input type: {item.inputType}
          </div>
        );
    }
  };

  return <div className="py-2">{renderInput()}</div>;
}

/**
 * Item header with label and indicators
 */
function ItemHeader({
  item,
  autoPopulated,
}: {
  item: ChecklistTemplateItem;
  autoPopulated: boolean;
}) {
  // Skip header for checkbox type as it's integrated
  if (item.inputType === "checkbox") return null;

  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.label}</span>
          {item.required && (
            <AlertCircle className="w-4 h-4 text-error" />
          )}
        </div>
        {item.description && item.inputType !== "text" && item.inputType !== "number" && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {item.description}
          </p>
        )}
      </div>

      {autoPopulated && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-xs">
          <Sparkles className="w-3 h-3" />
          Auto-filled
        </div>
      )}
    </div>
  );
}

/**
 * Delta display for numeric values
 */
function DeltaDisplay({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const delta = current - previous;
  if (delta === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        delta > 0 ? "bg-success-100 text-success-700" : "bg-error-100 text-error-700"
      )}
    >
      {delta > 0 ? "+" : ""}
      {delta} from previous
    </div>
  );
}
