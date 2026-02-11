"use client";

/**
 * Trending view displaying a table and chart of outcome measure scores
 * across treatment phases (baseline, interim, discharge).
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TrendingRow, MeasureDefinition } from "@/hooks/use-outcome-measures";

interface TrendingViewProps {
  rows: TrendingRow[];
  definition: MeasureDefinition;
}

/**
 * Badge color per phase
 */
function phaseBadgeVariant(phase: string): "default" | "secondary" | "outline" {
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

interface TrendChartPoint {
  dateLabel: string;
  score: number;
  phase: string;
}

export function TrendingView({ rows, definition }: TrendingViewProps) {
  const t = useTranslations("outcomes");

  const chartData: TrendChartPoint[] = React.useMemo(
    () =>
      rows.map((row) => ({
        dateLabel: format(new Date(row.date), "dd/MM/yy"),
        score: row.score,
        phase: row.phase,
      })),
    [rows]
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("trending")}</CardTitle>
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
        <CardTitle className="text-base">{t("trending")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                  {t("date")}
                </th>
                <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                  {t("score")}
                </th>
                <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                  {t("phaseLabel")}
                </th>
                <th className="py-2 text-left font-medium text-muted-foreground">
                  {t("changeFromBaseline")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isImproved =
                  row.changeFromBaseline !== null
                    ? definition.higherIsBetter
                      ? row.changeFromBaseline > 0
                      : row.changeFromBaseline < 0
                    : false;
                const changeSign =
                  row.changeFromBaseline !== null && row.changeFromBaseline > 0 ? "+" : "";

                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      {format(new Date(row.date), "dd/MM/yyyy")}
                    </td>
                    <td className="py-2 pr-4 font-medium">{row.score}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={phaseBadgeVariant(row.phase)}>
                        {t(`phase.${row.phase}`)}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {row.changeFromBaseline !== null ? (
                        <span
                          className={
                            isImproved
                              ? "text-green-600 font-medium"
                              : row.changeFromBaseline !== 0
                                ? "text-red-600 font-medium"
                                : "text-muted-foreground"
                          }
                        >
                          {changeSign}
                          {row.changeFromBaseline}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[definition.minScore, definition.maxScore]}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: "12px",
              }}
            />
            {/* MCID reference from baseline */}
            {(() => {
              const firstRow = rows[0];
              if (!firstRow || firstRow.phase !== "baseline") return null;
              const mcidY = definition.higherIsBetter
                ? firstRow.score + definition.mcid
                : firstRow.score - definition.mcid;
              return (
                <ReferenceLine
                  y={mcidY}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "MCID", position: "insideTopRight", fontSize: 10 }}
                />
              );
            })()}
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
              name={t("score")}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
