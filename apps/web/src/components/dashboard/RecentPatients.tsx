"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Eye, Play, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatients } from "@/hooks/use-patients";
import type { Patient } from "@/types/patient";

/**
 * Loading skeleton for recent patients
 */
function RecentPatientsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-1.5 w-full" />
              <div className="flex justify-end gap-2 pt-1">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state for recent patients
 */
function RecentPatientsError({ message }: { message: string }) {
  const t = useTranslations("common");
  return (
    <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
      <AlertCircle className="mb-2 h-10 w-10 text-destructive opacity-50" />
      <p className="text-sm">{t("error")}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Map patient status to display status
 */
function mapPatientStatusToDisplay(status: Patient["status"]): "active" | "paused" | "completed" {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
    case "pending":
      return "paused";
    case "discharged":
      return "completed";
    default:
      return "active";
  }
}

/**
 * Calculate a progress percentage based on patient data
 * In a real implementation, this would come from treatment plan progress
 */
function getPatientProgress(patient: Patient): number {
  // Use a hash of patient ID to get consistent progress value
  // In production, this would come from treatment plan data
  const hash = patient.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 61) + 40; // 40-100%
}

export function RecentPatients() {
  const locale = useLocale();
  const t = useTranslations("dashboard.recentPatients");
  const dateLocale = locale === "vi" ? vi : enUS;

  // Fetch recent patients from API, sorted by updated_at (recently worked with)
  const { data: patientsResponse, isLoading, isError, error } = usePatients({
    pageSize: 5,
    sortBy: "updated_at",
    sortOrder: "desc",
    status: "active",
  });

  const patients = patientsResponse?.data ?? [];

  const getStatusColor = (status: "active" | "paused" | "completed") => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPatientDisplayName = (patient: Patient): string => {
    // Prefer Vietnamese name if in Vietnamese locale
    if (locale === "vi") {
      return patient.nameVi;
    }
    return patient.nameEn ?? patient.nameVi;
  };

  const getLastVisitDate = (patient: Patient): Date => {
    // Use lastVisitDate if available, otherwise use updatedAt
    if (patient.lastVisitDate) {
      return new Date(patient.lastVisitDate);
    }
    return new Date(patient.updatedAt);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/patients`}>{t("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          {isLoading ? (
            <RecentPatientsSkeleton />
          ) : isError ? (
            <RecentPatientsError message={error?.message ?? "Failed to load patients"} />
          ) : patients.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="mb-2 h-10 w-10 opacity-50" />
              <p>{t("noPatients")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient: Patient) => {
                const status = mapPatientStatusToDisplay(patient.status);
                const progress = getPatientProgress(patient);
                const displayName = getPatientDisplayName(patient);
                const lastVisit = getLastVisitDate(patient);

                return (
                  <div
                    key={patient.id}
                    className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} alt={displayName} />
                        <AvatarFallback className="text-xs">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/${locale}/patients/${patient.id}`}
                            className="font-medium hover:underline"
                          >
                            {displayName}
                          </Link>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", getStatusColor(status))}
                          >
                            {t(`status.${status}`)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          MRN: {patient.mrn}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {t("lastVisit")}:{" "}
                            {formatDistanceToNow(lastVisit, {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </span>
                          <span>{t("progress")}: {progress}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full transition-all",
                              getProgressColor(progress)
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                          {status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-7 text-xs"
                            >
                              <Link href={`/${locale}/patients/${patient.id}/session`}>
                                <Play className="mr-1 h-3 w-3" />
                                {t("continue")}
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 text-xs"
                          >
                            <Link href={`/${locale}/patients/${patient.id}`}>
                              <Eye className="mr-1 h-3 w-3" />
                              {t("view")}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
