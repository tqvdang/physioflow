"use client";

/**
 * Patient status badge component
 * Displays patient status with appropriate colors
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PatientStatus } from "@/types/patient";

interface PatientStatusBadgeProps {
  status: PatientStatus;
  className?: string;
}

const statusConfig: Record<
  PatientStatus,
  { label: string; labelVi: string; className: string }
> = {
  active: {
    label: "Active",
    labelVi: "Dang dieu tri",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  inactive: {
    label: "Inactive",
    labelVi: "Khong hoat dong",
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  },
  discharged: {
    label: "Discharged",
    labelVi: "Da xuat vien",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  pending: {
    label: "Pending",
    labelVi: "Cho xu ly",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
};

export function PatientStatusBadge({
  status,
  className,
}: PatientStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.labelVi}
    </Badge>
  );
}

export { statusConfig };
