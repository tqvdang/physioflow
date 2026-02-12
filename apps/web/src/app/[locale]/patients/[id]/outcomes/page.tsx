"use client";

/**
 * Outcome measures page for a patient.
 * Shows measure type tabs, progress chart, trending view,
 * and a dialog to record new measurements.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { MeasureForm } from "@/components/outcome-measures/MeasureForm";
import { ProgressChart } from "@/components/outcome-measures/ProgressChart";
import { TrendingView } from "@/components/outcome-measures/TrendingView";
import {
  type MeasureType,
  getMeasureDefinition,
  usePatientMeasures,
  useRecordMeasure,
  useProgress,
  useTrending,
} from "@/hooks/use-outcome-measures";

const MEASURE_TYPES: MeasureType[] = [
  "VAS",
  "NDI",
  "ODI",
  "LEFS",
  "DASH",
  "QuickDASH",
  "PSFS",
  "FIM",
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

/**
 * Content for a selected measure type tab.
 * Fetches progress and trending data independently.
 */
function MeasureTabContent({
  patientId,
  measureType,
}: {
  patientId: string;
  measureType: MeasureType;
}) {
  const definition = getMeasureDefinition(measureType);
  const {
    data: progress,
    isLoading: progressLoading,
  } = useProgress(patientId, measureType);
  const {
    data: trendingRows,
    isLoading: trendingLoading,
  } = useTrending(patientId, measureType);

  if (!definition) return null;

  if (progressLoading || trendingLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {progress && <ProgressChart progress={progress} definition={definition} />}
      {trendingRows && <TrendingView rows={trendingRows} definition={definition} />}
    </div>
  );
}

export default function OutcomeMeasuresPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  // locale not needed for routing (next-intl router handles it)

  const t = useTranslations("outcomes");

  const [selectedTab, setSelectedTab] = React.useState<MeasureType>("VAS");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Prefetch all measures to know which tabs have data
  const { data: allMeasures, isLoading: measuresLoading } = usePatientMeasures(patientId);

  // Record mutation
  const recordMutation = useRecordMeasure();

  const handleRecordSubmit = (data: Parameters<typeof recordMutation.mutate>[0]) => {
    recordMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
        // Switch to the tab of the recorded measure type
        setSelectedTab(data.measureType);
      },
    });
  };

  // Determine which measure types have at least one record
  const measuresWithData = React.useMemo(() => {
    if (!allMeasures) return new Set<MeasureType>();
    const types = new Set<MeasureType>();
    for (const m of allMeasures) {
      types.add(m.measureType);
    }
    return types;
  }, [allMeasures]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("record")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("record")}</DialogTitle>
              <DialogDescription>{t("recordDescription")}</DialogDescription>
            </DialogHeader>
            <MeasureForm
              patientId={patientId}
              onSubmit={handleRecordSubmit}
              isSubmitting={recordMutation.isPending}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Measure type tabs */}
      {measuresLoading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as MeasureType)}
        >
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto">
              {MEASURE_TYPES.map((type) => (
                <TabsTrigger key={type} value={type} className="relative">
                  {t(`measures.${type}`)}
                  {measuresWithData.has(type) && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {MEASURE_TYPES.map((type) => (
            <TabsContent key={type} value={type}>
              <MeasureTabContent patientId={patientId} measureType={type} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
