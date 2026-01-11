"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import {
  Clock,
  MapPin,
  User,
  Phone,
  MoreHorizontal,
  Edit,
  Trash2,
  XCircle,
  Calendar,
  Copy,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/types/appointment";
import {
  getAppointmentBorderColor,
  appointmentStatusColors,
} from "@/types/appointment";

interface AppointmentCardProps {
  appointment: Appointment;
  variant?: "compact" | "default" | "detailed";
  showActions?: boolean;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onClick?: (appointment: Appointment) => void;
  className?: string;
}

export function AppointmentCard({
  appointment,
  variant = "default",
  showActions = true,
  onEdit,
  onCancel,
  onDelete,
  onReschedule,
  onClick,
  className,
}: AppointmentCardProps) {
  const locale = useLocale();
  const t = useTranslations("schedule");
  const dateLocale = locale === "vi" ? vi : enUS;

  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    return (
      <Badge
        variant="secondary"
        className={cn("text-xs", appointmentStatusColors[status])}
      >
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const getTypeBadge = (type: AppointmentType) => {
    return (
      <Badge variant="outline" className="text-xs">
        {t(`type.${type}`)}
      </Badge>
    );
  };

  const canCancel =
    appointment.status === "scheduled" || appointment.status === "confirmed";
  const canEdit = appointment.status !== "completed" && appointment.status !== "cancelled";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border-l-4 bg-card p-2 cursor-pointer hover:bg-accent/50",
          getAppointmentBorderColor(appointment.type),
          className
        )}
        onClick={() => onClick?.(appointment)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">
              {appointment.patientName}
            </span>
            {getStatusBadge(appointment.status)}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "rounded-lg border border-l-4 bg-card p-4",
          getAppointmentBorderColor(appointment.type),
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {appointment.patientName ? getInitials(appointment.patientName) : "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{appointment.patientName}</h3>
              {appointment.patientMrn && (
                <p className="text-sm text-muted-foreground">MRN: {appointment.patientMrn}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {getTypeBadge(appointment.type)}
                {getStatusBadge(appointment.status)}
              </div>
            </div>
          </div>

          {showActions && canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(appointment)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReschedule?.(appointment)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("actions.reschedule")}
                </DropdownMenuItem>
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onCancel?.(appointment)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("actions.cancel")}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(appointment)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(startTime, "EEEE, d MMMM yyyy", { locale: dateLocale })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({appointment.duration} min)
            </span>
          </div>
          {appointment.therapistName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{appointment.therapistName}</span>
            </div>
          )}
          {appointment.room && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{appointment.room}</span>
            </div>
          )}
          {appointment.patientPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{appointment.patientPhone}</span>
            </div>
          )}
        </div>

        {appointment.notes && (
          <div className="mt-4 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">{t("notes")}:</p>
            <p className="text-muted-foreground">{appointment.notes}</p>
          </div>
        )}

        {appointment.recurrenceId && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Copy className="h-3 w-3" />
            <span>{t("recurring")}</span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-l-4 bg-card p-3 cursor-pointer transition-colors hover:bg-accent/50",
        getAppointmentBorderColor(appointment.type),
        className
      )}
      onClick={() => onClick?.(appointment)}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-xs">
          {appointment.patientName ? getInitials(appointment.patientName) : "??"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{appointment.patientName}</span>
          {getStatusBadge(appointment.status)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </span>
          {appointment.room && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {appointment.room}
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {getTypeBadge(appointment.type)}
          {appointment.therapistName && (
            <span className="text-xs text-muted-foreground">
              {appointment.therapistName}
            </span>
          )}
        </div>
      </div>

      {showActions && canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(appointment);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onReschedule?.(appointment);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t("actions.reschedule")}
            </DropdownMenuItem>
            {canCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel?.(appointment);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("actions.cancel")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
