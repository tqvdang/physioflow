"use client";

/**
 * List of outcome measurements for a patient.
 * Displays each measurement with date, type, score, phase, and edit/delete actions.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Pencil, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type OutcomeMeasurement,
  usePatientMeasures,
} from "@/hooks/use-outcome-measures";
import { MeasureEditDialog } from "./MeasureEditDialog";
import { MeasureDeleteButton } from "./MeasureDeleteButton";

interface MeasureListProps {
  /** Patient ID to fetch measurements for */
  patientId: string;
}

/**
 * Badge variant based on phase
 */
function phaseBadgeVariant(
  phase: string
): "default" | "secondary" | "outline" {
  switch (phase) {
    case "baseline":
      return "secondary";
    case "interim":
      return "outline";
    case "discharge":
      return "default";
    default:
      return "outline";
  }
}

export function MeasureList({ patientId }: MeasureListProps) {
  const t = useTranslations("outcomes");
  const tMeasures = useTranslations("outcomeMeasures");

  const { data: measurements, isLoading, error } = usePatientMeasures(patientId);

  const [editingMeasure, setEditingMeasure] =
    React.useState<OutcomeMeasurement | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (!measurements || measurements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by date descending (most recent first)
  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                    {t("date")}
                  </th>
                  <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                    {t("measureType")}
                  </th>
                  <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                    {t("score")}
                  </th>
                  <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                    {t("phaseLabel")}
                  </th>
                  <th className="py-2 text-right font-medium text-muted-foreground">
                    {tMeasures("edit")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((measure) => (
                  <tr
                    key={measure.id}
                    className="border-b last:border-0"
                  >
                    <td className="py-2 pr-4">
                      {format(new Date(measure.date), "dd/MM/yyyy")}
                    </td>
                    <td className="py-2 pr-4">
                      {t(`measures.${measure.measureType}`)}
                    </td>
                    <td className="py-2 pr-4 font-medium">{measure.score}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={phaseBadgeVariant(measure.phase)}>
                        {t(`phase.${measure.phase}`)}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingMeasure(measure)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">
                            {tMeasures("editMeasure")}
                          </span>
                        </Button>
                        <MeasureDeleteButton
                          measureId={measure.id}
                          patientId={patientId}
                          measureName={t(`measures.${measure.measureType}`)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingMeasure && (
        <MeasureEditDialog
          measure={editingMeasure}
          open={!!editingMeasure}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingMeasure(null);
          }}
          patientId={patientId}
        />
      )}
    </>
  );
}
