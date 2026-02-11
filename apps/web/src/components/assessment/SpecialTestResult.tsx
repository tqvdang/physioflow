"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useRecordTestResult,
  type SpecialTest,
  type TestResult,
} from "@/hooks/use-special-tests";

const RESULT_OPTIONS: { value: TestResult; labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }[] = [
  { value: "positive", labelKey: "positive", variant: "destructive" },
  { value: "negative", labelKey: "negative", variant: "default" },
  { value: "inconclusive", labelKey: "inconclusive", variant: "secondary" },
];

interface SpecialTestResultProps {
  test: SpecialTest;
  patientId: string;
  visitId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function SpecialTestResult({
  test,
  patientId,
  visitId,
  onSaved,
  onCancel,
}: SpecialTestResultProps) {
  const t = useTranslations("specialTests");
  const [result, setResult] = useState<TestResult | null>(null);
  const [notes, setNotes] = useState("");

  const recordMutation = useRecordTestResult();

  const handleSave = async () => {
    if (!result) return;

    await recordMutation.mutateAsync({
      patientId,
      visitId,
      specialTestId: test.id,
      result,
      notes: notes.trim() || undefined,
    });

    onSaved?.();
  };

  // Determine interpretation text based on selected result
  const interpretationText = result === "positive"
    ? test.positiveFinding
    : result === "negative"
    ? test.negativeFinding
    : null;

  const interpretationTextVi = result === "positive"
    ? test.positiveFindingVi
    : result === "negative"
    ? test.negativeFindingVi
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{test.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{test.nameVi}</p>
          </div>
          <Badge variant="outline">{t(`categories.${test.category}`)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Description */}
        <div>
          <p className="text-sm text-muted-foreground">{test.description}</p>
        </div>

        {/* Sensitivity / Specificity */}
        {(test.sensitivity !== undefined || test.specificity !== undefined) && (
          <div className="flex gap-4 text-sm">
            {test.sensitivity !== undefined && (
              <div>
                <span className="text-muted-foreground">{t("sensitivity")}:</span>{" "}
                <span className="font-medium">{test.sensitivity}%</span>
              </div>
            )}
            {test.specificity !== undefined && (
              <div>
                <span className="text-muted-foreground">{t("specificity")}:</span>{" "}
                <span className="font-medium">{test.specificity}%</span>
              </div>
            )}
          </div>
        )}

        {/* Result Selector */}
        <div className="space-y-2">
          <Label>{t("result")}</Label>
          <div className="flex gap-2">
            {RESULT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={result === option.value ? option.variant : "outline"}
                size="sm"
                onClick={() => setResult(option.value)}
                className="flex-1"
              >
                {t(`results.${option.labelKey}`)}
              </Button>
            ))}
          </div>
        </div>

        {/* Interpretation (auto-populated based on result) */}
        {interpretationText && (
          <div className="rounded-md bg-muted p-3">
            <Label className="text-xs font-medium mb-1 block">
              {t("interpretation")}
            </Label>
            <p className="text-sm">{interpretationText}</p>
            {interpretationTextVi && (
              <p className="text-xs text-muted-foreground mt-1">{interpretationTextVi}</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="test-notes">{t("notes")}</Label>
          <Textarea
            id="test-notes"
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!result || recordMutation.isPending}
          >
            {recordMutation.isPending ? t("saving") : t("saveResult")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SpecialTestResult;
