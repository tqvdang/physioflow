"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { format, addMinutes, parseISO, setHours, setMinutes } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, Search, Loader2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/toast";
import { usePatientSearch } from "@/hooks/usePatients";
import { useTherapists, useTherapistAvailability, useCreateAppointment, useUpdateAppointment } from "@/hooks/useAppointments";
import type {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentType,
  RecurrencePattern,
  Therapist,
  AvailabilitySlot,
} from "@/types/appointment";
import { durationOptions, appointmentTypeOptions, recurrenceOptions } from "@/types/appointment";
import type { Patient } from "@/types/patient";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultPatientId?: string;
  onSuccess?: (appointment: Appointment) => void;
}

interface FormValues {
  patientId: string;
  therapistId: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  room: string;
  notes: string;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate: string;
  recurrenceCount: number;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultTime,
  defaultPatientId,
  onSuccess,
}: AppointmentDialogProps) {
  const locale = useLocale();
  const t = useTranslations("schedule");
  const { toast } = useToast();
  const dateLocale = locale === "vi" ? vi : enUS;

  const isEditing = !!appointment;

  // Patient search state
  const [patientSearch, setPatientSearch] = React.useState("");
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = React.useState(false);

  // Queries
  const { data: therapists = [], isLoading: loadingTherapists } = useTherapists();
  const { data: searchResults = [], isLoading: searchingPatients } = usePatientSearch(
    patientSearch,
    patientSearch.length >= 2
  );

  // Mutations
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment(appointment?.id ?? "");

  // Form
  const form = useForm<FormValues>({
    defaultValues: {
      patientId: "",
      therapistId: "",
      date: format(defaultDate ?? new Date(), "yyyy-MM-dd"),
      time: defaultTime ?? "09:00",
      duration: 30,
      type: "treatment",
      room: "",
      notes: "",
      recurrencePattern: "none",
      recurrenceEndDate: "",
      recurrenceCount: 4,
    },
  });

  const selectedTherapistId = form.watch("therapistId");
  const selectedDate = form.watch("date");
  const selectedDuration = form.watch("duration");

  // Availability query
  const { data: availableSlots = [], isLoading: loadingSlots } = useTherapistAvailability(
    selectedTherapistId,
    selectedDate,
    selectedDuration,
    !!selectedTherapistId && !!selectedDate
  );

  // Reset form when dialog opens/closes or appointment changes
  React.useEffect(() => {
    if (open) {
      if (appointment) {
        const startTime = new Date(appointment.startTime);
        form.reset({
          patientId: appointment.patientId,
          therapistId: appointment.therapistId,
          date: format(startTime, "yyyy-MM-dd"),
          time: format(startTime, "HH:mm"),
          duration: appointment.duration,
          type: appointment.type,
          room: appointment.room ?? "",
          notes: appointment.notes ?? "",
          recurrencePattern: "none",
          recurrenceEndDate: "",
          recurrenceCount: 4,
        });
        setSelectedPatient({
          id: appointment.patientId,
          nameVi: appointment.patientName ?? "",
          mrn: appointment.patientMrn ?? "",
        } as Patient);
      } else {
        form.reset({
          patientId: defaultPatientId ?? "",
          therapistId: "",
          date: format(defaultDate ?? new Date(), "yyyy-MM-dd"),
          time: defaultTime ?? "09:00",
          duration: 30,
          type: "treatment",
          room: "",
          notes: "",
          recurrencePattern: "none",
          recurrenceEndDate: "",
          recurrenceCount: 4,
        });
        setSelectedPatient(null);
      }
    }
  }, [open, appointment, defaultDate, defaultTime, defaultPatientId, form]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    form.setValue("patientId", patient.id);
    setShowPatientSearch(false);
    setPatientSearch("");
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    const startTime = new Date(slot.startTime);
    form.setValue("time", format(startTime, "HH:mm"));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Build start time from date and time
      const [hours, minutes] = values.time.split(":").map(Number);
      const startDate = parseISO(values.date);
      const startTime = setMinutes(setHours(startDate, hours), minutes);

      if (isEditing) {
        const updateData: UpdateAppointmentRequest = {
          startTime: startTime.toISOString(),
          duration: values.duration,
          type: values.type,
          room: values.room || undefined,
          notes: values.notes || undefined,
          therapistId: values.therapistId,
        };

        const result = await updateMutation.mutateAsync(updateData);
        toast({
          title: t("toast.updated"),
          description: t("toast.updatedDesc"),
        });
        onSuccess?.(result);
      } else {
        const createData: CreateAppointmentRequest = {
          patientId: values.patientId,
          therapistId: values.therapistId,
          startTime: startTime.toISOString(),
          duration: values.duration,
          type: values.type,
          room: values.room || undefined,
          notes: values.notes || undefined,
          recurrencePattern: values.recurrencePattern !== "none" ? values.recurrencePattern : undefined,
          recurrenceEndDate: values.recurrenceEndDate || undefined,
          recurrenceCount: values.recurrencePattern !== "none" ? values.recurrenceCount : undefined,
        };

        const result = await createMutation.mutateAsync(createData);
        toast({
          title: t("toast.created"),
          description: t("toast.createdDesc"),
        });
        onSuccess?.(result);
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: t("toast.error"),
        description: error instanceof Error ? error.message : t("toast.errorDesc"),
        variant: "destructive",
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("dialog.editTitle") : t("dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("dialog.editDesc") : t("dialog.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Patient Selection */}
              <FormField
                control={form.control}
                name="patientId"
                rules={{ required: t("validation.patientRequired") }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.patient")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        {selectedPatient ? (
                          <div className="flex items-center justify-between rounded-md border p-2">
                            <div>
                              <p className="font-medium">{selectedPatient.nameVi}</p>
                              <p className="text-sm text-muted-foreground">
                                MRN: {selectedPatient.mrn}
                              </p>
                            </div>
                            {!isEditing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPatient(null);
                                  form.setValue("patientId", "");
                                  setShowPatientSearch(true);
                                }}
                              >
                                {t("form.change")}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder={t("form.searchPatient")}
                                className="pl-9"
                                value={patientSearch}
                                onChange={(e) => {
                                  setPatientSearch(e.target.value);
                                  setShowPatientSearch(true);
                                }}
                                onFocus={() => setShowPatientSearch(true)}
                              />
                            </div>
                            {showPatientSearch && patientSearch.length >= 2 && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                                {searchingPatients ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : searchResults.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    {t("form.noPatients")}
                                  </div>
                                ) : (
                                  <div className="max-h-48 overflow-auto">
                                    {searchResults.map((patient) => (
                                      <button
                                        key={patient.id}
                                        type="button"
                                        className="w-full px-4 py-2 text-left hover:bg-accent"
                                        onClick={() => handlePatientSelect(patient)}
                                      >
                                        <p className="font-medium">{patient.nameVi}</p>
                                        <p className="text-sm text-muted-foreground">
                                          MRN: {patient.mrn}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Therapist Selection */}
              <FormField
                control={form.control}
                name="therapistId"
                rules={{ required: t("validation.therapistRequired") }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.therapist")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.selectTherapist")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {therapists.map((therapist) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            {therapist.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  rules={{ required: t("validation.dateRequired") }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  rules={{ required: t("validation.timeRequired") }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.time")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Available Slots */}
              {selectedTherapistId && selectedDate && !isEditing && (
                <div>
                  <FormLabel>{t("form.availableSlots")}</FormLabel>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      <AlertCircle className="inline-block mr-2 h-4 w-4" />
                      {t("form.noSlots")}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableSlots.slice(0, 12).map((slot) => {
                        const slotTime = format(new Date(slot.startTime), "HH:mm");
                        const isSelected = form.watch("time") === slotTime;
                        return (
                          <Button
                            key={slot.startTime}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSlotSelect(slot)}
                          >
                            {slotTime}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Duration and Type */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.duration")}</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appointmentTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(`type.${option.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Room */}
              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.room")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.roomPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.notes")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.notesPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recurrence (only for new appointments) */}
              {!isEditing && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.recurrence")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {recurrenceOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(`recurrence.${option.value}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("recurrencePattern") !== "none" && (
                    <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
                      <FormField
                        control={form.control}
                        name="recurrenceCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("form.recurrenceCount")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={52}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("form.recurrenceCountDesc")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurrenceEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("form.recurrenceEndDate")}</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              {t("form.recurrenceEndDateDesc")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t("dialog.save") : t("dialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
