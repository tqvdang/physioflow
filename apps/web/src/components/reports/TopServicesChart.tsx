"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { ServiceRevenue } from "@/hooks/use-reports";

interface TopServicesChartProps {
  data: ServiceRevenue[];
  totalRevenue: number;
  totalServices: number;
}

function formatVND(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toFixed(0);
}

function formatFullVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export function TopServicesChart({
  data,
  totalRevenue,
  totalServices,
}: TopServicesChartProps) {
  const t = useTranslations("reports");

  const chartData = data.map((row) => ({
    name: row.serviceName,
    nameVi: row.serviceNameVi,
    code: row.serviceCode,
    revenue: row.totalRevenue,
    quantity: row.quantitySold,
  }));

  const customTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; nameVi: string; code: string; revenue: number; quantity: number };
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="font-medium">{item.nameVi || item.name}</p>
        <p className="text-xs text-muted-foreground">{item.code}</p>
        <p className="mt-1 text-sm">
          {t("revenue")}: {formatFullVND(item.revenue)}
        </p>
        <p className="text-sm">
          {t("quantitySold")}: {item.quantity}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatFullVND(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalServiceRevenue")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {t("servicesTracked")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Horizontal bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("topServicesByRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(350, data.length * 45)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={formatVND}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="code"
                fontSize={12}
                width={70}
              />
              <Tooltip content={customTooltip} />
              <Bar dataKey="revenue" name={t("revenue")} radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("serviceDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">{t("serviceCode")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("serviceName")}</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {t("quantitySold")}
                  </th>
                  <th className="pb-2 font-medium text-right">
                    {t("totalRevenue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.serviceCode} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.rank}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {row.serviceCode}
                    </td>
                    <td className="py-3 pr-4">
                      {row.serviceNameVi || row.serviceName}
                    </td>
                    <td className="py-3 pr-4 text-right">{row.quantitySold}</td>
                    <td className="py-3 text-right font-medium">
                      {formatFullVND(row.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
