"use client";

/**
 * Exercise preview card component
 * Displays exercise info with image placeholder and quick info
 */

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseCategory, ExerciseDifficulty, MuscleGroup } from "@/types/exercise";
import { CATEGORY_INFO, DIFFICULTY_INFO } from "@/types/exercise";
import { Dumbbell, Clock, Play, Plus, Image as ImageIcon } from "lucide-react";

interface ExerciseCardProps {
  exercise: Exercise;
  variant?: "compact" | "full";
  showActions?: boolean;
  onView?: (exercise: Exercise) => void;
  onPrescribe?: (exercise: Exercise) => void;
  className?: string;
}

// Map type values to translation keys
const categoryKeyMap: Record<ExerciseCategory, string> = {
  stretching: "stretching",
  strengthening: "strengthening",
  balance: "balance",
  cardiovascular: "cardiovascular",
  mobility: "mobility",
  postural: "postural",
};

const difficultyKeyMap: Record<ExerciseDifficulty, string> = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

const muscleGroupKeyMap: Record<MuscleGroup, string> = {
  neck: "neck",
  shoulder: "shoulder",
  upper_back: "upper_back",
  lower_back: "lower_back",
  chest: "chest",
  core: "core",
  hip: "hip",
  glutes: "glutes",
  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  calves: "calves",
  ankle: "ankle",
  wrist_forearm: "wrist_forearm",
  elbow: "elbow",
  full_body: "full_body",
};

export function ExerciseCard({
  exercise,
  variant = "full",
  showActions = true,
  onView,
  onPrescribe,
  className,
}: ExerciseCardProps) {
  const locale = useLocale();
  const t = useTranslations("library");
  const isVi = locale === "vi";

  const name = isVi ? exercise.nameVi : exercise.name;
  const description = isVi ? exercise.descriptionVi : exercise.description;

  const categoryInfo = CATEGORY_INFO[exercise.category];
  const difficultyInfo = DIFFICULTY_INFO[exercise.difficulty];

  // Get translated labels
  const categoryLabel = t(`categories.${categoryKeyMap[exercise.category]}`);
  const difficultyLabel = t(`difficulties.${difficultyKeyMap[exercise.difficulty]}`);

  // Get first few muscle groups for display
  const displayMuscleGroups = exercise.muscleGroups.slice(0, 3);
  const remainingCount = exercise.muscleGroups.length - displayMuscleGroups.length;

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          className
        )}
        onClick={() => onView?.(exercise)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
              {exercise.thumbnailUrl ? (
                <img
                  src={exercise.thumbnailUrl}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn("text-xs", categoryInfo.color)}>
                  {categoryLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {difficultyLabel}
                </Badge>
              </div>
            </div>

            {/* Quick action */}
            {showActions && onPrescribe && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrescribe(exercise);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow overflow-hidden",
        className
      )}
    >
      {/* Image/Video placeholder */}
      <div className="relative aspect-video bg-muted">
        {exercise.imageUrl || exercise.thumbnailUrl ? (
          <img
            src={exercise.imageUrl || exercise.thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Video indicator */}
        {exercise.videoUrl && (
          <div className="absolute bottom-2 right-2 bg-black/70 rounded-full p-2">
            <Play className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn(categoryInfo.color)}>
            {categoryLabel}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Difficulty and defaults */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <Badge variant="outline" className={cn("text-xs", difficultyInfo.color)}>
            {difficultyLabel}
          </Badge>

          {exercise.defaultSets > 0 && (
            <span>
              {exercise.defaultSets} {t("card.sets")}
            </span>
          )}

          {exercise.defaultReps > 0 && (
            <span>
              {exercise.defaultReps} {t("card.reps")}
            </span>
          )}

          {exercise.defaultHoldSecs > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exercise.defaultHoldSecs}s
            </span>
          )}
        </div>

        {/* Muscle groups */}
        <div className="flex flex-wrap gap-1 mb-3">
          {displayMuscleGroups.map((mg) => {
            return (
              <Badge key={mg} variant="secondary" className="text-xs">
                {t(`muscleGroups.${muscleGroupKeyMap[mg]}`)}
              </Badge>
            );
          })}
          {remainingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{remainingCount}
            </Badge>
          )}
        </div>

        {/* Equipment */}
        {exercise.equipment && exercise.equipment.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Dumbbell className="h-3 w-3" />
            <span>{exercise.equipment.join(", ")}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView?.(exercise)}
            >
              {t("card.viewDetails")}
            </Button>
            {onPrescribe && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onPrescribe(exercise)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("card.prescribe")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
