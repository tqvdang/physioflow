"use client";

/**
 * Discharge summary document preview
 * Bilingual template with Vietnamese primary, English secondary
 * Includes print and PDF export functionality
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { generateDischargePDF } from "@/lib/pdf";
import type { DischargeSummary } from "@/types/discharge";
import {
  Printer,
  FileDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface DischargeSummaryPreviewProps {
  summary: DischargeSummary;
  locale?: string;
  className?: string;
}

export function DischargeSummaryPreview({
  summary,
  locale = "vi",
  className,
}: DischargeSummaryPreviewProps) {
  const t = useTranslations("discharge");

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    generateDischargePDF(summary);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action buttons - hidden during print */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          {t("print")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <FileDown className="mr-2 h-4 w-4" />
          {t("export")}
        </Button>
      </div>

      {/* Summary Document */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-8 space-y-6 print:p-4">
          {/* Document Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {t("summaryDocument.titleVi")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("summaryDocument.titleEn")}
            </p>
            <Separator className="my-4" />
          </div>

          {/* Patient Information */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {t("summaryDocument.patientInfoVi")}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {t("summaryDocument.patientInfoEn")}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("summaryDocument.nameLabel")}:
                </span>{" "}
                <span className="font-medium">{summary.patientNameVi}</span>
                {summary.patientName && summary.patientName !== summary.patientNameVi && (
                  <span className="text-muted-foreground ml-1">
                    ({summary.patientName})
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">MRN:</span>{" "}
                <span className="font-medium">{summary.patientMrn}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("summaryDocument.dobLabel")}:
                </span>{" "}
                <span className="font-medium">
                  {formatDate(summary.patientDob)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("summaryDocument.dateRangeLabel")}:
                </span>{" "}
                <span className="font-medium">{summary.dateRange}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("summaryDocument.totalSessionsLabel")}:
                </span>{" "}
                <span className="font-medium">{summary.totalSessions}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("summaryDocument.therapistLabel")}:
                </span>{" "}
                <span className="font-medium">{summary.therapistName}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Diagnosis and Treatment Summary */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {t("summaryDocument.diagnosisTreatmentVi")}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {t("summaryDocument.diagnosisTreatmentEn")}
              </span>
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("summaryDocument.diagnosisLabel")}
                </h3>
                <p className="text-sm">{summary.diagnosisVi}</p>
                {summary.diagnosis && summary.diagnosis !== summary.diagnosisVi && (
                  <p className="text-sm text-muted-foreground italic mt-1">
                    {summary.diagnosis}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("summaryDocument.treatmentSummaryLabel")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {summary.treatmentSummaryVi}
                </p>
                {summary.treatmentSummary &&
                  summary.treatmentSummary !== summary.treatmentSummaryVi && (
                    <p className="text-sm text-muted-foreground italic mt-1 whitespace-pre-wrap">
                      {summary.treatmentSummary}
                    </p>
                  )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Outcome Measure Comparisons */}
          {summary.outcomeComparisons.length > 0 && (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  {t("summaryDocument.outcomesVi")}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    / {t("summaryDocument.outcomesEn")}
                  </span>
                </h2>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("measure")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("baseline")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("dischargeValue")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("change")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("metMCID")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.outcomeComparisons.map((c) => {
                        const isImprovement = c.higherIsBetter
                          ? c.change > 0
                          : c.change < 0;

                        return (
                          <tr key={c.measure}>
                            <td className="px-3 py-2">
                              {locale === "vi" ? c.measureVi : c.measure}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {c.baseline}
                            </td>
                            <td className="px-3 py-2 text-center font-medium">
                              {c.discharge}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  isImprovement
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                {isImprovement ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {c.change > 0 ? "+" : ""}
                                {c.change} ({c.percentImprovement > 0 ? "+" : ""}
                                {c.percentImprovement.toFixed(1)}%)
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {c.metMCID ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
                                  {t("mcidYes")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Functional Status */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {t("summaryDocument.functionalStatusVi")}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {t("summaryDocument.functionalStatusEn")}
              </span>
            </h2>
            <p className="text-sm whitespace-pre-wrap">
              {summary.functionalStatusVi}
            </p>
            {summary.functionalStatus &&
              summary.functionalStatus !== summary.functionalStatusVi && (
                <p className="text-sm text-muted-foreground italic mt-1 whitespace-pre-wrap">
                  {summary.functionalStatus}
                </p>
              )}
          </section>

          <Separator />

          {/* Home Exercise Program */}
          {summary.hepExercises.length > 0 && (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  {t("summaryDocument.hepVi")}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    / {t("summaryDocument.hepEn")}
                  </span>
                </h2>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("hep.exercise")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("hep.sets")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("hep.reps")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("hep.frequency")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.hepExercises.map((exercise) => (
                        <tr key={exercise.id}>
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium">
                                {locale === "vi"
                                  ? exercise.nameVi
                                  : exercise.nameEn}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {locale === "vi"
                                  ? exercise.nameEn
                                  : exercise.nameVi}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {exercise.sets}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {exercise.reps}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {exercise.frequency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Recommendations */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {t("summaryDocument.recommendationsVi")}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {t("summaryDocument.recommendationsEn")}
              </span>
            </h2>
            <p className="text-sm whitespace-pre-wrap">
              {summary.recommendationsVi}
            </p>
            {summary.recommendations &&
              summary.recommendations !== summary.recommendationsVi && (
                <p className="text-sm text-muted-foreground italic mt-1 whitespace-pre-wrap">
                  {summary.recommendations}
                </p>
              )}
          </section>

          {/* Follow-up Plan */}
          {summary.followUpPlan.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  {t("summaryDocument.followUpVi")}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    / {t("summaryDocument.followUpEn")}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {summary.followUpPlan.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                        {t(`followUpTypes.${item.type}`)}
                      </Badge>
                      <div>
                        <p>
                          {locale === "vi"
                            ? item.descriptionVi
                            : item.description}
                        </p>
                        {item.timeframe && (
                          <p className="text-xs text-muted-foreground">
                            {t("followUpTimeframeLabel")}: {item.timeframe}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <Separator />

          {/* Therapist Signature */}
          <section className="pt-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-12">
                  {t("summaryDocument.dateSignature")}
                </p>
                <div className="border-t border-dashed pt-2">
                  <p className="text-sm font-medium">
                    {t("summaryDocument.patientSignature")}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-12">
                  {t("summaryDocument.dateSignature")}
                </p>
                <div className="border-t border-dashed pt-2">
                  <p className="text-sm font-medium">
                    {summary.therapistName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("summaryDocument.therapistSignature")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Generated timestamp */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            {t("summaryDocument.generatedAt")}:{" "}
            {formatDate(summary.generatedAt, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
