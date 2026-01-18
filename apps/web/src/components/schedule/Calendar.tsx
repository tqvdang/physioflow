"use client";

import * as React from "react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, type Locale } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, CalendarView } from "@/types/appointment";
import { getAppointmentBorderColor, getAppointmentBgColor } from "@/types/appointment";

interface CalendarProps {
  appointments: Appointment[];
  isLoading?: boolean;
  view: CalendarView;
  selectedDate: Date;
  selectedTherapistId?: string;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  _onAppointmentDrop?: (appointment: Appointment, newStartTime: Date) => void;
}

// Time slots for day/week view (8 AM to 6 PM)
const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = (i % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});

export function Calendar({
  appointments,
  isLoading,
  view,
  selectedDate,
  onDateChange,
  onViewChange,
  onAppointmentClick,
  onSlotClick,
}: CalendarProps) {
  const locale = useLocale();
  const t = useTranslations("schedule");
  const dateLocale = locale === "vi" ? vi : enUS;

  const handlePrevious = () => {
    if (view === "day") {
      onDateChange(addDays(selectedDate, -1));
    } else if (view === "week") {
      onDateChange(subWeeks(selectedDate, 1));
    } else {
      onDateChange(subMonths(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "day") {
      onDateChange(addDays(selectedDate, 1));
    } else if (view === "week") {
      onDateChange(addWeeks(selectedDate, 1));
    } else {
      onDateChange(addMonths(selectedDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDateRangeLabel = () => {
    if (view === "day") {
      return format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale });
    } else if (view === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, "d MMM", { locale: dateLocale })} - ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`;
    } else {
      return format(selectedDate, "MMMM yyyy", { locale: dateLocale });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t("today")}
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">{getDateRangeLabel()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => onViewChange(v)}
              >
                {t(`view.${v}`)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <CalendarSkeleton view={view} />
        ) : view === "day" ? (
          <DayView
            date={selectedDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            onSlotClick={onSlotClick}
          />
        ) : view === "week" ? (
          <WeekView
            date={selectedDate}
            appointments={appointments}
            dateLocale={dateLocale}
            onAppointmentClick={onAppointmentClick}
            onSlotClick={onSlotClick}
            onDateChange={onDateChange}
          />
        ) : (
          <MonthView
            date={selectedDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            onDateChange={onDateChange}
          />
        )}
      </div>
    </div>
  );
}

// Day View Component
interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
}

function DayView({ date, appointments, onAppointmentClick, onSlotClick }: DayViewProps) {
  const dayAppointments = appointments.filter((a) =>
    isSameDay(new Date(a.startTime), date)
  );

  const getAppointmentStyle = (appointment: Appointment) => {
    const startTime = new Date(appointment.startTime);
    const hours = startTime.getHours();
    const minutes = startTime.getMinutes();
    const top = ((hours - 8) * 60 + minutes) * (48 / 30); // 48px per 30min slot
    const height = appointment.duration * (48 / 30);
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <ScrollArea className="h-full">
      <div className="relative min-h-[960px]">
        {/* Time grid */}
        <div className="absolute left-0 top-0 w-16 border-r bg-muted/30">
          {TIME_SLOTS.map((time, index) => (
            <div
              key={time}
              className={cn(
                "h-12 border-b px-2 text-xs text-muted-foreground",
                index % 2 === 0 && "font-medium"
              )}
            >
              {index % 2 === 0 && time}
            </div>
          ))}
        </div>

        {/* Appointments area */}
        <div className="ml-16 relative">
          {/* Grid lines */}
          {TIME_SLOTS.map((time, index) => (
            <div
              key={time}
              className={cn(
                "h-12 border-b cursor-pointer hover:bg-accent/50",
                index % 2 === 0 && "border-b-2"
              )}
              onClick={() => onSlotClick?.(date, time)}
            />
          ))}

          {/* Appointments */}
          <div className="absolute inset-0 pointer-events-none">
            {dayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={cn(
                  "absolute left-1 right-1 rounded-md border-l-4 p-2 pointer-events-auto cursor-pointer shadow-sm",
                  getAppointmentBorderColor(appointment.type),
                  getAppointmentBgColor(appointment.type)
                )}
                style={getAppointmentStyle(appointment)}
                onClick={() => onAppointmentClick?.(appointment)}
              >
                <div className="text-xs font-medium truncate">
                  {format(new Date(appointment.startTime), "HH:mm")} - {appointment.patientName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {appointment.therapistName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Week View Component
interface WeekViewProps {
  date: Date;
  appointments: Appointment[];
  dateLocale: Locale;
  onAppointmentClick?: (appointment: Appointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onDateChange: (date: Date) => void;
}

function WeekView({ date, appointments, dateLocale, onAppointmentClick, onSlotClick, onDateChange }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getAppointmentStyle = (appointment: Appointment) => {
    const startTime = new Date(appointment.startTime);
    const hours = startTime.getHours();
    const minutes = startTime.getMinutes();
    const top = ((hours - 8) * 60 + minutes) * (48 / 30);
    const height = Math.max(appointment.duration * (48 / 30), 24);
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Week header */}
      <div className="flex border-b">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 border-l px-2 py-2 text-center cursor-pointer hover:bg-accent/50",
              isSameDay(day, today) && "bg-primary/10"
            )}
            onClick={() => onDateChange(day)}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE", { locale: dateLocale })}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              isSameDay(day, today) && "text-primary"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Week grid */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-[960px]">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r bg-muted/30">
            {TIME_SLOTS.map((time, index) => (
              <div
                key={time}
                className={cn(
                  "h-12 border-b px-2 text-xs text-muted-foreground",
                  index % 2 === 0 && "font-medium"
                )}
              >
                {index % 2 === 0 && time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayAppointments = appointments.filter((a) =>
              isSameDay(new Date(a.startTime), day)
            );

            return (
              <div key={day.toISOString()} className="flex-1 border-l relative">
                {/* Grid lines */}
                {TIME_SLOTS.map((time, index) => (
                  <div
                    key={time}
                    className={cn(
                      "h-12 border-b cursor-pointer hover:bg-accent/30",
                      index % 2 === 0 && "border-b-2"
                    )}
                    onClick={() => onSlotClick?.(day, time)}
                  />
                ))}

                {/* Appointments */}
                <div className="absolute inset-0 pointer-events-none px-0.5">
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded border-l-2 p-1 pointer-events-auto cursor-pointer text-xs shadow-sm",
                        getAppointmentBorderColor(appointment.type),
                        getAppointmentBgColor(appointment.type)
                      )}
                      style={getAppointmentStyle(appointment)}
                      onClick={() => onAppointmentClick?.(appointment)}
                    >
                      <div className="font-medium truncate">
                        {format(new Date(appointment.startTime), "HH:mm")}
                      </div>
                      <div className="truncate">{appointment.patientName}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Month View Component
interface MonthViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateChange: (date: Date) => void;
}

function MonthView({ date, appointments, onAppointmentClick, onDateChange }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex h-full flex-col p-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b pb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-px bg-muted">
        {calendarDays.map((day) => {
          const dayAppointments = appointments.filter((a) =>
            isSameDay(new Date(a.startTime), day)
          );
          const isCurrentMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] bg-background p-1 cursor-pointer hover:bg-accent/30",
                !isCurrentMonth && "text-muted-foreground bg-muted/30"
              )}
              onClick={() => onDateChange(day)}
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="mt-1 space-y-0.5 overflow-hidden">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "rounded px-1 py-0.5 text-xs truncate cursor-pointer",
                      getAppointmentBgColor(appointment.type)
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(appointment);
                    }}
                  >
                    {format(new Date(appointment.startTime), "HH:mm")} {appointment.patientName}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Skeleton loader
function CalendarSkeleton({ view }: { view: CalendarView }) {
  if (view === "month") {
    return (
      <div className="grid grid-cols-7 gap-2 p-4">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-4">
      <div className="w-16 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="flex-1 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
