"use client";

/**
 * Detailed protocol view with goals, exercises, and progression criteria
 * Supports bilingual display (Vietnamese primary, English tooltip)
 */

import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { ClinicalProtocol, ProtocolPhase } from "@/types/protocol";
import { PROTOCOL_CATEGORY_INFO } from "@/types/protocol";
import {
  Target,
  Dumbbell,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRightCircle,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ProtocolDetailsProps {
  protocol: ClinicalProtocol;
  /** Optional: completed goal indices for patient progress */
  completedGoals?: number[];
  onToggleGoal?: (index: number) => void;
  isLoading?: boolean;
}

const PHASE_COLORS: Record<ProtocolPhase, string> = {
  initial: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const PHASE_LABELS: Record<ProtocolPhase, { en: string; vi: string }> = {
  initial: { en: "Initial", vi: "Giai \u0111o\u1ea1n \u0111\u1ea7u" },
  intermediate: { en: "Intermediate", vi: "Giai \u0111o\u1ea1n gi\u1eefa" },
  advanced: { en: "Advanced", vi: "Giai \u0111o\u1ea1n n\u00e2ng cao" },
};

/**
 * Bilingual text component: shows primary language with tooltip for alternate
 */
function BilingualText({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary?: string;
  className?: string;
}) {
  if (!secondary || secondary === primary) {
    return <span className={className}>{primary}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-default border-b border-dotted border-muted-foreground/40 ${className ?? ""}`}>
            {primary}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{secondary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProtocolDetails({
  protocol,
  completedGoals = [],
  onToggleGoal,
  isLoading = false,
}: ProtocolDetailsProps) {
  const t = useTranslations("protocols");
  const locale = useLocale();
  const isVi = locale === "vi";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const displayName = isVi ? protocol.protocolNameVi : protocol.protocolName;
  const altName = isVi ? protocol.protocolName : protocol.protocolNameVi;
  const displayDescription = isVi
    ? protocol.descriptionVi
    : protocol.description;
  const altDescription = isVi
    ? protocol.description
    : protocol.descriptionVi;

  const categoryInfo = PROTOCOL_CATEGORY_INFO[protocol.category];
  const categoryLabel = categoryInfo
    ? isVi
      ? categoryInfo.labelVi
      : categoryInfo.label
    : protocol.category;

  const shortTermGoals = protocol.goals.filter((g) => g.type === "short_term");
  const longTermGoals = protocol.goals.filter((g) => g.type === "long_term");

  // Group exercises by phase
  const exercisesByPhase = protocol.exercises.reduce(
    (acc, ex) => {
      const phase = ex.phase ?? "initial";
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(ex);
      return acc;
    },
    {} as Record<string, typeof protocol.exercises>
  );

  return (
    <div className="space-y-4">
      {/* Protocol Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <BilingualText
                primary={displayName}
                secondary={altName}
                className="text-xl font-semibold"
              />
              {categoryInfo && (
                <Badge
                  variant="secondary"
                  className={`ml-2 ${categoryInfo.color}`}
                >
                  {categoryLabel}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="mt-2">
            <BilingualText
              primary={displayDescription}
              secondary={altDescription}
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t("duration")}</p>
                <p className="font-medium">
                  {protocol.durationWeeks} {t("weeks")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t("frequency")}</p>
                <p className="font-medium">
                  {protocol.frequencyPerWeek}x/{t("week")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t("sessionLength")}</p>
                <p className="font-medium">
                  {protocol.sessionDurationMinutes} {t("minutes")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion
        type="multiple"
        defaultValue={["goals", "exercises", "progression"]}
      >
        {/* Goals Section */}
        <AccordionItem value="goals">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>{t("goals")}</span>
              <Badge variant="secondary" className="ml-1">
                {protocol.goals.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Short-term goals */}
              {shortTermGoals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("shortTermGoals")}
                  </h4>
                  <div className="space-y-2">
                    {shortTermGoals.map((goal, idx) => {
                      const globalIdx = protocol.goals.indexOf(goal);
                      const isCompleted = completedGoals.includes(globalIdx);
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-md border p-3"
                        >
                          {onToggleGoal && (
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => onToggleGoal(globalIdx)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <BilingualText
                              primary={
                                isVi ? goal.descriptionVi : goal.description
                              }
                              secondary={
                                isVi ? goal.description : goal.descriptionVi
                              }
                              className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              {goal.measurableCriteria} &middot;{" "}
                              {goal.targetTimeframeWeeks} {t("weeks")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Long-term goals */}
              {longTermGoals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("longTermGoals")}
                  </h4>
                  <div className="space-y-2">
                    {longTermGoals.map((goal, idx) => {
                      const globalIdx = protocol.goals.indexOf(goal);
                      const isCompleted = completedGoals.includes(globalIdx);
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-md border p-3"
                        >
                          {onToggleGoal && (
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => onToggleGoal(globalIdx)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <BilingualText
                              primary={
                                isVi ? goal.descriptionVi : goal.description
                              }
                              secondary={
                                isVi ? goal.description : goal.descriptionVi
                              }
                              className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              {goal.measurableCriteria} &middot;{" "}
                              {goal.targetTimeframeWeeks} {t("weeks")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Exercises Section */}
        <AccordionItem value="exercises">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span>{t("exercises")}</span>
              <Badge variant="secondary" className="ml-1">
                {protocol.exercises.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {(["initial", "intermediate", "advanced"] as ProtocolPhase[]).map(
                (phase) => {
                  const exercises = exercisesByPhase[phase];
                  if (!exercises || exercises.length === 0) return null;
                  const phaseLabel = isVi
                    ? PHASE_LABELS[phase].vi
                    : PHASE_LABELS[phase].en;
                  return (
                    <div key={phase}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={PHASE_COLORS[phase]}>
                          {phaseLabel}
                        </Badge>
                      </div>
                      <div className="rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">
                                {t("exerciseName")}
                              </th>
                              <th className="text-center p-2 font-medium w-16">
                                {t("sets")}
                              </th>
                              <th className="text-center p-2 font-medium w-16">
                                {t("reps")}
                              </th>
                              <th className="text-center p-2 font-medium w-24">
                                {t("durationCol")}
                              </th>
                              <th className="text-center p-2 font-medium w-20">
                                {t("perDay")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercises.map((ex, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="p-2">
                                  <div className="space-y-0.5">
                                    <BilingualText
                                      primary={
                                        isVi ? ex.nameVi : ex.name
                                      }
                                      secondary={
                                        isVi ? ex.name : ex.nameVi
                                      }
                                      className="font-medium"
                                    />
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      <BilingualText
                                        primary={
                                          isVi
                                            ? ex.descriptionVi
                                            : ex.description
                                        }
                                        secondary={
                                          isVi
                                            ? ex.description
                                            : ex.descriptionVi
                                        }
                                      />
                                    </p>
                                    {ex.precautions.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                        <span className="text-xs text-amber-600">
                                          {ex.precautions.join(", ")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center p-2">{ex.sets}</td>
                                <td className="text-center p-2">{ex.reps}</td>
                                <td className="text-center p-2">
                                  {ex.durationSeconds
                                    ? `${ex.durationSeconds}s`
                                    : "-"}
                                </td>
                                <td className="text-center p-2">
                                  {ex.frequencyPerDay}x
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Progression Criteria Section */}
        <AccordionItem value="progression">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>{t("progression")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Phase Transitions */}
              {protocol.progressionCriteria.phaseTransitions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("phaseTransitions")}
                  </h4>
                  {protocol.progressionCriteria.phaseTransitions.map(
                    (transition, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-md border p-3"
                      >
                        <Badge
                          className={
                            PHASE_COLORS[
                              transition.fromPhase as ProtocolPhase
                            ] ?? "bg-gray-100 text-gray-800"
                          }
                        >
                          {isVi
                            ? PHASE_LABELS[
                                transition.fromPhase as ProtocolPhase
                              ]?.vi ?? transition.fromPhase
                            : PHASE_LABELS[
                                transition.fromPhase as ProtocolPhase
                              ]?.en ?? transition.fromPhase}
                        </Badge>
                        <ArrowRightCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Badge
                          className={
                            PHASE_COLORS[
                              transition.toPhase as ProtocolPhase
                            ] ?? "bg-gray-100 text-gray-800"
                          }
                        >
                          {isVi
                            ? PHASE_LABELS[
                                transition.toPhase as ProtocolPhase
                              ]?.vi ?? transition.toPhase
                            : PHASE_LABELS[
                                transition.toPhase as ProtocolPhase
                              ]?.en ?? transition.toPhase}
                        </Badge>
                        <div className="flex-1 min-w-0 ml-2">
                          <BilingualText
                            primary={
                              isVi
                                ? transition.criteriaVi
                                : transition.criteria
                            }
                            secondary={
                              isVi
                                ? transition.criteria
                                : transition.criteriaVi
                            }
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ~{t("week")} {transition.typicalWeek}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Discharge Criteria */}
              <Separator />
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-medium">
                    {t("dischargeCriteria")}
                  </h4>
                </div>
                <BilingualText
                  primary={
                    isVi
                      ? protocol.progressionCriteria.dischargeCriteriaVi
                      : protocol.progressionCriteria.dischargeCriteria
                  }
                  secondary={
                    isVi
                      ? protocol.progressionCriteria.dischargeCriteria
                      : protocol.progressionCriteria.dischargeCriteriaVi
                  }
                  className="text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
