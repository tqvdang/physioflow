"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Clock, MapPin } from "lucide-react";
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

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar?: string;
  time: string;
  duration: number;
  type: "assessment" | "treatment" | "followup";
  room?: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

// Mock data for demonstration
const mockAppointments: Appointment[] = [
  {
    id: "1",
    patientName: "Nguyen Van A",
    time: "08:00",
    duration: 60,
    type: "assessment",
    room: "Room 1",
    status: "completed",
  },
  {
    id: "2",
    patientName: "Tran Thi B",
    time: "09:30",
    duration: 45,
    type: "treatment",
    room: "Room 2",
    status: "in-progress",
  },
  {
    id: "3",
    patientName: "Le Van C",
    time: "10:30",
    duration: 30,
    type: "followup",
    room: "Room 1",
    status: "scheduled",
  },
  {
    id: "4",
    patientName: "Pham Thi D",
    time: "14:00",
    duration: 60,
    type: "treatment",
    room: "Room 3",
    status: "scheduled",
  },
  {
    id: "5",
    patientName: "Hoang Van E",
    time: "15:30",
    duration: 45,
    type: "assessment",
    room: "Room 1",
    status: "scheduled",
  },
];

export function TodaySchedule() {
  const locale = useLocale();
  const t = useTranslations("dashboard.schedule");
  const dateLocale = locale === "vi" ? vi : enUS;

  const today = new Date();
  const formattedDate = format(today, "EEEE, d MMMM yyyy", {
    locale: dateLocale,
  });

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "in-progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: Appointment["type"]) => {
    switch (type) {
      case "assessment":
        return "border-l-purple-500";
      case "treatment":
        return "border-l-blue-500";
      case "followup":
        return "border-l-green-500";
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
            <Link href={`/${locale}/schedule`}>{t("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {mockAppointments.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
                <Calendar className="mb-2 h-10 w-10 opacity-50" />
                <p>{t("noAppointments")}</p>
              </div>
            ) : (
              mockAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/${locale}/schedule/${appointment.id}`}
                  className={cn(
                    "block rounded-lg border border-l-4 bg-card p-3 transition-colors hover:bg-accent",
                    getTypeColor(appointment.type)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={appointment.patientAvatar}
                        alt={appointment.patientName}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(appointment.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {appointment.patientName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(appointment.status))}
                        >
                          {t(`status.${appointment.status}`)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {appointment.time} ({appointment.duration} {t("minutes")})
                        </span>
                        {appointment.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {appointment.room}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t(`type.${appointment.type}`)}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
