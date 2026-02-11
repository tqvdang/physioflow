"use client";

/**
 * Home Exercise Program (HEP) display and export component
 * Supports bilingual display, print-friendly format, and PDF export
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HEPExercise } from "@/types/discharge";
import { Dumbbell, Printer, FileDown } from "lucide-react";

interface HEPExportProps {
  exercises: HEPExercise[];
  locale?: string;
  patientName?: string;
  onExportPDF?: () => void;
  className?: string;
}

export function HEPExport({
  exercises,
  locale = "vi",
  patientName,
  onExportPDF,
  className,
}: HEPExportProps) {
  const t = useTranslations("discharge");

  const handlePrint = () => {
    window.print();
  };

  if (exercises.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5" />
            {t("hep.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("hep.noExercises")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5" />
            {t("hep.title")}
          </CardTitle>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              {t("print")}
            </Button>
            {onExportPDF && (
              <Button variant="outline" size="sm" onClick={onExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                {t("export")}
              </Button>
            )}
          </div>
        </div>
        {patientName && (
          <p className="text-sm text-muted-foreground hidden print:block">
            {patientName}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("hep.exercise")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("hep.sets")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("hep.reps")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("hep.duration")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("hep.frequency")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exercises.map((exercise, index) => (
                  <tr key={exercise.id} className="transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {locale === "vi" ? exercise.nameVi : exercise.nameEn}
                        </p>
                        {locale === "vi" && exercise.nameEn && (
                          <p className="text-xs text-muted-foreground">
                            {exercise.nameEn}
                          </p>
                        )}
                        {locale === "en" && exercise.nameVi && (
                          <p className="text-xs text-muted-foreground">
                            {exercise.nameVi}
                          </p>
                        )}
                        {(locale === "vi"
                          ? exercise.instructionsVi
                          : exercise.instructions) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {locale === "vi"
                              ? exercise.instructionsVi
                              : exercise.instructions}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{exercise.sets}</td>
                    <td className="px-4 py-3 text-center">{exercise.reps}</td>
                    <td className="px-4 py-3 text-center">
                      {exercise.duration ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exercise.frequency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
