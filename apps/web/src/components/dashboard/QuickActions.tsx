"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Calculator, Calendar, FileText, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuickAction {
  icon: React.ElementType;
  labelKey: string;
  descriptionKey: string;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    icon: UserPlus,
    labelKey: "newPatient",
    descriptionKey: "newPatientDesc",
    href: "/patients/new",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    icon: Calculator,
    labelKey: "newAssessment",
    descriptionKey: "newAssessmentDesc",
    href: "/assessments/new",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
  },
  {
    icon: Calendar,
    labelKey: "newSession",
    descriptionKey: "newSessionDesc",
    href: "/sessions/new",
    color: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
  },
  {
    icon: FileText,
    labelKey: "newReport",
    descriptionKey: "newReportDesc",
    href: "/reports/new",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
  },
];

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.labelKey}
                href={action.href}
                className="group flex flex-col items-center rounded-lg border p-4 text-center transition-colors hover:bg-accent"
              >
                <div
                  className={cn(
                    "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                    action.color
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">{t(action.labelKey)}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {t(action.descriptionKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
