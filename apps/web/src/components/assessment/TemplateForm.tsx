"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSaveResult,
  type AssessmentTemplate,
  type ChecklistItem,
} from "@/hooks/use-assessment-templates";

interface TemplateFormProps {
  template: AssessmentTemplate;
  patientId: string;
  locale?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TemplateForm({
  template,
  patientId,
  locale = "en",
  onComplete,
  onCancel,
}: TemplateFormProps) {
  const t = useTranslations("assessmentTemplates");
  const isVi = locale === "vi";

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveResult = useSaveResult();

  const sortedItems = [...template.checklistItems].sort(
    (a, b) => a.order - b.order
  );

  const getItemLabel = useCallback(
    (item: ChecklistItem) => (isVi ? item.itemVi : item.item),
    [isVi]
  );

  const getOptions = useCallback(
    (item: ChecklistItem) => {
      const labels = isVi && item.optionsVi ? item.optionsVi : item.options || [];
      const values = item.options || [];
      return values.map((val, idx) => ({
        value: val,
        label: labels[idx] || val,
      }));
    },
    [isVi]
  );

  const updateValue = useCallback(
    (itemKey: string, value: unknown) => {
      setFormValues((prev) => ({ ...prev, [itemKey]: value }));
      // Clear error on change
      if (errors[itemKey]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[itemKey];
          return next;
        });
      }
    },
    [errors]
  );

  const handleCheckboxChange = useCallback(
    (itemKey: string, option: string, checked: boolean) => {
      setFormValues((prev) => {
        const current = (prev[itemKey] as string[]) || [];
        if (checked) {
          return { ...prev, [itemKey]: [...current, option] };
        }
        return { ...prev, [itemKey]: current.filter((v) => v !== option) };
      });
      if (errors[itemKey]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[itemKey];
          return next;
        });
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const item of sortedItems) {
      if (!item.required) continue;
      const val = formValues[item.item];
      if (val === undefined || val === null || val === "") {
        newErrors[item.item] = t("fieldRequired");
      } else if (Array.isArray(val) && val.length === 0) {
        newErrors[item.item] = t("fieldRequired");
      } else if (item.type === "number" && item.range) {
        const num = Number(val);
        if (isNaN(num) || num < item.range[0] || num > item.range[1]) {
          newErrors[item.item] = t("outOfRange", {
            min: item.range[0],
            max: item.range[1],
          });
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [sortedItems, formValues, t]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      await saveResult.mutateAsync({
        patientId,
        templateId: template.id,
        results: formValues,
        notes: notes || undefined,
      });
      onComplete?.();
    } catch {
      // Error handled by mutation
    }
  }, [validate, saveResult, patientId, template.id, formValues, notes, onComplete]);

  const renderField = (item: ChecklistItem) => {
    const key = item.item;
    const label = getItemLabel(item);
    const error = errors[key];

    switch (item.type) {
      case "select":
        return (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {item.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={(formValues[key] as string) || ""}
              onValueChange={(val) => updateValue(key, val)}
            >
              <SelectTrigger className={error ? "border-destructive" : ""}>
                <SelectValue placeholder={t("selectOption")} />
              </SelectTrigger>
              <SelectContent>
                {getOptions(item).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {item.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex gap-3">
              {getOptions(item).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={formValues[key] === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateValue(key, opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "number":
        return (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {item.required && <span className="text-destructive">*</span>}
              {item.unit && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({item.unit})
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formValues[key] !== undefined ? String(formValues[key]) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateValue(key, val === "" ? "" : Number(val));
                }}
                min={item.range?.[0]}
                max={item.range?.[1]}
                className={error ? "border-destructive" : ""}
                placeholder={
                  item.range ? `${item.range[0]} - ${item.range[1]}` : ""
                }
              />
              {item.range && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.range[0]}-{item.range[1]}
                </span>
              )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "text":
        return (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {item.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={(formValues[key] as string) || ""}
              onChange={(e) => updateValue(key, e.target.value)}
              className={error ? "border-destructive" : ""}
              placeholder={t("enterText")}
              rows={3}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {item.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {getOptions(item).map((opt) => {
                const checked = ((formValues[key] as string[]) || []).includes(
                  opt.value
                );
                return (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${key}-${opt.value}`}
                      checked={checked}
                      onCheckedChange={(c) =>
                        handleCheckboxChange(key, opt.value, c === true)
                      }
                    />
                    <label
                      htmlFor={`${key}-${opt.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {opt.label}
                    </label>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const completedCount = sortedItems.filter((item) => {
    const val = formValues[item.item];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isVi ? template.nameVi : template.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isVi ? template.descriptionVi : template.description}
            </p>
          </div>
          <Badge variant="outline">
            {completedCount}/{sortedItems.length} {t("completed")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedItems.map(renderField)}

        {/* Additional notes */}
        <div className="space-y-2 pt-4 border-t">
          <Label>{t("additionalNotes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={saveResult.isPending}
          >
            {saveResult.isPending ? t("saving") : t("saveAssessment")}
          </Button>
        </div>

        {saveResult.isError && (
          <p className="text-sm text-destructive">
            {t("saveError")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
