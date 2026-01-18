"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
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
import { useDaySchedule } from "@/hooks/use-appointments";
import type { Appointment, AppointmentType, AppointmentStatus } from "@/types/appointment";

/**
 * Loading skeleton for today's schedule
 */
function TodayScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-l-4 border-l-gray-300 p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state for today's schedule
 */
function TodayScheduleError({ message }: { message: string }) {
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
 * Map API status to display status key
 */
function mapStatusToDisplayKey(status: AppointmentStatus): string {
  const statusMap: Record<AppointmentStatus, string> = {
    scheduled: "scheduled",
    confirmed: "scheduled",
    in_progress: "in-progress",
    completed: "completed",
    cancelled: "cancelled",
    no_show: "cancelled",
  };
  return statusMap[status] ?? "scheduled";
}

/**
 * Map API type to display type key
 */
function mapTypeToDisplayKey(type: AppointmentType): string {
  const typeMap: Record<AppointmentType, string> = {
    assessment: "assessment",
    treatment: "treatment",
    followup: "followup",
    consultation: "treatment",
    other: "treatment",
  };
  return typeMap[type] ?? "treatment";
}

export function TodaySchedule() {
  const locale = useLocale();
  const t = useTranslations("dashboard.schedule");
  const dateLocale = locale === "vi" ? vi : enUS;

  const today = new Date();
  const formattedDate = format(today, "EEEE, d MMMM yyyy", {
    locale: dateLocale,
  });
  const todayString = format(today, "yyyy-MM-dd");

  // Fetch today's appointments from API
  const { data: daySchedule, isLoading, isError, error } = useDaySchedule(todayString);

  const appointments = daySchedule?.appointments ?? [];

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "cancelled":
      case "no_show":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: AppointmentType) => {
    switch (type) {
      case "assessment":
        return "border-l-purple-500";
      case "treatment":
        return "border-l-blue-500";
      case "followup":
        return "border-l-green-500";
      case "consultation":
        return "border-l-orange-500";
      default:
        return "border-l-gray-500";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatAppointmentTime = (startTime: string) => {
    try {
      const date = new Date(startTime);
      return format(date, "HH:mm");
    } catch {
      return startTime;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1">{formattedDate}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/schedule` as any}>{t("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          {isLoading ? (
            <TodayScheduleSkeleton />
          ) : isError ? (
            <TodayScheduleError message={error?.message ?? "Failed to load schedule"} />
          ) : appointments.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
              <Calendar className="mb-2 h-10 w-10 opacity-50" />
              <p>{t("noAppointments")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment: Appointment) => (
                <Link
                  key={appointment.id}
                  href={`/${locale}/schedule/${appointment.id}` as any}
                  className={cn(
                    "block rounded-lg border border-l-4 bg-card p-3 transition-colors hover:bg-accent",
                    getTypeColor(appointment.type)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={undefined}
                        alt={appointment.patientName ?? "Patient"}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(appointment.patientName ?? "???")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {appointment.patientName ?? appointment.patientMrn ?? "Unknown Patient"}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(appointment.status))}
                        >
                          {t(`status.${mapStatusToDisplayKey(appointment.status)}`)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatAppointmentTime(appointment.startTime)} ({appointment.duration} {t("minutes")})
                        </span>
                        {appointment.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {appointment.room}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t(`type.${mapTypeToDisplayKey(appointment.type)}`)}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
