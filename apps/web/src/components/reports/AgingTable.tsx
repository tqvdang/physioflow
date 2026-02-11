"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type {
  OutstandingPayment,
  AgingBucketSummary,
} from "@/hooks/use-reports";

interface AgingTableProps {
  data: OutstandingPayment[];
  summary: AgingBucketSummary[];
  totalOutstanding: number;
  totalCount: number;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
}

function getBucketColor(bucket: string): string {
  switch (bucket) {
    case "0-30":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "31-60":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "61-90":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "90+":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getBucketBorderColor(bucket: string): string {
  switch (bucket) {
    case "0-30":
      return "border-l-green-500";
    case "31-60":
      return "border-l-yellow-500";
    case "61-90":
      return "border-l-orange-500";
    case "90+":
      return "border-l-red-500";
    default:
      return "border-l-gray-500";
  }
}

export function AgingTable({
  data,
  summary,
  totalOutstanding,
  totalCount,
}: AgingTableProps) {
  const t = useTranslations("reports");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summary.map((bucket) => (
          <Card
            key={bucket.bucket}
            className={`border-l-4 ${getBucketBorderColor(bucket.bucket)}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {bucket.bucket} {t("days")}
                </span>
                <Badge variant="secondary" className={getBucketColor(bucket.bucket)}>
                  {bucket.count}
                </Badge>
              </div>
              <div className="mt-1 text-lg font-bold">
                {formatVND(bucket.totalAmount)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total outstanding */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("totalOutstanding")}
            </p>
            <p className="text-2xl font-bold text-red-600">
              {formatVND(totalOutstanding)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {t("outstandingInvoices")}
            </p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("outstandingDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">{t("invoiceNumber")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("patientName")}</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {t("totalAmount")}
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {t("amountDue")}
                  </th>
                  <th className="pb-2 pr-4 font-medium text-center">
                    {t("daysOutstanding")}
                  </th>
                  <th className="pb-2 font-medium text-center">
                    {t("agingBucket")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t("noOutstandingPayments")}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.invoiceId} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {row.invoiceNumber}
                      </td>
                      <td className="py-3 pr-4">{row.patientName}</td>
                      <td className="py-3 pr-4 text-right">
                        {formatVND(row.totalAmount)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {formatVND(row.amountDue)}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {row.daysOutstanding}
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={getBucketColor(row.agingBucket)}
                        >
                          {row.agingBucket}
                        </Badge>
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
