"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Play, Users } from "lucide-react";
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

interface RecentPatient {
  id: string;
  name: string;
  avatar?: string;
  condition: string;
  lastVisit: Date;
  nextSession?: Date;
  progress: number;
  status: "active" | "paused" | "completed";
}

// Mock data for demonstration
const mockPatients: RecentPatient[] = [
  {
    id: "1",
    name: "Nguyen Van A",
    condition: "Dau lung man tinh",
    lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    nextSession: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    progress: 65,
    status: "active",
  },
  {
    id: "2",
    name: "Tran Thi B",
    condition: "Phuc hoi sau phau thuat dau goi",
    lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextSession: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    progress: 40,
    status: "active",
  },
  {
    id: "3",
    name: "Le Van C",
    condition: "Chan thuong vai",
    lastVisit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    progress: 85,
    status: "active",
  },
  {
    id: "4",
    name: "Pham Thi D",
    condition: "Phuc hoi sau dot quy",
    lastVisit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    progress: 30,
    status: "paused",
  },
  {
    id: "5",
    name: "Hoang Van E",
    condition: "Viem khop",
    lastVisit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    progress: 100,
    status: "completed",
  },
];

export function RecentPatients() {
  const locale = useLocale();
  const t = useTranslations("dashboard.recentPatients");
  const dateLocale = locale === "vi" ? vi : enUS;

  const getStatusColor = (status: RecentPatient["status"]) => {
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
          <div className="space-y-3">
            {mockPatients.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
                <Users className="mb-2 h-10 w-10 opacity-50" />
                <p>{t("noPatients")}</p>
              </div>
            ) : (
              mockPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={patient.avatar} alt={patient.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/${locale}/patients/${patient.id}`}
                          className="font-medium hover:underline"
                        >
                          {patient.name}
                        </Link>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(patient.status))}
                        >
                          {t(`status.${patient.status}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {patient.condition}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t("lastVisit")}:{" "}
                          {formatDistanceToNow(patient.lastVisit, {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        <span>{t("progress")}: {patient.progress}%</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all",
                            getProgressColor(patient.progress)
                          )}
                          style={{ width: `${patient.progress}%` }}
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        {patient.status === "active" && (
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
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
