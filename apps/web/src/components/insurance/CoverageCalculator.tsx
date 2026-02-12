"use client";

/**
 * Coverage Calculator Component
 * Calculates and displays insurance coverage preview in real-time
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useCalculateCoverage,
  BHYT_PREFIX_CODES,
  type Insurance,
} from "@/hooks/use-insurance";

/**
 * Format number as Vietnamese currency (VND)
 */
function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CoverageCalculatorProps {
  patientId: string;
  insurance?: Insurance | null;
}

export function CoverageCalculator({
  patientId,
  insurance,
}: CoverageCalculatorProps) {
  const t = useTranslations("insurance");
  const [inputValue, setInputValue] = React.useState("");
  const [totalAmount, setTotalAmount] = React.useState(0);

  // Debounce the amount for API query
  const [debouncedAmount, setDebouncedAmount] = React.useState(0);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(totalAmount);
    }, 300);
    return () => clearTimeout(timer);
  }, [totalAmount]);

  // Fetch coverage from API (or calculate locally if unavailable)
  const { data: apiCoverage } = useCalculateCoverage(patientId, debouncedAmount);

  // Local calculation fallback using insurance data
  const localCoverage = React.useMemo(() => {
    if (!insurance || totalAmount <= 0) {
      return {
        totalAmount,
        coveragePercent: 0,
        copayRate: 100,
        insurancePays: 0,
        patientPays: totalAmount,
      };
    }

    // Get coverage from prefix code
    const prefixData = BHYT_PREFIX_CODES.find((p) => p.value === insurance.prefixCode);
    const coveragePercent = prefixData?.coverage ?? 80;
    const copayRate = 100 - coveragePercent;
    const insurancePays = Math.round((totalAmount * coveragePercent) / 100);
    const patientPays = totalAmount - insurancePays;

    return {
      totalAmount,
      coveragePercent,
      copayRate,
      insurancePays,
      patientPays,
    };
  }, [insurance, totalAmount]);

  // Use API result if available, otherwise fall back to local
  const coverage = apiCoverage ?? localCoverage;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setInputValue(raw);
    setTotalAmount(Number(raw) || 0);
  };

  const hasInsurance = insurance && insurance.isActive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {t("calculator.title")}
        </CardTitle>
        <CardDescription>{t("calculator.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="total-amount">{t("calculator.totalAmount")}</Label>
          <div className="relative">
            <Input
              id="total-amount"
              type="text"
              inputMode="numeric"
              value={inputValue ? Number(inputValue).toLocaleString("vi-VN") : ""}
              onChange={handleAmountChange}
              placeholder="0"
              className="pr-16 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              VND
            </span>
          </div>
        </div>

        {/* Coverage Breakdown */}
        {totalAmount > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            {/* Coverage percent bar */}
            {hasInsurance && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("card.coverage")}
                  </span>
                  <span className="font-medium">{coverage.coveragePercent}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${coverage.coveragePercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Amounts */}
            <div className="space-y-2 pt-1">
              {/* Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("calculator.totalAmount")}
                </span>
                <span className="font-mono">{formatVND(totalAmount)}</span>
              </div>

              {/* Insurance Pays */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("calculator.insurancePays")}
                </span>
                <span className="font-mono text-green-600 font-medium">
                  {hasInsurance
                    ? `- ${formatVND(coverage.insurancePays)}`
                    : formatVND(0)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Patient Pays */}
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {t("calculator.patientPays")}
                </span>
                <span className="font-mono text-lg font-bold">
                  {formatVND(coverage.patientPays)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No insurance notice */}
        {!hasInsurance && totalAmount > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("calculator.noInsurance")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
