"use client";

/**
 * Protocol management page for a patient
 * - If no protocol assigned: shows ProtocolSelector
 * - If protocol assigned: shows ProtocolDetails + ProgressTracker
 * - Supports multiple protocols via tabs
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProtocolSelector } from "@/components/protocols/ProtocolSelector";
import { ProtocolDetails } from "@/components/protocols/ProtocolDetails";
import { ProgressTracker } from "@/components/protocols/ProgressTracker";
import {
  usePatientProtocols,
  useProtocol,
  useAssignProtocol,
} from "@/hooks/use-protocols";
import type { PatientProtocol } from "@/types/protocol";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function PatientProtocolPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("protocols");
  const tCommon = useTranslations("common");

  const patientId = params.id as string;

  // Fetch patient's assigned protocols
  const {
    data: patientProtocols,
    isLoading,
    isError,
    refetch,
  } = usePatientProtocols(patientId);

  // Assign protocol mutation
  const assignMutation = useAssignProtocol(patientId);

  // State
  const [showSelector, setShowSelector] = React.useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = React.useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = React.useState<string | undefined>(
    undefined
  );

  // Set initial active tab when data loads
  React.useEffect(() => {
    if (patientProtocols && patientProtocols.length > 0 && !activeTab) {
      const first = patientProtocols[0];
      if (first) setActiveTab(first.id);
    }
  }, [patientProtocols, activeTab]);

  const hasProtocols = patientProtocols && patientProtocols.length > 0;

  // Handle assigning a protocol
  const handleAssign = (protocolId: string) => {
    setSelectedProtocolId(protocolId);
    assignMutation.mutate(
      { protocolId },
      {
        onSuccess: (newProtocol) => {
          setShowSelector(false);
          setSelectedProtocolId(null);
          setActiveTab(newProtocol.id);
        },
      }
    );
  };

  // Handle viewing protocol details in library view
  const handleViewDetails = (protocolId: string) => {
    setSelectedProtocolId(protocolId);
  };

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
            <p className="text-sm text-muted-foreground">
              {t("patientProtocolDesc")}
            </p>
          </div>
        </div>
        {hasProtocols && (
          <Button onClick={() => setShowSelector(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("assignNew")}
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">{t("errorLoading")}</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {tCommon("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Protocols Assigned - Show Selector */}
      {!isLoading && !isError && !hasProtocols && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <BookOpen className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium">{t("noAssigned")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("noAssignedDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
          <ProtocolSelector
            onAssign={handleAssign}
            onViewDetails={handleViewDetails}
          />
        </div>
      )}

      {/* Protocols Assigned - Show Tabs + Details + Progress */}
      {!isLoading && !isError && hasProtocols && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {patientProtocols.length > 1 && (
            <TabsList>
              {patientProtocols.map((pp) => (
                <TabsTrigger key={pp.id} value={pp.id}>
                  {pp.protocol
                    ? locale === "vi"
                      ? pp.protocol.protocolNameVi
                      : pp.protocol.protocolName
                    : t("protocol")}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {patientProtocols.map((pp) => (
            <TabsContent key={pp.id} value={pp.id}>
              <PatientProtocolContent
                patientProtocol={pp}
                patientId={patientId}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Protocol Selector Dialog */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("assignProtocol")}</DialogTitle>
            <DialogDescription>{t("assignProtocolDesc")}</DialogDescription>
          </DialogHeader>
          <ProtocolSelector
            onAssign={handleAssign}
            onViewDetails={handleViewDetails}
          />
          {assignMutation.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                {t("assigning")}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Protocol Detail Dialog (from library view) */}
      {selectedProtocolId && !showSelector && (
        <ProtocolDetailDialog
          protocolId={selectedProtocolId}
          open={!!selectedProtocolId && !showSelector}
          onClose={() => setSelectedProtocolId(null)}
        />
      )}
    </div>
  );
}

/**
 * Content area for a single patient protocol (details + progress tracker)
 */
function PatientProtocolContent({
  patientProtocol,
  patientId,
}: {
  patientProtocol: PatientProtocol;
  patientId: string;
}) {
  // If we have the embedded protocol, use it directly
  // Otherwise fetch it
  const {
    data: fetchedProtocol,
    isLoading,
  } = useProtocol(
    patientProtocol.protocolId,
    !patientProtocol.protocol
  );

  const protocol = patientProtocol.protocol ?? fetchedProtocol;

  if (isLoading || !protocol) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProtocolDetails protocol={protocol} />
      <ProgressTracker
        patientProtocol={patientProtocol}
        protocol={protocol}
        patientId={patientId}
      />
    </div>
  );
}

/**
 * Dialog for viewing protocol details from library
 */
function ProtocolDetailDialog({
  protocolId,
  open,
  onClose,
}: {
  protocolId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("protocols");
  const { data: protocol, isLoading } = useProtocol(protocolId, open);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("protocolDetails")}</DialogTitle>
        </DialogHeader>
        {isLoading || !protocol ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <ProtocolDetails protocol={protocol} />
        )}
      </DialogContent>
    </Dialog>
  );
}
