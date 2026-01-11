"use client";

/**
 * Dialog for prescribing an exercise to a patient
 * Allows setting sets, reps, frequency, and custom instructions
 */

import { useState } from "react";
import { useLocale } from "next-intl";
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
import { CATEGORY_INFO, DIFFICULTY_INFO } from "@/types/exercise";
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
  { value: "1x/day", label: "1x per day", labelVi: "1 lan/ngay" },
  { value: "2x/day", label: "2x per day", labelVi: "2 lan/ngay" },
  { value: "3x/day", label: "3x per day", labelVi: "3 lan/ngay" },
  { value: "1x/week", label: "1x per week", labelVi: "1 lan/tuan" },
  { value: "2x/week", label: "2x per week", labelVi: "2 lan/tuan" },
  { value: "3x/week", label: "3x per week", labelVi: "3 lan/tuan" },
  { value: "daily", label: "Daily", labelVi: "Hang ngay" },
  { value: "every_other_day", label: "Every other day", labelVi: "Cach ngay" },
];

const DURATION_OPTIONS = [
  { value: 2, label: "2 weeks", labelVi: "2 tuan" },
  { value: 4, label: "4 weeks", labelVi: "4 tuan" },
  { value: 6, label: "6 weeks", labelVi: "6 tuan" },
  { value: 8, label: "8 weeks", labelVi: "8 tuan" },
  { value: 12, label: "12 weeks", labelVi: "12 tuan" },
];

export function PrescribeDialog({
  exercise,
  patientId,
  patientName,
  open,
  onOpenChange,
  onPrescribe,
  isLoading = false,
}: PrescribeDialogProps) {
  const locale = useLocale();
  const isVi = locale === "vi";

  const {
    register,
    handleSubmit,
    formState: { errors },
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
  const difficultyInfo = DIFFICULTY_INFO[exercise.difficulty];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isVi ? "Ke don bai tap" : "Prescribe Exercise"}
          </DialogTitle>
          <DialogDescription>
            {patientName ? (
              <>
                {isVi ? "Ke don cho" : "Prescribing to"}: <strong>{patientName}</strong>
              </>
            ) : (
              isVi
                ? "Thiet lap thong so bai tap cho benh nhan"
                : "Set exercise parameters for the patient"
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
                  {isVi ? categoryInfo.labelVi : categoryInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {isVi ? difficultyInfo.labelVi : difficultyInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sets, Reps, Hold */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets">{isVi ? "So bo" : "Sets"}</Label>
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
                <Label htmlFor="reps">{isVi ? "So lan" : "Reps"}</Label>
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
                  {isVi ? "Giu (s)" : "Hold (s)"}
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
              <Label>{isVi ? "Tan suat" : "Frequency"}</Label>
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
                      {isVi ? option.labelVi : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>{isVi ? "Thoi gian" : "Duration"}</Label>
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
                      {isVi ? option.labelVi : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label htmlFor="customInstructions">
                {isVi ? "Huong dan dac biet" : "Custom Instructions"}
              </Label>
              <textarea
                id="customInstructions"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={
                  isVi
                    ? "Them huong dan cu the cho benh nhan..."
                    : "Add specific instructions for the patient..."
                }
                {...register("customInstructions")}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                {isVi ? "Ghi chu (noi bo)" : "Notes (internal)"}
              </Label>
              <Input
                id="notes"
                placeholder={
                  isVi ? "Ghi chu cho bac si..." : "Notes for therapist..."
                }
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
              {isVi ? "Huy" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isVi ? "Dang ke don..." : "Prescribing..."}
                </>
              ) : (
                <>{isVi ? "Ke don" : "Prescribe"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
