"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  X,
} from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

type AlertType = "warning" | "info" | "success" | "error";
type AlertCategory = "appointment" | "report" | "follow-up" | "system";

interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description: string;
  timestamp: Date;
  actionLabel?: string;
  actionHref?: string;
  dismissible?: boolean;
}

// Mock data for demonstration
const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "warning",
    category: "appointment",
    title: "Lich hen chua xac nhan",
    description: "3 lich hen ngay mai chua duoc benh nhan xac nhan",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    actionLabel: "Xem chi tiet",
    actionHref: "/schedule?filter=unconfirmed",
    dismissible: true,
  },
  {
    id: "2",
    type: "info",
    category: "report",
    title: "Bao cao can hoan thanh",
    description: "2 bao cao danh gia dang cho hoan thanh",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    actionLabel: "Xem bao cao",
    actionHref: "/reports?status=pending",
    dismissible: true,
  },
  {
    id: "3",
    type: "warning",
    category: "follow-up",
    title: "Nhac theo doi benh nhan",
    description: "Nguyen Van A can duoc theo doi sau 2 tuan dieu tri",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    actionLabel: "Xem benh nhan",
    actionHref: "/patients/1",
    dismissible: true,
  },
  {
    id: "4",
    type: "success",
    category: "system",
    title: "Cap nhat thanh cong",
    description: "Thu vien bai tap da duoc cap nhat voi 5 bai tap moi",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    dismissible: true,
  },
  {
    id: "5",
    type: "error",
    category: "system",
    title: "Loi dong bo du lieu",
    description: "Khong the dong bo du lieu voi he thong sao luu",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    actionLabel: "Thu lai",
    dismissible: false,
  },
];

export function Alerts() {
  const locale = useLocale();
  const t = useTranslations("dashboard.alerts");
  const dateLocale = locale === "vi" ? vi : enUS;
  const [alerts, setAlerts] = React.useState(mockAlerts);

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "warning":
        return AlertTriangle;
      case "error":
        return AlertCircle;
      case "success":
        return CheckCircle2;
      default:
        return Info;
    }
  };

  const getAlertColor = (type: AlertType) => {
    switch (type) {
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "error":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
    }
  };

  const getIconColor = (type: AlertType) => {
    switch (type) {
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case "appointment":
        return Calendar;
      case "report":
        return FileText;
      case "follow-up":
        return Clock;
      default:
        return Bell;
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlerts([])}
              className="text-muted-foreground"
            >
              {t("dismissAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
                <CheckCircle2 className="mb-2 h-10 w-10 opacity-50" />
                <p>{t("noAlerts")}</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                const CategoryIcon = getCategoryIcon(alert.category);

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "relative rounded-lg border border-l-4 p-3 transition-colors",
                      getAlertColor(alert.type)
                    )}
                  >
                    {alert.dismissible && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">{t("dismiss")}</span>
                      </Button>
                    )}
                    <div className="flex items-start gap-3 pr-6">
                      <Icon className={cn("mt-0.5 h-5 w-5", getIconColor(alert.type))} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.title}</span>
                          <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(alert.timestamp, {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </span>
                          {alert.actionLabel && alert.actionHref && (
                            <Button
                              variant="link"
                              size="sm"
                              asChild
                              className="h-auto p-0 text-xs"
                            >
                              <Link href={`/${locale}${alert.actionHref}`}>
                                {alert.actionLabel}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
