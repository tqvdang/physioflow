"use client";

/**
 * Edit Patient Page
 * Uses the shared PatientForm component with pre-populated data
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PatientForm,
  PatientFormValues,
  transformToApiFormat,
} from "@/components/patient/PatientForm";
import { api } from "@/lib/api";

// API Patient type (snake_case from backend)
interface ApiPatient {
  id: string;
  clinic_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  first_name_vi?: string;
  last_name_vi?: string;
  full_name: string;
  full_name_vi?: string;
  date_of_birth: string;
  age: number;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  phone?: string;
  email?: string;
  address?: string;
  address_vi?: string;
  language_preference: "vi" | "en";
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_alerts?: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Loading skeleton for edit page
 */
function EditPatientSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl space-y-6">
      <Skeleton className="h-10 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[150px] w-full rounded-lg" />
    </div>
  );
}

/**
 * Transform API patient data to form values
 */
function transformToFormValues(patient: ApiPatient): Partial<PatientFormValues> {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    first_name_vi: patient.first_name_vi ?? "",
    last_name_vi: patient.last_name_vi ?? "",
    date_of_birth: new Date(patient.date_of_birth),
    gender: patient.gender,
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    address_vi: patient.address_vi ?? "",
    language_preference: patient.language_preference ?? "vi",
    emergency_contact_name: patient.emergency_contact?.name ?? "",
    emergency_contact_phone: patient.emergency_contact?.phone ?? "",
    emergency_contact_relationship: patient.emergency_contact?.relationship ?? "",
    medical_alerts: patient.medical_alerts ?? [],
    notes: patient.notes ?? "",
    is_active: patient.is_active,
  };
}

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const patientId = params.id as string;
  const t = useTranslations();

  const [patient, setPatient] = React.useState<ApiPatient | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);

  // Fetch patient data
  React.useEffect(() => {
    async function fetchPatient() {
      try {
        const response = await api.get<ApiPatient>(`/v1/patients/${patientId}`);
        setPatient(response.data);
      } catch (err) {
        console.error("Failed to fetch patient:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const handleSubmit = async (data: PatientFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const apiData = transformToApiFormat(data);
      await api.put(`/v1/patients/${patientId}`, apiData);

      // Redirect to patient detail page
      router.push(`/patients/${patientId}`);
    } catch (err) {
      console.error("Failed to update patient:", err);
      setError(t("common.error"));
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/patients/${patientId}`);
  };

  // Loading state
  if (isLoading) {
    return <EditPatientSkeleton />;
  }

  // Not found state
  if (notFound || !patient) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {t("patientForm.notFound")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("patientForm.notFoundDescription")}
        </p>
        <Button onClick={() => router.push("/patients")}>
          {t("patientForm.backToList")}
        </Button>
      </div>
    );
  }

  // Get display name
  const displayName = patient.full_name_vi || patient.full_name;

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/patients/${patientId}`)}
          className="mb-4 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("patientDetail.back")}
        </Button>
        <h1 className="text-2xl font-bold">
          {t("patientForm.titleEdit")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("patientForm.updateDescription", { name: displayName })}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          MRN: {patient.mrn}
        </p>
      </div>

      {/* Form */}
      <PatientForm
        mode="edit"
        defaultValues={transformToFormValues(patient)}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        error={error}
        locale={locale as "vi" | "en"}
      />
    </div>
  );
}
