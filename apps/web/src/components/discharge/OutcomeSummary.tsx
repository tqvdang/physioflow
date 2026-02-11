"use client";

/**
 * Baseline vs discharge outcome comparison table
 * Displays outcome measure comparisons with visual indicators
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OutcomeComparison } from "@/types/discharge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface OutcomeSummaryProps {
  comparisons: OutcomeComparison[];
  locale?: string;
  className?: string;
}

export function OutcomeSummary({
  comparisons,
  locale = "vi",
  className,
}: OutcomeSummaryProps) {
  const t = useTranslations("discharge");

  if (comparisons.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            {t("baselineVsDischarge")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("noOutcomeData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          {t("baselineVsDischarge")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("measure")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("baseline")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("dischargeValue")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("change")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("improvement")}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t("metMCID")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comparisons.map((c) => {
                  const isImprovement = c.higherIsBetter
                    ? c.change > 0
                    : c.change < 0;
                  const isDecline = c.higherIsBetter
                    ? c.change < 0
                    : c.change > 0;

                  return (
                    <tr key={c.measure} className="transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {locale === "vi" ? c.measureVi : c.measure}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {c.baseline}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {c.discharge}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            isImprovement && "text-green-600",
                            isDecline && "text-red-600",
                            !isImprovement && !isDecline && "text-muted-foreground"
                          )}
                        >
                          {isImprovement ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : isDecline ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : null}
                          {c.change > 0 ? "+" : ""}
                          {c.change}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-medium",
                            c.percentImprovement > 0
                              ? "text-green-600"
                              : c.percentImprovement < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.percentImprovement > 0 ? "+" : ""}
                          {c.percentImprovement.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.metMCID ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            {t("mcidYes")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            {t("mcidNo")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
