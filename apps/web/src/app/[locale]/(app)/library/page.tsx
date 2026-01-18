"use client";

/**
 * Exercise library page
 * Displays searchable, filterable grid of exercises
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-media-query";
import { useExercises } from "@/hooks/use-exercises";
import { ExerciseCard } from "@/components/exercise/ExerciseCard";
import { ExerciseDetail } from "@/components/exercise/ExerciseDetail";
import { PrescribeDialog } from "@/components/exercise/PrescribeDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseSearchParams,
  PrescribeExerciseRequest,
} from "@/types/exercise";
import { CATEGORY_INFO } from "@/types/exercise";
import { Search, Filter, Grid, List, X, Dumbbell } from "lucide-react";

const ALL_CATEGORIES: ExerciseCategory[] = [
  "stretching",
  "strengthening",
  "balance",
  "cardiovascular",
  "mobility",
  "postural",
];

const ALL_DIFFICULTIES: ExerciseDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export default function LibraryPage() {
  const t = useTranslations("library");

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseDifficulty | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [prescribeExercise, setPrescribeExercise] = useState<Exercise | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build search params
  const searchParams: ExerciseSearchParams = useMemo(
    () => ({
      page,
      perPage: 24,
      search: debouncedSearch || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      difficulty: selectedDifficulty !== "all" ? selectedDifficulty : undefined,
      sortBy: "name",
      sortOrder: "asc",
    }),
    [page, debouncedSearch, selectedCategory, selectedDifficulty]
  );

  // Fetch exercises
  const { data, isLoading, isError } = useExercises(searchParams);

  const exercises = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;

  // Handlers
  const handleViewExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDetailOpen(true);
  };

  const handlePrescribeClick = (exercise: Exercise) => {
    setPrescribeExercise(exercise);
    setPrescribeOpen(true);
  };

  const handlePrescribe = async (data: PrescribeExerciseRequest) => {
    // TODO: In production, get actual patient ID from context or navigation
    console.log("Prescribing exercise:", data);
    // For now, just close the dialog
    setPrescribeOpen(false);
    setPrescribeExercise(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== "all" || selectedDifficulty !== "all";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value as ExerciseCategory | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("filters.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("allCategories")}
              </SelectItem>
              {ALL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty filter */}
          <Select
            value={selectedDifficulty}
            onValueChange={(value) => {
              setSelectedDifficulty(value as ExerciseDifficulty | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("filters.difficulty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("allLevels")}
              </SelectItem>
              {ALL_DIFFICULTIES.map((diff) => (
                <SelectItem key={diff} value={diff}>
                  {t(`difficulties.${diff}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t("filters.clear")}
            </Button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("activeFilters")}:
          </span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              "{searchQuery}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchQuery("")}
              />
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className={cn("gap-1", CATEGORY_INFO[selectedCategory].color)}>
              {t(`categories.${selectedCategory}`)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              />
            </Badge>
          )}
          {selectedDifficulty !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {t(`difficulties.${selectedDifficulty}`)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSelectedDifficulty("all")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            {total} {t("exercisesCount")}
            {hasActiveFilters && ` (${t("filtered")})`}
          </>
        )}
      </div>

      {/* Exercise grid/list */}
      {isLoading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-4"
          )}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                viewMode === "grid" ? "h-[320px]" : "h-[100px]"
              )}
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium">
            {t("error.loadFailed")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("error.tryAgain")}
          </p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium">
            {t("empty.noResults")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("empty.adjustFilters")}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              {t("filters.clear")}
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-4"
          )}
        >
          {exercises.map((exercise: Exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              variant={viewMode === "grid" ? "full" : "compact"}
              onView={handleViewExercise}
              onPrescribe={handlePrescribeClick}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.page", { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}

      {/* Exercise detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <ScrollArea className="h-full p-6">
            {selectedExercise && (
              <ExerciseDetail
                exercise={selectedExercise}
                onPrescribe={handlePrescribeClick}
                onClose={() => setDetailOpen(false)}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Prescribe dialog */}
      <PrescribeDialog
        exercise={prescribeExercise}
        patientId=""
        open={prescribeOpen}
        onOpenChange={setPrescribeOpen}
        onPrescribe={handlePrescribe}
      />
    </div>
  );
}
