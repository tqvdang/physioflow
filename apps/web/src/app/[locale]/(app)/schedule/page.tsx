"use client";

import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { useTranslations } from "next-intl";
import { Plus, Filter, Users, RefreshCw, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Calendar } from "@/components/schedule/Calendar";
import { AppointmentDialog } from "@/components/schedule/AppointmentDialog";
import {
  useAppointmentsByDateRange,
  useTherapists,
  useCancelAppointment,
  useDeleteAppointment,
} from "@/hooks/use-appointments";
import type { Appointment, CalendarView, AppointmentStatus, AppointmentType, Therapist } from "@/types/appointment";

export default function SchedulePage() {
  const t = useTranslations("schedule");

  // State
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [view, setView] = React.useState<CalendarView>("week");
  const [selectedTherapistId, setSelectedTherapistId] = React.useState<string>("");
  const [statusFilters, setStatusFilters] = React.useState<AppointmentStatus[]>([
    "scheduled",
    "confirmed",
    "in_progress",
  ]);
  const [typeFilters, setTypeFilters] = React.useState<AppointmentType[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [defaultDialogDate, setDefaultDialogDate] = React.useState<Date | undefined>();
  const [defaultDialogTime, setDefaultDialogTime] = React.useState<string | undefined>();

  // Cancel/Delete confirmation
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [appointmentToAction, setAppointmentToAction] = React.useState<Appointment | null>(null);

  // Calculate date range based on view
  const getDateRange = React.useCallback(() => {
    if (view === "day") {
      return {
        start: format(selectedDate, "yyyy-MM-dd"),
        end: format(addDays(selectedDate, 1), "yyyy-MM-dd"),
      };
    } else if (view === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return {
        start: format(weekStart, "yyyy-MM-dd"),
        end: format(addDays(weekEnd, 1), "yyyy-MM-dd"),
      };
    } else {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      // Add buffer days for calendar display
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = addDays(endOfWeek(monthEnd, { weekStartsOn: 1 }), 1);
      return {
        start: format(calendarStart, "yyyy-MM-dd"),
        end: format(calendarEnd, "yyyy-MM-dd"),
      };
    }
  }, [selectedDate, view]);

  const dateRange = getDateRange();

  // Queries
  const {
    data: therapists = [],
    isError: isTherapistsError,
    error: therapistsError
  } = useTherapists();

  const {
    data: appointments = [],
    isLoading,
    isError: isAppointmentsError,
    error: appointmentsError,
    refetch,
  } = useAppointmentsByDateRange(
    dateRange.start,
    dateRange.end,
    selectedTherapistId || undefined
  );

  // Mutations
  const cancelMutation = useCancelAppointment();
  const deleteMutation = useDeleteAppointment();

  // Filter appointments
  const filteredAppointments = React.useMemo(() => {
    let filtered = appointments;

    if (statusFilters.length > 0) {
      filtered = filtered.filter((a: Appointment) => statusFilters.includes(a.status));
    }

    if (typeFilters.length > 0) {
      filtered = filtered.filter((a: Appointment) => typeFilters.includes(a.type));
    }

    return filtered;
  }, [appointments, statusFilters, typeFilters]);

  // Handlers
  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setDefaultDialogDate(selectedDate);
    setDefaultDialogTime(undefined);
    setDialogOpen(true);
  };

  const handleSlotClick = (date: Date, time: string) => {
    setSelectedAppointment(null);
    setDefaultDialogDate(date);
    setDefaultDialogTime(time);
    setDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToAction) return;

    try {
      await cancelMutation.mutateAsync({
        appointmentId: appointmentToAction.id,
        data: { reason: "Cancelled by user" },
      });
      toast.success(t("toast.cancelled"), {
        description: t("toast.cancelledDesc"),
      });
      refetch();
    } catch (error) {
      toast.error(t("toast.error"), {
        description: error instanceof Error ? error.message : t("toast.errorDesc"),
      });
    } finally {
      setCancelDialogOpen(false);
      setAppointmentToAction(null);
    }
  };

  const confirmDelete = async () => {
    if (!appointmentToAction) return;

    try {
      await deleteMutation.mutateAsync(appointmentToAction.id);
      toast.success(t("toast.deleted"), {
        description: t("toast.deletedDesc"),
      });
      refetch();
    } catch (error) {
      toast.error(t("toast.error"), {
        description: error instanceof Error ? error.message : t("toast.errorDesc"),
      });
    } finally {
      setDeleteDialogOpen(false);
      setAppointmentToAction(null);
    }
  };

  const handleDialogSuccess = () => {
    refetch();
  };

  const toggleStatusFilter = (status: AppointmentStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleTypeFilter = (type: AppointmentType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Therapist Filter */}
          <Select value={selectedTherapistId} onValueChange={setSelectedTherapistId}>
            <SelectTrigger className="w-[200px]">
              <Users className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t("filter.allTherapists")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("filter.allTherapists")}</SelectItem>
              {therapists.map((therapist: Therapist) => (
                <SelectItem key={therapist.id} value={therapist.id}>
                  {therapist.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status/Type Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("filter.label")}>
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("filter.status")}</DropdownMenuLabel>
              {(["scheduled", "confirmed", "in_progress", "completed", "cancelled"] as AppointmentStatus[]).map(
                (status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilters.includes(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  >
                    {t(`status.${status}`)}
                  </DropdownMenuCheckboxItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("filter.type")}</DropdownMenuLabel>
              {(["assessment", "treatment", "followup", "consultation"] as AppointmentType[]).map(
                (type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilters.includes(type)}
                    onCheckedChange={() => toggleTypeFilter(type)}
                  >
                    {t(`type.${type}`)}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label={t("refresh")}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {/* Create Button */}
          <Button onClick={handleCreateAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            {t("createNew")}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {(isAppointmentsError || isTherapistsError) && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error.title")}</AlertTitle>
            <AlertDescription>
              {isAppointmentsError && (
                <p>{t("error.appointmentsLoadFailed")}</p>
              )}
              {isTherapistsError && (
                <p>{t("error.therapistsLoadFailed")}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isAppointmentsError) refetch();
                }}
                className="mt-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("error.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <Calendar
          appointments={filteredAppointments}
          isLoading={isLoading}
          view={view}
          selectedDate={selectedDate}
          selectedTherapistId={selectedTherapistId}
          onDateChange={setSelectedDate}
          onViewChange={setView}
          onAppointmentClick={handleAppointmentClick}
          onSlotClick={handleSlotClick}
        />
      </div>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        defaultDate={defaultDialogDate}
        defaultTime={defaultDialogTime}
        onSuccess={handleDialogSuccess}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? t("cancelDialog.cancelling") : t("cancelDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
