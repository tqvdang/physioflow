"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import type { RevenueByPeriod } from "@/hooks/use-reports";

interface RevenueChartProps {
  data: RevenueByPeriod[];
  totalRevenue: number;
  totalInvoices: number;
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
}

export function RevenueChart({
  data,
  totalRevenue,
  totalInvoices,
}: RevenueChartProps) {
  const t = useTranslations("reports");

  const chartData = data.map((row) => ({
    date: formatDate(row.date),
    totalRevenue: row.totalRevenue,
    insuranceRevenue: row.insuranceRevenue,
    cashRevenue: row.cashRevenue,
    invoiceCount: row.invoiceCount,
  }));

  const customTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatFullVND(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatFullVND(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalRevenue")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {t("totalInvoices")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList>
          <TabsTrigger value="trend">{t("revenueTrend")}</TabsTrigger>
          <TabsTrigger value="breakdown">{t("revenueBreakdown")}</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("revenueTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    tickFormatter={formatVND}
                    fontSize={12}
                    width={60}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    name={t("totalRevenue")}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="insuranceRevenue"
                    name={t("insuranceRevenue")}
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cashRevenue"
                    name={t("cashRevenue")}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("revenueBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    tickFormatter={formatVND}
                    fontSize={12}
                    width={60}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  <Bar
                    dataKey="insuranceRevenue"
                    name={t("insuranceRevenue")}
                    fill="#16a34a"
                    stackId="revenue"
                  />
                  <Bar
                    dataKey="cashRevenue"
                    name={t("cashRevenue")}
                    fill="#f59e0b"
                    stackId="revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
