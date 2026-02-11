"use client";

/**
 * Form for recording new outcome measures.
 * Supports all 8 standardized measure types with score validation.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  type MeasureType,
  type MeasurePhase,
  type RecordMeasureRequest,
  getMeasureDefinition,
} from "@/hooks/use-outcome-measures";

interface MeasureFormProps {
  patientId: string;
  onSubmit: (data: RecordMeasureRequest) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

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

const PHASES: MeasurePhase[] = ["baseline", "interim", "discharge"];

/**
 * Build a dynamic Zod schema based on the selected measure type
 */
function buildFormSchema(measureType: MeasureType | null) {
  const definition = measureType ? getMeasureDefinition(measureType) : null;
  const min = definition?.minScore ?? 0;
  const max = definition?.maxScore ?? 100;

  return z.object({
    measureType: z.string().min(1, "Required"),
    score: z.coerce
      .number()
      .min(min, `Score must be at least ${min}`)
      .max(max, `Score must be at most ${max}`),
    date: z.string().min(1, "Required"),
    phase: z.string().min(1, "Required"),
    notes: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

export function MeasureForm({
  patientId,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: MeasureFormProps) {
  const t = useTranslations("outcomes");
  const tCommon = useTranslations("common");

  const [selectedMeasureType, setSelectedMeasureType] = React.useState<MeasureType | null>(null);
  const [showCalendar, setShowCalendar] = React.useState(false);

  const schema = React.useMemo(
    () => buildFormSchema(selectedMeasureType),
    [selectedMeasureType]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      measureType: "",
      score: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      phase: "interim",
      notes: "",
    },
  });

  const definition = selectedMeasureType ? getMeasureDefinition(selectedMeasureType) : null;

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      patientId,
      measureType: values.measureType as MeasureType,
      score: values.score,
      date: values.date,
      phase: values.phase as MeasurePhase,
      notes: values.notes || undefined,
    });
  };

  const handleMeasureTypeChange = (value: string) => {
    setSelectedMeasureType(value as MeasureType);
    form.setValue("measureType", value);
    // Reset score to the minimum of the new measure type
    const def = getMeasureDefinition(value as MeasureType);
    if (def) {
      form.setValue("score", def.minScore);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Measure Type */}
        <FormField
          control={form.control}
          name="measureType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("measureType")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={handleMeasureTypeChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("measureType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEASURE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`measures.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {definition && (
                <FormDescription>
                  {definition.description} ({definition.minScore}-{definition.maxScore}{" "}
                  {definition.unit})
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

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
                  min={definition?.minScore ?? 0}
                  max={definition?.maxScore ?? 100}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              {definition && (
                <FormDescription>
                  {t("validRange")}: {definition.minScore} - {definition.maxScore}{" "}
                  {definition.unit} | MCID: {definition.mcid}
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
                      selected={field.value ? new Date(field.value) : undefined}
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

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {tCommon("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("recording") : t("record")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
