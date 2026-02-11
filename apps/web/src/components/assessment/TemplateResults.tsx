"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  usePatientAssessmentResults,
  type AssessmentResult,
} from "@/hooks/use-assessment-templates";

interface TemplateResultsProps {
  patientId: string;
  locale?: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function ResultCard({
  result,
  locale,
  t,
}: {
  result: AssessmentResult;
  locale: string;
  t: (key: string) => string;
}) {
  const isVi = locale === "vi";
  const templateName = isVi
    ? result.templateNameVi || result.templateName
    : result.templateName || result.templateNameVi;

  const resultEntries = Object.entries(result.results || {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {templateName || t("untitledAssessment")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(result.assessedAt)}
            </p>
          </div>
          {result.templateCondition && (
            <Badge variant="secondary">
              {result.templateCondition.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resultEntries.slice(0, 5).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-start text-sm border-b border-border/50 pb-1"
            >
              <span className="text-muted-foreground truncate mr-2 max-w-[50%]">
                {key}
              </span>
              <span className="font-medium text-right max-w-[50%]">
                {formatValue(value)}
              </span>
            </div>
          ))}
          {resultEntries.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{resultEntries.length - 5} {t("moreItems")}
            </p>
          )}
        </div>
        {result.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">{t("notes")}:</p>
            <p className="text-sm mt-1">{result.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  return String(value);
}

export function TemplateResults({ patientId, locale = "en" }: TemplateResultsProps) {
  const t = useTranslations("assessmentTemplates");
  const { data: results, isLoading } = usePatientAssessmentResults(patientId);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noResults")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t("resultsTitle")} ({results.length})
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            locale={locale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
