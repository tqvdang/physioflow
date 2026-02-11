"use client";

/**
 * Dialog for editing an existing outcome measurement.
 * Uses shadcn/ui Dialog and react-hook-form for form state.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  type OutcomeMeasurement,
  type MeasurePhase,
  getMeasureDefinition,
  useUpdateOutcomeMeasure,
} from "@/hooks/use-outcome-measures";

interface MeasureEditDialogProps {
  /** The measurement to edit */
  measure: OutcomeMeasurement;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to toggle open state */
  onOpenChange: (open: boolean) => void;
  /** Patient ID that owns this measurement */
  patientId: string;
}

const PHASES: MeasurePhase[] = ["baseline", "interim", "discharge"];

export function MeasureEditDialog({
  measure,
  open,
  onOpenChange,
  patientId,
}: MeasureEditDialogProps) {
  const t = useTranslations("outcomes");
  const tCommon = useTranslations("common");
  const tMeasures = useTranslations("outcomeMeasures");
  const [showCalendar, setShowCalendar] = React.useState(false);

  const definition = getMeasureDefinition(measure.measureType);
  const min = definition?.minScore ?? 0;
  const max = definition?.maxScore ?? 100;

  const schema = React.useMemo(
    () =>
      z.object({
        score: z.coerce
          .number()
          .min(min, `Score must be at least ${min}`)
          .max(max, `Score must be at most ${max}`),
        date: z.string().min(1, "Required"),
        phase: z.string().min(1, "Required"),
        notes: z.string().optional(),
      }),
    [min, max]
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      score: measure.score,
      date: measure.date,
      phase: measure.phase,
      notes: measure.notes ?? "",
    },
  });

  // Reset form values when measure changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        score: measure.score,
        date: measure.date,
        phase: measure.phase,
        notes: measure.notes ?? "",
      });
    }
  }, [open, measure, form]);

  const updateMutation = useUpdateOutcomeMeasure();

  const handleSubmit = (values: FormValues) => {
    updateMutation.mutate(
      {
        patientId,
        measureId: measure.id,
        data: {
          currentScore: values.score,
          measurementDate: values.date,
          phase: values.phase as MeasurePhase,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(tMeasures("updated"));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tMeasures("editMeasure")}</DialogTitle>
          <DialogDescription>
            {t(`measures.${measure.measureType}`)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Score */}
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("score")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min={min}
                      max={max}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  {definition && (
                    <FormDescription>
                      {t("validRange")}: {definition.minScore} -{" "}
                      {definition.maxScore} {definition.unit}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("date")}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="text"
                        value={field.value}
                        readOnly
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="cursor-pointer"
                      />
                    </FormControl>
                    {showCalendar && (
                      <div className="absolute z-50 mt-1 rounded-md border bg-popover shadow-md">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, "yyyy-MM-dd"));
                            }
                            setShowCalendar(false);
                          }}
                          disabled={(date) => date > new Date()}
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phase */}
            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phaseLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {t(`phase.${phase}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
