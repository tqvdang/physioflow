"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonRow {
  measureLabel: string;
  baselineValue: number;
  currentValue: number;
  change: number;
  changePercentage?: number;
  higherIsBetter: boolean;
  mcidThreshold?: number;
  mcidAchieved: boolean;
  interpretation: "improved" | "declined" | "stable";
}

interface ComparisonTableProps {
  data: ComparisonRow[];
  assessmentType?: "rom" | "mmt" | "outcome_measure";
  showMCID?: boolean;
  className?: string;
}

/**
 * Reusable table component for displaying baseline vs current comparison.
 * Color coding: green for improvement, red for decline, gray for stable.
 * MCID indicators show a checkmark when achieved.
 */
export function ComparisonTable({
  data,
  assessmentType,
  showMCID = true,
  className,
}: ComparisonTableProps) {
  const t = useTranslations("reevaluation");

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noData")}
      </div>
    );
  }

  // Determine the value unit label based on assessment type
  const getUnit = () => {
    switch (assessmentType) {
      case "rom":
        return "\u00B0"; // degree symbol
      case "mmt":
        return "/5";
      default:
        return "";
    }
  };

  const unit = getUnit();

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">{t("measure")}</TableHead>
            <TableHead className="text-center">{t("baseline")}</TableHead>
            <TableHead className="text-center">{t("current")}</TableHead>
            <TableHead className="text-center">{t("change")}</TableHead>
            <TableHead className="text-center">
              {t("interpretation")}
            </TableHead>
            {showMCID && (
              <TableHead className="text-center">{t("mcid")}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {row.measureLabel}
              </TableCell>
              <TableCell className="text-center">
                {row.baselineValue}
                {unit}
              </TableCell>
              <TableCell className="text-center">
                {row.currentValue}
                {unit}
              </TableCell>
              <TableCell className="text-center">
                <ChangeDisplay
                  change={row.change}
                  changePercentage={row.changePercentage}
                  interpretation={row.interpretation}
                  unit={unit}
                />
              </TableCell>
              <TableCell className="text-center">
                <InterpretationBadge interpretation={row.interpretation} />
              </TableCell>
              {showMCID && (
                <TableCell className="text-center">
                  <MCIDIndicator
                    mcidAchieved={row.mcidAchieved}
                    mcidThreshold={row.mcidThreshold}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChangeDisplay({
  change,
  changePercentage,
  interpretation,
  unit,
}: {
  change: number;
  changePercentage?: number;
  interpretation: "improved" | "declined" | "stable";
  unit: string;
}) {
  const colorClass =
    interpretation === "improved"
      ? "text-green-600 dark:text-green-400"
      : interpretation === "declined"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const Icon =
    interpretation === "improved"
      ? ArrowUp
      : interpretation === "declined"
        ? ArrowDown
        : Minus;

  const sign = change > 0 ? "+" : "";
  const pctStr =
    changePercentage !== undefined
      ? ` (${change > 0 ? "+" : ""}${changePercentage.toFixed(1)}%)`
      : "";

  return (
    <span className={cn("inline-flex items-center gap-1", colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      <span>
        {sign}
        {change}
        {unit}
        {pctStr}
      </span>
    </span>
  );
}

function InterpretationBadge({
  interpretation,
}: {
  interpretation: "improved" | "declined" | "stable";
}) {
  const t = useTranslations("reevaluation.comparison");

  const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    improved: "default",
    declined: "destructive",
    stable: "secondary",
  };

  return (
    <Badge variant={variants[interpretation] ?? "outline"}>
      {t(interpretation)}
    </Badge>
  );
}

function MCIDIndicator({
  mcidAchieved,
  mcidThreshold,
}: {
  mcidAchieved: boolean;
  mcidThreshold?: number;
}) {
  const t = useTranslations("reevaluation");

  if (mcidThreshold === undefined || mcidThreshold === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (mcidAchieved) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">{t("mcidYes")}</span>
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">{t("mcidNo")}</span>
  );
}
