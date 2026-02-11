"use client";

/**
 * Global protocol library page
 * Displays all protocol templates with detail view dialog
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtocolSelector } from "@/components/protocols/ProtocolSelector";
import { ProtocolDetails } from "@/components/protocols/ProtocolDetails";
import { useProtocol } from "@/hooks/use-protocols";
import { BookOpen } from "lucide-react";

export default function ProtocolLibraryPage() {
  const t = useTranslations("protocols");

  const [selectedProtocolId, setSelectedProtocolId] = React.useState<
    string | null
  >(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("libraryTitle")}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{t("libraryDesc")}</p>
      </div>

      {/* Protocol Grid */}
      <ProtocolSelector
        onViewDetails={(id) => setSelectedProtocolId(id)}
        showAssignButton={false}
      />

      {/* Detail Dialog */}
      {selectedProtocolId && (
        <ProtocolDetailDialog
          protocolId={selectedProtocolId}
          open={!!selectedProtocolId}
          onClose={() => setSelectedProtocolId(null)}
        />
      )}
    </div>
  );
}

/**
 * Dialog for viewing protocol details
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
