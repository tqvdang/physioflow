"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

import { useAuth } from "@/contexts/auth-context";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { Alerts } from "@/components/dashboard/Alerts";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useAuth();
  const dateLocale = locale === "vi" ? vi : enUS;

  const today = new Date();
  const formattedDate = format(today, "EEEE, d MMMM yyyy", {
    locale: dateLocale,
  });

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {greeting()}, {user?.firstName || t("greeting.therapist")}
        </h1>
        <p className="text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <TodaySchedule />

        {/* Recent Patients */}
        <RecentPatients />
      </div>

      {/* Alerts & Reminders */}
      <Alerts />
    </div>
  );
}
