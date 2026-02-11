"use client";

/**
 * Delete button with confirmation dialog for outcome measurements.
 * Uses shadcn/ui AlertDialog for the confirmation step.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useDeleteOutcomeMeasure } from "@/hooks/use-outcome-measures";

interface MeasureDeleteButtonProps {
  /** ID of the measurement to delete */
  measureId: string;
  /** Patient who owns the measurement */
  patientId: string;
  /** Display name for the measure (shown in confirmation) */
  measureName: string;
}

export function MeasureDeleteButton({
  measureId,
  patientId,
  measureName,
}: MeasureDeleteButtonProps) {
  const tMeasures = useTranslations("outcomeMeasures");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);

  const deleteMutation = useDeleteOutcomeMeasure();

  const handleDelete = () => {
    deleteMutation.mutate(
      { patientId, measureId },
      {
        onSuccess: () => {
          toast.success(tMeasures("deleted"));
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">{tMeasures("deleteMeasure")}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {tMeasures("deleteMeasure")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tMeasures("confirmDelete")} <strong>{measureName}</strong>
            <br />
            {tMeasures("deleteWarning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? tCommon("loading") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
