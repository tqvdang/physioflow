"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { TherapistProductivity } from "@/hooks/use-reports";

interface ProductivityTableProps {
  data: TherapistProductivity[];
  totalSessions: number;
  totalRevenue: number;
  avgRevenuePerSession: number;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
}

export function ProductivityTable({
  data,
  totalSessions,
  totalRevenue,
  avgRevenuePerSession,
}: ProductivityTableProps) {
  const t = useTranslations("reports");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalSessions")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatVND(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalRevenue")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatVND(avgRevenuePerSession)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("avgRevenuePerSession")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("therapistProductivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">
                    {t("therapistName")}
                  </th>
                  <th className="pb-2 pr-4 font-medium">{t("period")}</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {t("sessions")}
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {t("totalRevenue")}
                  </th>
                  <th className="pb-2 font-medium text-right">
                    {t("avgPerSession")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t("noProductivityData")}
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={`${row.therapistId}-${row.period}-${index}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {row.therapistName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.period}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {row.sessionCount}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatVND(row.totalRevenue)}
                      </td>
                      <td className="py-3 text-right">
                        {formatVND(row.avgRevenuePerSession)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
