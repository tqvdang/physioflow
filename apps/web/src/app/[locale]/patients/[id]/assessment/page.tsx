"use client";

/**
 * Assessment page for a patient.
 * Tabbed view with ROM/MMT recording forms and Re-evaluation comparison workflow.
 */

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROMForm } from "@/components/assessment/ROMForm";
import { MMTForm } from "@/components/assessment/MMTForm";
import { ROMMMTHistory } from "@/components/assessment/ROMMMTHistory";
import { ReevaluationForm } from "@/components/assessment/ReevaluationForm";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = params.id as string;

  const t = useTranslations("assessment");
  const tReeval = useTranslations("reevaluation");

  // Support ?tab=reevaluation query param for deep linking
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "reevaluation" ? "reevaluation" : "rom-mmt";

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/patients/${patientId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="rom-mmt">
            {t("rom.title")} / {t("mmt.title")}
          </TabsTrigger>
          <TabsTrigger value="reevaluation">
            {tReeval("title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rom-mmt" className="mt-4 space-y-6">
          {/* ROM Form */}
          <ROMForm patientId={patientId} />

          {/* MMT Form */}
          <MMTForm patientId={patientId} />

          {/* History */}
          <ROMMMTHistory patientId={patientId} />
        </TabsContent>

        <TabsContent value="reevaluation" className="mt-4">
          <ReevaluationForm patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
