"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useCreateReevaluation,
  useReevaluationHistory,
} from "@/hooks/use-reevaluation";
import type {
  AssessmentType,
  CreateReevaluationItemRequest,
} from "@/hooks/use-reevaluation";
import {
  ComparisonTable,
  type ComparisonRow,
} from "@/components/assessment/ComparisonTable";
import { usePatientROM } from "@/hooks/use-rom";
import { usePatientMMT } from "@/hooks/use-mmt";
import { usePatientMeasures } from "@/hooks/use-outcome-measures";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react";

interface ReevaluationFormProps {
  patientId: string;
  visitId?: string;
  onSuccess?: () => void;
}

interface AssessmentItem {
  id: string;
  assessmentType: AssessmentType;
  measureLabel: string;
  currentValue: string;
  baselineValue: string;
  higherIsBetter: boolean;
  mcidThreshold: string;
}

const EMPTY_ITEM: () => AssessmentItem = () => ({
  id: crypto.randomUUID(),
  assessmentType: "rom",
  measureLabel: "",
  currentValue: "",
  baselineValue: "",
  higherIsBetter: true,
  mcidThreshold: "",
});

export function ReevaluationForm({
  patientId,
  visitId,
  onSuccess,
}: ReevaluationFormProps) {
  const t = useTranslations("reevaluation");
  const createReevaluation = useCreateReevaluation();

  const [items, setItems] = useState<AssessmentItem[]>([EMPTY_ITEM()]);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("form");

  // Fetch existing data for baseline selector
  usePatientROM(patientId);
  usePatientMMT(patientId);
  usePatientMeasures(patientId);

  // Fetch existing re-evaluation history
  const { data: historyData } = useReevaluationHistory(patientId);

  // Compute preview comparison data from current form items
  const previewData = useMemo<ComparisonRow[]>(() => {
    return items
      .filter(
        (item) =>
          item.measureLabel &&
          item.currentValue !== "" &&
          item.baselineValue !== ""
      )
      .map((item) => {
        const baseline = parseFloat(item.baselineValue);
        const current = parseFloat(item.currentValue);
        const change = current - baseline;
        let changePercentage: number | undefined;
        if (Math.abs(baseline) > 0.0001) {
          changePercentage = (change / Math.abs(baseline)) * 100;
        }

        const mcid = item.mcidThreshold
          ? parseFloat(item.mcidThreshold)
          : undefined;
        const absChange = Math.abs(change);
        let interpretation: "improved" | "declined" | "stable" = "stable";
        let mcidAchieved = false;

        const threshold = mcid && mcid > 0 ? mcid : 0;

        if (threshold > 0 && absChange < threshold) {
          interpretation = "stable";
        } else if (threshold === 0 && absChange < 0.0001) {
          interpretation = "stable";
        } else {
          mcidAchieved = threshold > 0 && absChange >= threshold;
          if (item.higherIsBetter) {
            interpretation = change > 0 ? "improved" : "declined";
          } else {
            interpretation = change < 0 ? "improved" : "declined";
          }
        }

        return {
          measureLabel: item.measureLabel,
          baselineValue: baseline,
          currentValue: current,
          change,
          changePercentage,
          higherIsBetter: item.higherIsBetter,
          mcidThreshold: mcid,
          mcidAchieved,
          interpretation,
        };
      });
  }, [items]);

  // Summary counts
  const summaryCount = useMemo(() => {
    const improved = previewData.filter(
      (d) => d.interpretation === "improved"
    ).length;
    const declined = previewData.filter(
      (d) => d.interpretation === "declined"
    ).length;
    const stable = previewData.filter(
      (d) => d.interpretation === "stable"
    ).length;
    const mcid = previewData.filter((d) => d.mcidAchieved).length;
    return { improved, declined, stable, mcid, total: previewData.length };
  }, [previewData]);

  const addItem = () => {
    setItems([...items, EMPTY_ITEM()]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof AssessmentItem,
    value: string | boolean
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const canSubmit =
    items.some(
      (item) =>
        item.measureLabel &&
        item.currentValue !== "" &&
        item.baselineValue !== ""
    ) && !createReevaluation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const assessments: CreateReevaluationItemRequest[] = items
      .filter(
        (item) =>
          item.measureLabel &&
          item.currentValue !== "" &&
          item.baselineValue !== ""
      )
      .map((item) => ({
        assessmentType: item.assessmentType,
        measureLabel: item.measureLabel,
        currentValue: parseFloat(item.currentValue),
        baselineValue: parseFloat(item.baselineValue),
        higherIsBetter: item.higherIsBetter,
        mcidThreshold: item.mcidThreshold
          ? parseFloat(item.mcidThreshold)
          : undefined,
      }));

    await createReevaluation.mutateAsync({
      patientId,
      visitId,
      assessments,
      notes: notes || undefined,
    });

    // Reset form
    setItems([EMPTY_ITEM()]);
    setNotes("");
    onSuccess?.();
  };

  // Convert history data to comparison rows for the history tab
  const historyRows = useMemo<ComparisonRow[]>(() => {
    if (!historyData) return [];
    return historyData.map((a) => ({
      measureLabel: a.measureLabel,
      baselineValue: a.baselineValue,
      currentValue: a.currentValue,
      change: a.change,
      changePercentage: a.changePercentage,
      higherIsBetter: a.higherIsBetter,
      mcidThreshold: a.mcidThreshold,
      mcidAchieved: a.mcidAchieved,
      interpretation: a.interpretation,
    }));
  }, [historyData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="form">{t("newReevaluation")}</TabsTrigger>
            <TabsTrigger value="history">{t("history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Assessment items */}
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("item")} #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assessment type */}
                    <div className="space-y-2">
                      <Label>{t("assessmentType")}</Label>
                      <Select
                        value={item.assessmentType}
                        onValueChange={(v) =>
                          updateItem(item.id, "assessmentType", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rom">{t("types.rom")}</SelectItem>
                          <SelectItem value="mmt">{t("types.mmt")}</SelectItem>
                          <SelectItem value="outcome_measure">
                            {t("types.outcomeMeasure")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Measure label */}
                    <div className="space-y-2">
                      <Label>{t("measureLabel")}</Label>
                      <Input
                        value={item.measureLabel}
                        onChange={(e) =>
                          updateItem(item.id, "measureLabel", e.target.value)
                        }
                        placeholder={t("measureLabelPlaceholder")}
                      />
                    </div>

                    {/* Baseline value */}
                    <div className="space-y-2">
                      <Label>{t("baselineValue")}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={item.baselineValue}
                        onChange={(e) =>
                          updateItem(item.id, "baselineValue", e.target.value)
                        }
                        placeholder={t("baselineValuePlaceholder")}
                      />
                    </div>

                    {/* Current value */}
                    <div className="space-y-2">
                      <Label>{t("currentValue")}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={item.currentValue}
                        onChange={(e) =>
                          updateItem(item.id, "currentValue", e.target.value)
                        }
                        placeholder={t("currentValuePlaceholder")}
                      />
                    </div>

                    {/* Higher is better */}
                    <div className="space-y-2">
                      <Label>{t("direction")}</Label>
                      <Select
                        value={item.higherIsBetter ? "higher" : "lower"}
                        onValueChange={(v) =>
                          updateItem(
                            item.id,
                            "higherIsBetter",
                            v === "higher"
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="higher">
                            {t("higherIsBetter")}
                          </SelectItem>
                          <SelectItem value="lower">
                            {t("lowerIsBetter")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* MCID threshold */}
                    <div className="space-y-2">
                      <Label>
                        {t("mcidThreshold")}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({t("optional")})
                        </span>
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={item.mcidThreshold}
                        onChange={(e) =>
                          updateItem(item.id, "mcidThreshold", e.target.value)
                        }
                        placeholder={t("mcidThresholdPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add item button */}
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addItem")}
              </Button>

              {/* Preview comparison */}
              {previewData.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t("preview")}</h4>

                  {/* Summary badges */}
                  <div className="flex gap-2 flex-wrap">
                    {summaryCount.improved > 0 && (
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {summaryCount.improved} {t("comparison.improved")}
                      </Badge>
                    )}
                    {summaryCount.declined > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {summaryCount.declined} {t("comparison.declined")}
                      </Badge>
                    )}
                    {summaryCount.stable > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Minus className="h-3 w-3" />
                        {summaryCount.stable} {t("comparison.stable")}
                      </Badge>
                    )}
                    {summaryCount.mcid > 0 && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-500 text-green-600"
                      >
                        {summaryCount.mcid} {t("mcidAchievedCount")}
                      </Badge>
                    )}
                  </div>

                  <ComparisonTable data={previewData} />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button type="submit" disabled={!canSubmit} className="w-full">
                {createReevaluation.isPending
                  ? t("submitting")
                  : t("submit")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="history">
            {historyRows.length > 0 ? (
              <ComparisonTable data={historyRows} showMCID />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("noHistory")}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
