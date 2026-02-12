"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { AgingTable } from "@/components/reports/AgingTable";
import { TopServicesChart } from "@/components/reports/TopServicesChart";
import { ProductivityTable } from "@/components/reports/ProductivityTable";
import {
  useRevenueReport,
  useAgingReport,
  useServicesReport,
  useProductivityReport,
  useExportReport,
  useRefreshViews,
} from "@/hooks/use-reports";
import type {
  ReportPeriod,
  FinancialReportType,
  ReportFilters,
} from "@/hooks/use-reports";

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0] || "";
  const start = new Date(now);
  start.setMonth(start.getMonth() - 6);
  const startDate = start.toISOString().split("T")[0] || "";
  return { startDate, endDate };
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const defaults = getDefaultDateRange();

  const [activeTab, setActiveTab] = useState<FinancialReportType>("revenue");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [servicesLimit, setServicesLimit] = useState(10);

  const filters: ReportFilters = {
    startDate,
    endDate,
    period,
    limit: servicesLimit,
  };

  // Queries
  const revenueQuery = useRevenueReport(filters, activeTab === "revenue");
  const agingQuery = useAgingReport({}, activeTab === "outstanding");
  const servicesQuery = useServicesReport(
    { limit: servicesLimit },
    activeTab === "services"
  );
  const productivityQuery = useProductivityReport(
    { startDate, endDate },
    activeTab === "productivity"
  );

  // Mutations
  const exportMutation = useExportReport();
  const refreshMutation = useRefreshViews();

  const handleExport = useCallback(() => {
    exportMutation.mutate({
      reportType: activeTab,
      filters,
    });
  }, [activeTab, filters, exportMutation]);

  const handleRefresh = useCallback(() => {
    refreshMutation.mutate();
  }, [refreshMutation]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? t("refreshing") : t("refreshData")}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? t("exporting") : t("exportCSV")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <Label htmlFor="startDate">{t("startDate")}</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">{t("endDate")}</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          {activeTab === "revenue" && (
            <div className="space-y-1">
              <Label>{t("period")}</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as ReportPeriod)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("daily")}</SelectItem>
                  <SelectItem value="weekly">{t("weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("monthly")}</SelectItem>
                  <SelectItem value="yearly">{t("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {activeTab === "services" && (
            <div className="space-y-1">
              <Label>{t("topN")}</Label>
              <Select
                value={String(servicesLimit)}
                onValueChange={(v) => setServicesLimit(Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FinancialReportType)}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">{t("revenueTab")}</TabsTrigger>
          <TabsTrigger value="outstanding">{t("outstandingTab")}</TabsTrigger>
          <TabsTrigger value="services">{t("servicesTab")}</TabsTrigger>
          <TabsTrigger value="productivity">
            {t("productivityTab")}
          </TabsTrigger>
        </TabsList>

        {/* Revenue */}
        <TabsContent value="revenue">
          {revenueQuery.isLoading ? (
            <ReportSkeleton />
          ) : revenueQuery.isError ? (
            <ReportError message={t("errorLoadingRevenue")} />
          ) : revenueQuery.data ? (
            <RevenueChart
              data={revenueQuery.data.data}
              totalRevenue={revenueQuery.data.totalRevenue}
              totalInvoices={revenueQuery.data.totalInvoices}
            />
          ) : null}
        </TabsContent>

        {/* Outstanding */}
        <TabsContent value="outstanding">
          {agingQuery.isLoading ? (
            <ReportSkeleton />
          ) : agingQuery.isError ? (
            <ReportError message={t("errorLoadingAging")} />
          ) : agingQuery.data ? (
            <AgingTable
              data={agingQuery.data.data}
              summary={agingQuery.data.summary}
              totalOutstanding={agingQuery.data.totalOutstanding}
              totalCount={agingQuery.data.totalCount}
            />
          ) : null}
        </TabsContent>

        {/* Services */}
        <TabsContent value="services">
          {servicesQuery.isLoading ? (
            <ReportSkeleton />
          ) : servicesQuery.isError ? (
            <ReportError message={t("errorLoadingServices")} />
          ) : servicesQuery.data ? (
            <TopServicesChart
              data={servicesQuery.data.data}
              totalRevenue={servicesQuery.data.totalRevenue}
              totalServices={servicesQuery.data.totalServices}
            />
          ) : null}
        </TabsContent>

        {/* Productivity */}
        <TabsContent value="productivity">
          {productivityQuery.isLoading ? (
            <ReportSkeleton />
          ) : productivityQuery.isError ? (
            <ReportError message={t("errorLoadingProductivity")} />
          ) : productivityQuery.data ? (
            <ProductivityTable
              data={productivityQuery.data.data}
              totalSessions={productivityQuery.data.totalSessions}
              totalRevenue={productivityQuery.data.totalRevenue}
              avgRevenuePerSession={
                productivityQuery.data.avgRevenuePerSession
              }
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function ReportError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
