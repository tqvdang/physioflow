"use client";

/**
 * Progress chart showing outcome measure scores over time.
 * Plots data points, baseline, target, and MCID reference line.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgressSummary, MeasureDefinition } from "@/hooks/use-outcome-measures";

interface ProgressChartProps {
  progress: ProgressSummary;
  definition: MeasureDefinition;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  score: number;
  baseline: number | null;
  target: number | null;
}

export function ProgressChart({ progress, definition }: ProgressChartProps) {
  const t = useTranslations("outcomes");

  // Build chart data from progress data points
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    return progress.dataPoints.map((dp) => ({
      date: dp.date,
      dateLabel: format(new Date(dp.date), "dd/MM/yy"),
      score: dp.score,
      baseline: progress.baseline,
      target: progress.target,
    }));
  }, [progress.dataPoints, progress.baseline, progress.target]);

  // Calculate MCID threshold line position
  const mcidThreshold = React.useMemo(() => {
    if (progress.baseline === null) return null;
    return definition.higherIsBetter
      ? progress.baseline + definition.mcid
      : progress.baseline - definition.mcid;
  }, [progress.baseline, definition]);

  // Determine Y-axis domain
  const yDomain = React.useMemo(() => {
    const scores = progress.dataPoints.map((dp) => dp.score);
    if (progress.baseline !== null) scores.push(progress.baseline);
    if (progress.target !== null) scores.push(progress.target);
    if (mcidThreshold !== null) scores.push(mcidThreshold);

    const min = Math.min(definition.minScore, ...scores);
    const max = Math.max(definition.maxScore, ...scores);
    // Add some padding
    return [Math.max(definition.minScore, min - 2), Math.min(definition.maxScore, max + 2)];
  }, [progress, definition, mcidThreshold]);

  const changeSign =
    progress.changeFromBaseline !== null
      ? progress.changeFromBaseline > 0
        ? "+"
        : ""
      : "";

  const isImproved =
    progress.changeFromBaseline !== null
      ? definition.higherIsBetter
        ? progress.changeFromBaseline > 0
        : progress.changeFromBaseline < 0
      : false;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("progress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("progress")}</CardTitle>
          <div className="flex items-center gap-2">
            {progress.mcidAchieved && (
              <Badge variant="default" className="bg-green-600">
                {t("mcidAchieved")}
              </Badge>
            )}
            {!progress.mcidAchieved && progress.changeFromBaseline !== null && (
              <Badge variant="outline">{t("mcidNotYet")}</Badge>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("baseline")}</p>
            <p className="text-lg font-semibold">
              {progress.baseline !== null ? progress.baseline : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("current")}</p>
            <p className="text-lg font-semibold">
              {progress.current !== null ? progress.current : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("target")}</p>
            <p className="text-lg font-semibold">
              {progress.target !== null ? progress.target : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("change")}</p>
            <p
              className={`text-lg font-semibold ${
                isImproved ? "text-green-600" : progress.changeFromBaseline !== null ? "text-red-600" : ""
              }`}
            >
              {progress.changeFromBaseline !== null
                ? `${changeSign}${progress.changeFromBaseline}`
                : "--"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: "12px",
              }}
              labelStyle={{ fontWeight: "bold" }}
            />
            <Legend />

            {/* Baseline reference line */}
            {progress.baseline !== null && (
              <ReferenceLine
                y={progress.baseline}
                stroke="#3b82f6"
                strokeDasharray="3 3"
                label={{ value: t("baseline"), position: "insideTopRight", fontSize: 11 }}
              />
            )}

            {/* Target reference line */}
            {progress.target !== null && (
              <ReferenceLine
                y={progress.target}
                stroke="#eab308"
                strokeDasharray="3 3"
                label={{ value: t("target"), position: "insideTopRight", fontSize: 11 }}
              />
            )}

            {/* MCID threshold line */}
            {mcidThreshold !== null && (
              <ReferenceLine
                y={mcidThreshold}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: "MCID", position: "insideBottomRight", fontSize: 11 }}
              />
            )}

            {/* Score line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: "#10b981" }}
              activeDot={{ r: 6 }}
              name={t("score")}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
