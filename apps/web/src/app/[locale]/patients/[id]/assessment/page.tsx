"use client";

/**
 * ROM/MMT Assessment page for a patient.
 * Displays forms for recording Range of Motion and Manual Muscle Testing,
 * plus a tabbed history view with trend indicators.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROMForm } from "@/components/assessment/ROMForm";
import { MMTForm } from "@/components/assessment/MMTForm";
import { ROMMMTHistory } from "@/components/assessment/ROMMMTHistory";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const locale = (params.locale as string) ?? "vi";

  const t = useTranslations("assessment");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/patients/${patientId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("rom.title")} / {t("mmt.title")}</h1>
        </div>
      </div>

      {/* ROM Form */}
      <ROMForm patientId={patientId} />

      {/* MMT Form */}
      <MMTForm patientId={patientId} />

      {/* History */}
      <ROMMMTHistory patientId={patientId} />
    </div>
  );
}
