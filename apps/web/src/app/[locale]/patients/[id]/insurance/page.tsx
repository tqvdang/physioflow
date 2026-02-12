"use client";

/**
 * Patient Insurance Management Page
 * Displays insurance card details and allows adding/editing BHYT cards
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Edit,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/hooks/use-patients";
import {
  usePatientInsurance,
  useCreateInsurance,
  useUpdateInsurance,
  BHYT_PREFIX_CODES,
  type InsuranceFormData,
} from "@/hooks/use-insurance";
import { InsuranceCardForm } from "@/components/insurance/InsuranceCardForm";
import { InsuranceValidator } from "@/components/insurance/InsuranceValidator";
import { CoverageCalculator } from "@/components/insurance/CoverageCalculator";

/**
 * Loading skeleton for insurance page
 */
function InsurancePageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function PatientInsurancePage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const patientId = params.id as string;
  const t = useTranslations("insurance");
  const tCommon = useTranslations("common");

  const [isEditing, setIsEditing] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Fetch patient and insurance data
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const {
    data: insurance,
    isLoading: isLoadingInsurance,
    error: insuranceError,
  } = usePatientInsurance(patientId);

  const createMutation = useCreateInsurance();
  const updateMutation = useUpdateInsurance();

  const isLoading = isLoadingPatient || isLoadingInsurance;
  const hasInsurance = !!insurance && !insuranceError;
  const formMode = hasInsurance && isEditing ? "edit" : "create";

  const handleSubmit = async (data: InsuranceFormData) => {
    setFormError(null);

    try {
      if (hasInsurance) {
        await updateMutation.mutateAsync({ patientId, data });
      } else {
        await createMutation.mutateAsync({ patientId, data });
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save insurance:", err);
      setFormError(tCommon("error"));
    }
  };

  const handleCancel = () => {
    if (hasInsurance) {
      setIsEditing(false);
    } else {
      router.push(`/patients/${patientId}`);
    }
  };

  if (isLoading) {
    return <InsurancePageSkeleton />;
  }

  // Patient not found
  if (!patient) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("patientNotFound")}</h1>
        <Link href={"/patients"}>
          <Button>{t("backToPatients")}</Button>
        </Link>
      </div>
    );
  }

  const displayName =
    locale === "en" && patient.nameEn ? patient.nameEn : patient.nameVi;

  // Determine insurance status details
  const isExpired =
    insurance?.validTo && new Date(insurance.validTo) < new Date();
  const isActive = insurance?.isActive && !isExpired;
  const prefixInfo = insurance
    ? BHYT_PREFIX_CODES.find((p) => p.value === insurance.prefixCode)
    : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/patients/${patientId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={"/patients"}
              className="hover:text-foreground transition-colors"
            >
              {t("breadcrumb.patients")}
            </Link>
            <span>/</span>
            <Link
              href={`/patients/${patientId}`}
              className="hover:text-foreground transition-colors"
            >
              {displayName}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t("title")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Insurance Card Details */}
        <div className="space-y-6">
          {hasInsurance ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t("card.title")}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("status.active")}
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {t("status.expired")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {t("status.inactive")}
                      </Badge>
                    )}
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t("actions.edit")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card Number */}
                <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("card.number")}
                  </p>
                  <p className="text-xl font-mono font-bold tracking-wider">
                    {insurance.cardNumber}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("card.prefix")}
                    </p>
                    <p className="font-medium">
                      {prefixInfo?.label ?? insurance.prefixCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("card.coverage")}
                    </p>
                    <p className="font-medium text-lg">
                      {insurance.coveragePercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("card.validFrom")}
                    </p>
                    <p className="font-medium">
                      {formatDate(insurance.validFrom, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("card.validTo")}
                    </p>
                    <p
                      className={cn(
                        "font-medium",
                        isExpired && "text-red-600"
                      )}
                    >
                      {insurance.validTo
                        ? formatDate(insurance.validTo, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("card.copay")}
                    </p>
                    <p className="font-medium">{insurance.copayRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("status.verification")}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        insurance.verification === "verified" &&
                          "bg-green-50 text-green-700 border-green-200",
                        insurance.verification === "pending" &&
                          "bg-yellow-50 text-yellow-700 border-yellow-200",
                        insurance.verification === "failed" &&
                          "bg-red-50 text-red-700 border-red-200"
                      )}
                    >
                      {t(`status.${insurance.verification}`)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t("noInsurance.title")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("noInsurance.description")}
                </p>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("actions.add")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validator */}
          <InsuranceValidator />
        </div>

        {/* Right Column: Form + Calculator */}
        <div className="space-y-6">
          {/* Show form when editing or creating */}
          {(isEditing || !hasInsurance) && (
            <InsuranceCardForm
              mode={formMode}
              defaultValues={hasInsurance ? insurance : undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={
                createMutation.isPending || updateMutation.isPending
              }
              error={formError}
              locale={locale as "vi" | "en"}
            />
          )}

          {/* Coverage Calculator */}
          <CoverageCalculator
            patientId={patientId}
            insurance={hasInsurance ? insurance : null}
          />
        </div>
      </div>
    </div>
  );
}
