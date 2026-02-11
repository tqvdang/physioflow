"use client";

/**
 * Patient protocol progress tracking interface
 * Shows current week, progress bar, exercise checklist, and status updates
 */

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  PatientProtocol,
  ClinicalProtocol,
  ProtocolStatus,
  ProtocolExercise,
} from "@/types/protocol";
import { useUpdateProgress } from "@/hooks/use-protocols";
import {
  Calendar,
  Clock,
  TrendingUp,
  Save,
  Loader2,
  MessageSquare,
  Activity,
} from "lucide-react";

interface ProgressTrackerProps {
  patientProtocol: PatientProtocol;
  protocol: ClinicalProtocol;
  patientId: string;
}

const STATUS_COLORS: Record<ProtocolStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  discontinued: "bg-red-100 text-red-800",
};

export function ProgressTracker({
  patientProtocol,
  protocol,
  patientId,
}: ProgressTrackerProps) {
  const t = useTranslations("protocols");
  const locale = useLocale();
  const isVi = locale === "vi";

  const updateMutation = useUpdateProgress(patientId, patientProtocol.id);

  // Local state
  const [status, setStatus] = React.useState<ProtocolStatus>(
    patientProtocol.progressStatus
  );
  const [currentPhase, setCurrentPhase] = React.useState(
    patientProtocol.currentPhase
  );
  const [sessionsCompleted, setSessionsCompleted] = React.useState(
    patientProtocol.sessionsCompleted
  );
  const [progressNote, setProgressNote] = React.useState("");
  const [completedExercises, setCompletedExercises] = React.useState<
    Set<number>
  >(new Set());

  // Computed values
  const totalWeeks =
    patientProtocol.customDurationWeeks ?? protocol.durationWeeks;
  const frequencyPerWeek =
    patientProtocol.customFrequencyPerWeek ?? protocol.frequencyPerWeek;
  const totalSessions = totalWeeks * frequencyPerWeek;

  // Calculate current week based on sessions completed
  const currentWeek = Math.min(
    Math.ceil((sessionsCompleted + 1) / frequencyPerWeek),
    totalWeeks
  );

  const progressPercent = Math.min(
    Math.round((sessionsCompleted / totalSessions) * 100),
    100
  );

  // Get exercises for the current phase
  const exercises =
    patientProtocol.customExercises ?? protocol.exercises;
  const currentPhaseExercises = exercises.filter(
    (ex) => ex.phase === currentPhase || ex.phase === "initial"
  );

  // Toggle exercise completion
  const toggleExercise = (index: number) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Handle save
  const handleSave = () => {
    updateMutation.mutate({
      progressStatus: status,
      currentPhase: currentPhase,
      sessionsCompleted: sessionsCompleted,
      note: progressNote || undefined,
    });
    if (updateMutation.isSuccess) {
      setProgressNote("");
    }
  };

  // Handle complete session: increment sessions and save
  const handleCompleteSession = () => {
    const newSessions = sessionsCompleted + 1;
    setSessionsCompleted(newSessions);
    setCompletedExercises(new Set());

    // Auto-check if protocol is completed
    const newStatus = newSessions >= totalSessions ? "completed" : status;
    if (newSessions >= totalSessions) {
      setStatus("completed");
    }

    updateMutation.mutate({
      progressStatus: newStatus,
      currentPhase: currentPhase,
      sessionsCompleted: newSessions,
      note: progressNote || undefined,
    });
    setProgressNote("");
  };

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("progress")}
            </CardTitle>
            <Badge className={STATUS_COLORS[status]}>
              {t(`status.${status}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("currentWeek")}: {currentWeek} / {totalWeeks}
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">
                {t("sessionsCompleted")}
              </p>
              <p className="text-lg font-semibold">
                {sessionsCompleted}/{totalSessions}
              </p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">
                {t("currentPhase")}
              </p>
              <p className="text-sm font-medium capitalize">{currentPhase}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">
                {t("frequency")}
              </p>
              <p className="text-sm font-medium">
                {frequencyPerWeek}x/{t("week")}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-sm">
            {patientProtocol.startDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {t("started")}: {patientProtocol.startDate}
                </span>
              </div>
            )}
            {patientProtocol.targetEndDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t("targetEnd")}: {patientProtocol.targetEndDate}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Checklist for Current Session */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("sessionChecklist")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentPhaseExercises.map((exercise, idx) => (
              <ExerciseCheckItem
                key={idx}
                exercise={exercise}
                isChecked={completedExercises.has(idx)}
                onToggle={() => toggleExercise(idx)}
                isVi={isVi}
              />
            ))}
            {currentPhaseExercises.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noExercisesForPhase")}
              </p>
            )}
          </div>

          {currentPhaseExercises.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {completedExercises.size}/{currentPhaseExercises.length}{" "}
                  {t("exercisesCompleted")}
                </p>
                <Button
                  size="sm"
                  onClick={handleCompleteSession}
                  disabled={
                    updateMutation.isPending ||
                    completedExercises.size === 0
                  }
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  {t("completeSession")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Progress Note & Status Update */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("updateProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("statusLabel")}</label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProtocolStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    {t("status.active")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("status.completed")}
                  </SelectItem>
                  <SelectItem value="on_hold">
                    {t("status.on_hold")}
                  </SelectItem>
                  <SelectItem value="discontinued">
                    {t("status.discontinued")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phase Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("phaseLabel")}
              </label>
              <Select value={currentPhase} onValueChange={setCurrentPhase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">
                    {t("phases.initial")}
                  </SelectItem>
                  <SelectItem value="intermediate">
                    {t("phases.intermediate")}
                  </SelectItem>
                  <SelectItem value="advanced">
                    {t("phases.advanced")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("progressNote")}</label>
            <Textarea
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder={t("progressNotePlaceholder")}
              rows={3}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("saveProgress")}
            </Button>
          </div>

          {/* Previous Notes */}
          {patientProtocol.progressNotes.length > 0 && (
            <div className="space-y-2 pt-2">
              <Separator />
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("previousNotes")}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...patientProtocol.progressNotes]
                  .reverse()
                  .map((note, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border p-2 text-sm space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {note.date}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {note.phase}
                        </Badge>
                      </div>
                      <p>{isVi && note.noteVi ? note.noteVi : note.note}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Individual exercise check item
 */
function ExerciseCheckItem({
  exercise,
  isChecked,
  onToggle,
  isVi,
}: {
  exercise: ProtocolExercise;
  isChecked: boolean;
  onToggle: () => void;
  isVi: boolean;
}) {
  const displayName = isVi ? exercise.nameVi : exercise.name;
  const displayDesc = isVi ? exercise.descriptionVi : exercise.description;

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
        isChecked ? "bg-muted/50" : ""
      }`}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isChecked ? "line-through text-muted-foreground" : ""
          }`}
        >
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {displayDesc}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>
            {exercise.sets} x {exercise.reps}
          </span>
          {exercise.durationSeconds && (
            <span>{exercise.durationSeconds}s</span>
          )}
          <span>{exercise.frequencyPerDay}x/day</span>
        </div>
      </div>
    </div>
  );
}
