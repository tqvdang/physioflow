"use client";

/**
 * Discharge planning page for a patient.
 * Provides workflow: create plan -> review outcomes -> generate summary -> complete discharge
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Loader2,
  ClipboardList,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { DischargePlanForm } from "@/components/discharge/DischargePlanForm";
import { OutcomeSummary } from "@/components/discharge/OutcomeSummary";
import { HEPExport } from "@/components/discharge/HEPExport";
import { DischargeSummaryPreview } from "@/components/discharge/DischargeSummaryPreview";
import {
  useDischargePlan,
  useCreateDischargePlan,
  useGenerateSummary,
  usePatientDischargeSummary,
  useCompleteDischarge,
} from "@/hooks/use-discharge";
import { usePatient } from "@/hooks/use-patients";
import { generateDischargePDF } from "@/lib/pdf";
import { downloadPDF } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { CreateDischargePlanRequest } from "@/types/discharge";

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export default function DischargePlanningPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "vi";
  const patientId = params.id as string;
  const t = useTranslations("discharge");
  const tCommon = useTranslations("common");

  // Data fetching
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const {
    data: dischargePlan,
    isLoading: isLoadingPlan,
    error: planError,
  } = useDischargePlan(patientId);
  const {
    data: summary,
    isLoading: isLoadingSummary,
  } = usePatientDischargeSummary(patientId, !!dischargePlan);

  // Mutations
  const createPlan = useCreateDischargePlan();
  const generateSummary = useGenerateSummary();
  const completeDischarge = useCompleteDischarge();

  // State
  const [activeTab, setActiveTab] = React.useState("plan");

  const isLoading = isLoadingPatient || isLoadingPlan;
  const hasPlan = !!dischargePlan;
  const hasSummary = !!summary;
  const isCompleted = dischargePlan?.status === "completed";

  // Handlers
  const handleCreatePlan = async (data: CreateDischargePlanRequest) => {
    try {
      await createPlan.mutateAsync(data);
      toast.success(t("toast.planCreated"));
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleGenerateSummary = async () => {
    try {
      await generateSummary.mutateAsync(patientId);
      toast.success(t("toast.summaryGenerated"));
      setActiveTab("summary");
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleCompleteDischarge = async () => {
    try {
      await completeDischarge.mutateAsync(patientId);
      toast.success(t("toast.dischargeCompleted"));
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleExportHEPPDF = () => {
    if (summary) {
      generateDischargePDF(summary);
    }
  };

  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  const handleExportServerPDF = async () => {
    if (!summary) return;
    setIsExportingPDF(true);
    try {
      await downloadPDF(
        `/v1/reports/discharge/${summary.id}/pdf`,
        undefined,
        { locale }
      );
      toast.success(t("pdfDownloaded"));
    } catch {
      toast.error(t("pdfDownloadError"));
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const displayName =
    patient && locale === "en" && patient.nameEn
      ? patient.nameEn
      : patient?.nameVi ?? "";

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/patients/${patientId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            {patient && (
              <p className="text-sm text-muted-foreground">{displayName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPlan && (
            <Badge
              variant="outline"
              className={
                isCompleted
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }
            >
              {isCompleted ? t("statusCompleted") : t("statusDraft")}
            </Badge>
          )}
        </div>
      </div>

      {/* No plan yet - Show create form */}
      {!hasPlan && !planError && (
        <DischargePlanForm
          patientId={patientId}
          onSubmit={handleCreatePlan}
          isSubmitting={createPlan.isPending}
          locale={locale}
        />
      )}

      {/* Plan error (404 means no plan exists yet, show the form) */}
      {planError && !hasPlan && (
        <DischargePlanForm
          patientId={patientId}
          onSubmit={handleCreatePlan}
          isSubmitting={createPlan.isPending}
          locale={locale}
        />
      )}

      {/* Plan exists - Show tabbed view */}
      {hasPlan && dischargePlan && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plan">
              <ClipboardList className="mr-2 h-4 w-4" />
              {t("plan")}
            </TabsTrigger>
            <TabsTrigger value="outcomes">
              {t("outcomes")}
            </TabsTrigger>
            <TabsTrigger value="summary">
              <FileText className="mr-2 h-4 w-4" />
              {t("summary")}
            </TabsTrigger>
          </TabsList>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-4 space-y-6">
            {/* Plan Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" />
                  {t("planOverview")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("plannedDate")}
                    </p>
                    <p className="font-medium">
                      {formatDate(dischargePlan.plannedDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("totalSessions")}
                    </p>
                    <p className="font-medium">{dischargePlan.totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("therapist")}
                    </p>
                    <p className="font-medium">
                      {dischargePlan.therapistName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("statusLabel")}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        isCompleted
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }
                    >
                      {isCompleted ? t("statusCompleted") : t("statusDraft")}
                    </Badge>
                  </div>
                </div>

                {/* Diagnosis */}
                {(dischargePlan.diagnosisVi || dischargePlan.diagnosis) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("diagnosisLabel")}
                    </p>
                    <p className="text-sm">
                      {locale === "vi"
                        ? dischargePlan.diagnosisVi
                        : dischargePlan.diagnosis}
                    </p>
                  </div>
                )}

                {/* Treatment Summary */}
                {(dischargePlan.treatmentSummaryVi ||
                  dischargePlan.treatmentSummary) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("treatmentSummaryLabel")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {locale === "vi"
                        ? dischargePlan.treatmentSummaryVi
                        : dischargePlan.treatmentSummary}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {(dischargePlan.recommendationsVi ||
                  dischargePlan.recommendations) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("recommendations")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {locale === "vi"
                        ? dischargePlan.recommendationsVi
                        : dischargePlan.recommendations}
                    </p>
                  </div>
                )}

                {/* Follow-up Plan */}
                {dischargePlan.followUpPlan.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("followUp")}
                    </p>
                    <ul className="space-y-2">
                      {dischargePlan.followUpPlan.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 mt-0.5"
                          >
                            {t(`followUpTypes.${item.type}`)}
                          </Badge>
                          <div>
                            <p>
                              {locale === "vi"
                                ? item.descriptionVi
                                : item.description}
                            </p>
                            {item.timeframe && (
                              <p className="text-xs text-muted-foreground">
                                {item.timeframe}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action buttons */}
            {!isCompleted && (
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={handleGenerateSummary}
                  disabled={generateSummary.isPending}
                >
                  {generateSummary.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <FileText className="mr-2 h-4 w-4" />
                  {t("generateSummary")}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={completeDischarge.isPending}
                    >
                      {completeDischarge.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t("complete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("completeDialog.title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("completeDialog.description")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {tCommon("cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleCompleteDischarge}>
                        {t("completeDialog.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </TabsContent>

          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="mt-4 space-y-6">
            <OutcomeSummary
              comparisons={dischargePlan.outcomeComparisons}
              locale={locale}
            />
            <HEPExport
              exercises={dischargePlan.hepExercises}
              locale={locale}
              patientName={displayName}
              onExportPDF={handleExportHEPPDF}
            />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4 space-y-6">
            {isLoadingSummary && (
              <div className="space-y-4">
                <Skeleton className="h-96 w-full rounded-lg" />
              </div>
            )}

            {!isLoadingSummary && hasSummary && summary && (
              <>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportServerPDF}
                    disabled={isExportingPDF}
                  >
                    {isExportingPDF ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {t("exportPDF")}
                  </Button>
                </div>
                <DischargeSummaryPreview summary={summary} locale={locale} />
              </>
            )}

            {!isLoadingSummary && !hasSummary && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t("noSummaryYet")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("noSummaryDescription")}
                  </p>
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={generateSummary.isPending}
                  >
                    {generateSummary.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("generateSummary")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
