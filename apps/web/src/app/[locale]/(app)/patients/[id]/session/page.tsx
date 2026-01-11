"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { VisitChecklist } from "@/components/checklist";
import { useVisitChecklist } from "@/hooks/useChecklist";

/**
 * Session page - Full checklist workflow for patient visits
 *
 * URL: /[locale]/(app)/patients/[id]/session?visit=[visitId]&quick=[boolean]
 */
export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = params.id as string;
  const visitId = searchParams.get("visit");
  const quickMode = searchParams.get("quick") === "true";

  const [isReady, setIsReady] = useState(false);

  // Fetch checklist data
  const {
    data: checklist,
    isLoading,
    error,
  } = useVisitChecklist(visitId ?? "");

  // Handle missing visit ID
  useEffect(() => {
    if (!visitId) {
      // Could redirect to patient page or show error
      console.error("No visit ID provided");
    }
    setIsReady(true);
  }, [visitId]);

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Handle completion
  const handleComplete = () => {
    // Navigate to patient detail or schedule
    router.push(`/patients/${patientId}`);
  };

  // Loading state
  if (!isReady || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">:(</div>
          <h1 className="text-xl font-semibold mb-2">Failed to load session</h1>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No visit ID
  if (!visitId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">?</div>
          <h1 className="text-xl font-semibold mb-2">No visit selected</h1>
          <p className="text-muted-foreground mb-4">
            Please select a visit to start a session.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No checklist data
  if (!checklist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">!</div>
          <h1 className="text-xl font-semibold mb-2">No checklist available</h1>
          <p className="text-muted-foreground mb-4">
            This visit doesn't have an associated checklist template.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <VisitChecklist
        checklist={checklist}
        patientId={patientId}
        onBack={handleBack}
        onComplete={handleComplete}
        quickMode={quickMode}
      />
    </div>
  );
}
