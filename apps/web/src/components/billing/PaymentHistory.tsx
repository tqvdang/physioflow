"use client";

/**
 * PaymentHistory - Table showing payment history for a patient
 * Supports date range filtering and payment method/status display
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Calendar as CalendarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentHistory } from "@/hooks/use-billing";
import { formatVND } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@/types/billing";

interface PaymentHistoryProps {
  patientId: string;
}

/**
 * Badge for payment status
 */
function PaymentStatusBadge({ status, t }: { status: PaymentStatus; t: (key: string) => string }) {
  const variants: Record<PaymentStatus, { className: string }> = {
    completed: { className: "bg-green-100 text-green-800 border-green-200" },
    refunded: { className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    failed: { className: "bg-red-100 text-red-800 border-red-200" },
  };

  const config = variants[status] ?? variants.completed;

  return (
    <Badge variant="outline" className={config.className}>
      {t(`paymentStatus.${status}`)}
    </Badge>
  );
}

/**
 * Payment method display label
 */
function PaymentMethodLabel({ method, t }: { method: PaymentMethod; t: (key: string) => string }) {
  return (
    <span className="text-sm">{t(`paymentMethod.${method}`)}</span>
  );
}

export function PaymentHistory({ patientId }: PaymentHistoryProps) {
  const t = useTranslations("billing");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const { data: payments, isLoading } = usePaymentHistory(
    patientId,
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }
  );

  // Filter payments by date range (client-side if API doesn't filter)
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    let filtered = payments;

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (p) => new Date(p.paymentDate) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (p) => new Date(p.paymentDate) <= end
      );
    }

    return filtered;
  }, [payments, startDate, endDate]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">{t("paymentHistory")}</CardTitle>

          {/* Date range filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 h-8 text-sm"
                placeholder={t("startDate")}
              />
              <span className="text-muted-foreground text-sm">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 h-8 text-sm"
                placeholder={t("endDate")}
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("noPayments")}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("date")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("invoiceNumber")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("amount")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("paymentMethodLabel")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("statusLabel")}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("reference")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {formatDate(payment.paymentDate, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {payment.invoiceNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatVND(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentMethodLabel method={payment.paymentMethod} t={t} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={payment.status} t={t} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {payment.transactionReference ?? payment.receiptNumber ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredPayments.length > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="text-sm text-muted-foreground">
              {t("totalPayments")}:{" "}
              <span className="font-semibold text-foreground">
                {formatVND(
                  filteredPayments
                    .filter((p) => p.status === "completed")
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
