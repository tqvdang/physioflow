"use client";

/**
 * Full exercise details component
 * Shows all exercise information with instructions and prescribe button
 */

import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/exercise";
import { CATEGORY_INFO, DIFFICULTY_INFO, MUSCLE_GROUP_INFO } from "@/types/exercise";
import {
  Dumbbell,
  Clock,
  Play,
  Plus,
  AlertTriangle,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface ExerciseDetailProps {
  exercise: Exercise;
  onPrescribe?: (exercise: Exercise) => void;
  onClose?: () => void;
  className?: string;
}

export function ExerciseDetail({
  exercise,
  onPrescribe,
  onClose,
  className,
}: ExerciseDetailProps) {
  const locale = useLocale();
  const isVi = locale === "vi";

  const name = isVi ? exercise.nameVi : exercise.name;
  const description = isVi ? exercise.descriptionVi : exercise.description;
  const instructions = isVi ? exercise.instructionsVi : exercise.instructions;
  const precautions = isVi ? exercise.precautionsVi : exercise.precautions;

  const categoryInfo = CATEGORY_INFO[exercise.category];
  const difficultyInfo = DIFFICULTY_INFO[exercise.difficulty];

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Header with close button */}
      <CardHeader className="relative pb-2">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Media section */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
          {exercise.videoUrl ? (
            <div className="relative w-full h-full">
              {/* Video placeholder - in production, use a proper video player */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-black/70 rounded-full p-4 cursor-pointer hover:bg-black/80 transition-colors">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </div>
              {exercise.imageUrl && (
                <img
                  src={exercise.imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ) : exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Title and badges */}
        <div className="space-y-2">
          <CardTitle className="text-xl">{name}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(categoryInfo.color)}>
              {isVi ? categoryInfo.labelVi : categoryInfo.label}
            </Badge>
            <Badge variant="outline" className={cn(difficultyInfo.color)}>
              {isVi ? difficultyInfo.labelVi : difficultyInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Description */}
        {description && (
          <div>
            <h3 className="text-sm font-medium mb-2">
              {isVi ? "Mo ta" : "Description"}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        <Separator />

        {/* Default parameters */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {isVi ? "Thong so mac dinh" : "Default Parameters"}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {exercise.defaultSets > 0 && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{exercise.defaultSets}</div>
                <div className="text-xs text-muted-foreground">
                  {isVi ? "Bo" : "Sets"}
                </div>
              </div>
            )}
            {exercise.defaultReps > 0 && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{exercise.defaultReps}</div>
                <div className="text-xs text-muted-foreground">
                  {isVi ? "Lan lap" : "Reps"}
                </div>
              </div>
            )}
            {exercise.defaultHoldSecs > 0 && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  {exercise.defaultHoldSecs}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isVi ? "Giay" : "Seconds"}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Muscle groups */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {isVi ? "Nhom co" : "Muscle Groups"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {exercise.muscleGroups.map((mg) => {
              const info = MUSCLE_GROUP_INFO[mg];
              return (
                <Badge key={mg} variant="secondary">
                  {isVi ? info.labelVi : info.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Equipment */}
        {exercise.equipment && exercise.equipment.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                {isVi ? "Dung cu" : "Equipment"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.equipment.map((item, index) => (
                  <Badge key={index} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Instructions */}
        {instructions && (
          <div>
            <h3 className="text-sm font-medium mb-3">
              {isVi ? "Huong dan" : "Instructions"}
            </h3>
            <div className="text-sm text-muted-foreground whitespace-pre-line">
              {instructions}
            </div>
          </div>
        )}

        {/* Precautions */}
        {precautions && (
          <>
            <Separator />
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                {isVi ? "Luu y" : "Precautions"}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {precautions}
              </p>
            </div>
          </>
        )}

        {/* Prescribe button */}
        {onPrescribe && (
          <>
            <Separator />
            <Button
              size="lg"
              className="w-full"
              onClick={() => onPrescribe(exercise)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isVi ? "Ke don bai tap nay" : "Prescribe this exercise"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
