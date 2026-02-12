"use client";

/**
 * New Patient Page
 * Uses the shared PatientForm component
 */

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PatientForm,
  PatientFormValues,
  transformToApiFormat,
} from "@/components/patient/PatientForm";
import { api } from "@/lib/api";

export default function NewPatientPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: PatientFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const apiData = transformToApiFormat(data);
      const response = await api.post<{ id: string }>("/v1/patients", apiData);

      // Redirect to patient detail page
      router.push(`/patients/${response.data.id}`);
    } catch (err) {
      console.error("Failed to create patient:", err);
      setError(t("common.error"));
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/patients");
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/patients")}
          className="mb-4 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("patientDetail.back")}
        </Button>
        <h1 className="text-2xl font-bold">
          {t("patientForm.titleNew")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("patientForm.description")}
        </p>
      </div>

      {/* Form */}
      <PatientForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        error={error}
        locale={locale as "vi" | "en"}
      />
    </div>
  );
}
