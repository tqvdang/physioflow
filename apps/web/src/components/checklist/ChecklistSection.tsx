"use client";

import * as React from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ChecklistItem } from "./ChecklistItem";
import type {
  ChecklistTemplateSection,
  ChecklistItemResponse,
  ChecklistResponseValue,
} from "@/types/checklist";

interface ChecklistSectionProps {
  section: ChecklistTemplateSection;
  responses: Record<string, ChecklistItemResponse>;
  onValueChange: (itemId: string, value: ChecklistResponseValue) => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  disabled?: boolean;
}

/**
 * Calculate section completion status
 */
function getSectionStatus(
  section: ChecklistTemplateSection,
  responses: Record<string, ChecklistItemResponse>
) {
  let completed = 0;
  let requiredCompleted = 0;
  let requiredTotal = 0;

  for (const item of section.items) {
    const response = responses[item.id];
    const hasValue = response?.value !== null && response?.value !== undefined;

    if (item.required) {
      requiredTotal++;
      if (hasValue) requiredCompleted++;
    }

    if (hasValue) completed++;
  }

  const total = section.items.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = requiredCompleted >= requiredTotal;
  const allComplete = completed >= total;

  return {
    completed,
    total,
    requiredCompleted,
    requiredTotal,
    percentage,
    isComplete,
    allComplete,
  };
}

/**
 * Collapsible section with completion indicator
 */
export function ChecklistSection({
  section,
  responses,
  onValueChange,
  isExpanded = false,
  onExpandChange,
  disabled = false,
}: ChecklistSectionProps) {
  const status = getSectionStatus(section, responses);
  const accordionValue = isExpanded ? section.id : "";

  const handleValueChange = (values: string) => {
    onExpandChange?.(values === section.id);
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={handleValueChange}
      className="border rounded-lg overflow-hidden"
    >
      <AccordionItem value={section.id} className="border-0">
        <AccordionTrigger
          className={cn(
            "px-4 py-3 hover:no-underline hover:bg-muted/50",
            status.allComplete && "bg-success-50",
            !status.isComplete && section.required && "bg-warning-50/50"
          )}
        >
          <div className="flex items-center gap-3 flex-1 text-left">
            {/* Completion indicator */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                status.allComplete
                  ? "bg-success text-white"
                  : status.isComplete
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {status.allComplete ? (
                <Check className="w-5 h-5" strokeWidth={3} />
              ) : (
                <span className="text-sm font-medium">
                  {status.completed}/{status.total}
                </span>
              )}
            </div>

            {/* Title and progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{section.title}</span>
                {section.required && !status.isComplete && (
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                )}
                {section.required && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning-100 text-warning-700 flex-shrink-0">
                    Required
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-1.5">
                <Progress
                  value={status.percentage}
                  className={cn(
                    "h-1.5",
                    status.allComplete && "[&>div]:bg-success"
                  )}
                />
              </div>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-4 pb-4">
          {section.description && (
            <p className="text-sm text-muted-foreground mb-4 pb-4 border-b">
              {section.description}
            </p>
          )}

          <div className="space-y-4">
            {section.items
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  response={responses[item.id]}
                  onValueChange={(value) => onValueChange(item.id, value)}
                  disabled={disabled}
                />
              ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * Compact section header for progress overview
 */
export function SectionProgressBar({
  sections,
  responses,
  onSectionClick,
}: {
  sections: ChecklistTemplateSection[];
  responses: Record<string, ChecklistItemResponse>;
  onSectionClick?: (sectionId: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {sections.map((section) => {
        const status = getSectionStatus(section, responses);

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionClick?.(section.id)}
            className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              status.allComplete
                ? "bg-success"
                : status.isComplete
                ? "bg-primary"
                : status.percentage > 0
                ? "bg-primary/50"
                : "bg-muted"
            )}
            title={`${section.title}: ${status.completed}/${status.total}`}
          />
        );
      })}
    </div>
  );
}
