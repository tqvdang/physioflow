"use client";

/**
 * Form for creating a discharge plan
 * Includes bilingual text fields, date picker, and follow-up recommendations
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CreateDischargePlanRequest } from "@/types/discharge";

const dischargePlanSchema = z.object({
  plannedDate: z.string().min(1, "Required"),
  diagnosis: z.string().optional(),
  diagnosisVi: z.string().optional(),
  treatmentSummary: z.string().optional(),
  treatmentSummaryVi: z.string().optional(),
  recommendations: z.string().optional(),
  recommendationsVi: z.string().optional(),
  functionalStatus: z.string().optional(),
  functionalStatusVi: z.string().optional(),
  followUpPlan: z.array(
    z.object({
      type: z.enum(["appointment", "referral", "test", "other"]),
      description: z.string().min(1),
      descriptionVi: z.string().min(1),
      timeframe: z.string().optional(),
    })
  ),
});

type DischargePlanFormValues = z.infer<typeof dischargePlanSchema>;

interface DischargePlanFormProps {
  patientId: string;
  onSubmit: (data: CreateDischargePlanRequest) => void;
  isSubmitting?: boolean;
  locale?: string;
  className?: string;
}

export function DischargePlanForm({
  patientId,
  onSubmit,
  isSubmitting = false,
  locale = "vi",
  className,
}: DischargePlanFormProps) {
  const t = useTranslations("discharge");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<DischargePlanFormValues>({
    resolver: zodResolver(dischargePlanSchema),
    defaultValues: {
      plannedDate: "",
      diagnosis: "",
      diagnosisVi: "",
      treatmentSummary: "",
      treatmentSummaryVi: "",
      recommendations: "",
      recommendationsVi: "",
      functionalStatus: "",
      functionalStatusVi: "",
      followUpPlan: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "followUpPlan",
  });

  const plannedDate = watch("plannedDate");

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setValue("plannedDate", format(date, "yyyy-MM-dd"));
    }
    setCalendarOpen(false);
  };

  const handleFormSubmit = (values: DischargePlanFormValues) => {
    onSubmit({
      patientId,
      plannedDate: values.plannedDate,
      diagnosis: values.diagnosis,
      diagnosisVi: values.diagnosisVi,
      treatmentSummary: values.treatmentSummary,
      treatmentSummaryVi: values.treatmentSummaryVi,
      recommendations: values.recommendations,
      recommendationsVi: values.recommendationsVi,
      functionalStatus: values.functionalStatus,
      functionalStatusVi: values.functionalStatusVi,
      followUpPlan: values.followUpPlan,
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          {t("createPlan")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Planned Discharge Date */}
          <div className="space-y-2">
            <Label>{t("plannedDate")}</Label>
            <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !plannedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {plannedDate
                    ? format(new Date(plannedDate), "dd/MM/yyyy")
                    : t("selectDate")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto p-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>{t("plannedDate")}</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  locale={locale as "vi" | "en"}
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 2}
                />
              </DialogContent>
            </Dialog>
            {errors.plannedDate && (
              <p className="text-sm text-destructive">
                {t("validation.dateRequired")}
              </p>
            )}
          </div>

          {/* Diagnosis (bilingual) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("diagnosisVi")}</Label>
              <Textarea
                {...register("diagnosisVi")}
                placeholder={t("diagnosisViPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("diagnosisEn")}</Label>
              <Textarea
                {...register("diagnosis")}
                placeholder={t("diagnosisEnPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          {/* Treatment Summary (bilingual) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("treatmentSummaryVi")}</Label>
              <Textarea
                {...register("treatmentSummaryVi")}
                placeholder={t("treatmentSummaryViPlaceholder")}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("treatmentSummaryEn")}</Label>
              <Textarea
                {...register("treatmentSummary")}
                placeholder={t("treatmentSummaryEnPlaceholder")}
                rows={4}
              />
            </div>
          </div>

          {/* Functional Status (bilingual) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("functionalStatusVi")}</Label>
              <Textarea
                {...register("functionalStatusVi")}
                placeholder={t("functionalStatusViPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("functionalStatusEn")}</Label>
              <Textarea
                {...register("functionalStatus")}
                placeholder={t("functionalStatusEnPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          {/* Recommendations (bilingual) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("recommendationsVi")}</Label>
              <Textarea
                {...register("recommendationsVi")}
                placeholder={t("recommendationsViPlaceholder")}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("recommendationsEn")}</Label>
              <Textarea
                {...register("recommendations")}
                placeholder={t("recommendationsEnPlaceholder")}
                rows={4}
              />
            </div>
          </div>

          {/* Follow-up Plan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">{t("followUp")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    type: "appointment",
                    description: "",
                    descriptionVi: "",
                    timeframe: "",
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("followUpAdd")}
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("followUpItem")} {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t("followUpType")}</Label>
                    <Select
                      value={watch(`followUpPlan.${index}.type`)}
                      onValueChange={(value) =>
                        setValue(
                          `followUpPlan.${index}.type`,
                          value as "appointment" | "referral" | "test" | "other"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment">
                          {t("followUpTypes.appointment")}
                        </SelectItem>
                        <SelectItem value="referral">
                          {t("followUpTypes.referral")}
                        </SelectItem>
                        <SelectItem value="test">
                          {t("followUpTypes.test")}
                        </SelectItem>
                        <SelectItem value="other">
                          {t("followUpTypes.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("followUpTimeframe")}</Label>
                    <Input
                      {...register(`followUpPlan.${index}.timeframe`)}
                      placeholder={t("followUpTimeframePlaceholder")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {t("followUpDescriptionVi")}
                    </Label>
                    <Input
                      {...register(`followUpPlan.${index}.descriptionVi`)}
                      placeholder={t("followUpDescriptionViPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {t("followUpDescriptionEn")}
                    </Label>
                    <Input
                      {...register(`followUpPlan.${index}.description`)}
                      placeholder={t("followUpDescriptionEnPlaceholder")}
                    />
                  </div>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("followUpEmpty")}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? t("creating") : t("createPlan")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
