"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  usePatientTestResults,
  type SpecialTestResult as TestResultType,
  type TestResult,
} from "@/hooks/use-special-tests";

function getResultVariant(result: TestResult): "default" | "secondary" | "destructive" | "outline" {
  switch (result) {
    case "positive":
      return "destructive";
    case "negative":
      return "default";
    case "inconclusive":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface SpecialTestHistoryProps {
  patientId: string;
}

export function SpecialTestHistory({ patientId }: SpecialTestHistoryProps) {
  const t = useTranslations("specialTests");
  const { data: results, isLoading } = usePatientTestResults(patientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("history.noResults")}</p>
        </CardContent>
      </Card>
    );
  }

  // Group results by date (day)
  const groupedByDate = results.reduce<Record<string, TestResultType[]>>((acc, result) => {
    const dateKey = new Date(result.assessedAt).toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(result);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("history.totalTests", { count: results.length })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateKey, dateResults]) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h4 className="text-sm font-medium">{dateKey}</h4>
              </div>

              {/* Results for this date */}
              <div className="ml-3 border-l-2 border-muted pl-4 space-y-3">
                {dateResults.map((result) => (
                  <SpecialTestHistoryItem key={result.id} result={result} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SpecialTestHistoryItemProps {
  result: TestResultType;
}

function SpecialTestHistoryItem({ result }: SpecialTestHistoryItemProps) {
  const t = useTranslations("specialTests");

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{result.testName || result.specialTestId}</span>
            {result.testCategory && (
              <Badge variant="outline" className="text-xs">
                {t(`categories.${result.testCategory}`)}
              </Badge>
            )}
          </div>
          {result.testNameVi && (
            <p className="text-xs text-muted-foreground mb-1">{result.testNameVi}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(result.assessedAt)}</p>
        </div>
        <Badge variant={getResultVariant(result.result)}>
          {t(`results.${result.result}`)}
        </Badge>
      </div>

      {result.notes && (
        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{result.notes}</p>
      )}
    </div>
  );
}

export default SpecialTestHistory;
