"use client";

/**
 * Patient status badge component
 * Displays patient status with appropriate colors
 */

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PatientStatus } from "@/types/patient";

interface PatientStatusBadgeProps {
  status: PatientStatus;
  className?: string;
}

const statusConfig: Record<
  PatientStatus,
  { translationKey: string; className: string }
> = {
  active: {
    translationKey: "active",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  inactive: {
    translationKey: "inactive",
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  },
  discharged: {
    translationKey: "discharged",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  pending: {
    translationKey: "pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
};

export function PatientStatusBadge({
  status,
  className,
}: PatientStatusBadgeProps) {
  const t = useTranslations("patients.status");
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {t(config.translationKey)}
    </Badge>
  );
}

export { statusConfig };
