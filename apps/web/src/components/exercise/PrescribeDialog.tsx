"use client";

/**
 * Dialog for prescribing an exercise to a patient
 * Allows setting sets, reps, frequency, and custom instructions
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Exercise, PrescribeExerciseRequest } from "@/types/exercise";
import { CATEGORY_INFO } from "@/types/exercise";
import { Dumbbell, Clock, Loader2 } from "lucide-react";

interface PrescribeDialogProps {
  exercise: Exercise | null;
  patientId: string;
  patientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrescribe: (data: PrescribeExerciseRequest) => Promise<void>;
  isLoading?: boolean;
}

interface FormData {
  sets: number;
  reps: number;
  holdSeconds: number;
  frequency: string;
  durationWeeks: number;
  customInstructions: string;
  notes: string;
}

const FREQUENCY_OPTIONS = [
  { value: "1x/day", key: "1x_day" },
  { value: "2x/day", key: "2x_day" },
  { value: "3x/day", key: "3x_day" },
  { value: "1x/week", key: "1x_week" },
  { value: "2x/week", key: "2x_week" },
  { value: "3x/week", key: "3x_week" },
  { value: "daily", key: "daily" },
  { value: "every_other_day", key: "every_other_day" },
];

const DURATION_OPTIONS = [
  { value: 2, key: "2_weeks" },
  { value: 4, key: "4_weeks" },
  { value: 6, key: "6_weeks" },
  { value: 8, key: "8_weeks" },
  { value: 12, key: "12_weeks" },
];

export function PrescribeDialog({
  exercise,
  patientId: _patientId,
  patientName,
  open,
  onOpenChange,
  onPrescribe,
  isLoading = false,
}: PrescribeDialogProps) {
  // patientId will be used when integrating with backend prescription API
  void _patientId;
  const locale = useLocale();
  const t = useTranslations("library");
  const isVi = locale === "vi";

  const {
    register,
    handleSubmit,
    formState: { errors: _errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      sets: exercise?.defaultSets || 3,
      reps: exercise?.defaultReps || 10,
      holdSeconds: exercise?.defaultHoldSecs || 0,
      frequency: "1x/day",
      durationWeeks: 4,
      customInstructions: "",
      notes: "",
    },
  });

  // Reset form when exercise changes
  useState(() => {
    if (exercise) {
      reset({
        sets: exercise.defaultSets || 3,
        reps: exercise.defaultReps || 10,
        holdSeconds: exercise.defaultHoldSecs || 0,
        frequency: "1x/day",
        durationWeeks: 4,
        customInstructions: "",
        notes: "",
      });
    }
  });

  const frequency = watch("frequency");
  const durationWeeks = watch("durationWeeks");

  const onSubmit = async (data: FormData) => {
    if (!exercise) return;

    await onPrescribe({
      exerciseId: exercise.id,
      sets: data.sets,
      reps: data.reps,
      holdSeconds: data.holdSeconds,
      frequency: data.frequency,
      durationWeeks: data.durationWeeks,
      customInstructions: data.customInstructions || undefined,
      notes: data.notes || undefined,
    });

    reset();
    onOpenChange(false);
  };

  if (!exercise) return null;

  const name = isVi ? exercise.nameVi : exercise.name;
  const categoryInfo = CATEGORY_INFO[exercise.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("prescription.title")}
          </DialogTitle>
          <DialogDescription>
            {patientName ? (
              <>
                {t("prescription.prescribingTo")}: <strong>{patientName}</strong>
              </>
            ) : (
              t("prescription.setParams")
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Exercise info */}
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-background rounded-lg flex items-center justify-center">
              {exercise.thumbnailUrl ? (
                <img
                  src={exercise.thumbnailUrl}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn("text-xs", categoryInfo.color)}>
                  {t(`categories.${exercise.category}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`difficulties.${exercise.difficulty}`)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sets, Reps, Hold */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets">{t("prescription.sets")}</Label>
                <Input
                  id="sets"
                  type="number"
                  min={1}
                  max={20}
                  {...register("sets", {
                    required: true,
                    min: 1,
                    max: 20,
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reps">{t("prescription.reps")}</Label>
                <Input
                  id="reps"
                  type="number"
                  min={1}
                  max={100}
                  {...register("reps", {
                    required: true,
                    min: 1,
                    max: 100,
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holdSeconds" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("prescription.holdSeconds")}
                </Label>
                <Input
                  id="holdSeconds"
                  type="number"
                  min={0}
                  max={300}
                  {...register("holdSeconds", {
                    min: 0,
                    max: 300,
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>{t("prescription.frequency")}</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setValue("frequency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`prescription.frequencies.${option.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>{t("prescription.duration")}</Label>
              <Select
                value={String(durationWeeks)}
                onValueChange={(value) => setValue("durationWeeks", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {t(`prescription.durations.${option.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label htmlFor="customInstructions">
                {t("prescription.customInstructions")}
              </Label>
              <textarea
                id="customInstructions"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t("prescription.customInstructionsPlaceholder")}
                {...register("customInstructions")}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                {t("prescription.notes")}
              </Label>
              <Input
                id="notes"
                placeholder={t("prescription.notesPlaceholder")}
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("prescription.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("prescription.prescribing")}
                </>
              ) : (
                <>{t("prescription.prescribe")}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
