"use client";

/**
 * Shared Patient Create/Edit Form Component
 * Based on OpenAPI spec for PhysioFlow API
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { CalendarIcon, X, Plus, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Gender options based on OpenAPI spec
const GENDER_OPTIONS = [
  { value: "male", labelVi: "Nam", labelEn: "Male" },
  { value: "female", labelVi: "Nữ", labelEn: "Female" },
  { value: "other", labelVi: "Khác", labelEn: "Other" },
  { value: "prefer_not_to_say", labelVi: "Không muốn nói", labelEn: "Prefer not to say" },
] as const;

// Language options
const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
] as const;

import { VIETNAMESE_NAME_REGEX, VIETNAMESE_PHONE_REGEX } from "@/lib/validations";

// Vietnamese phone validation
const vietnamesePhoneRegex = VIETNAMESE_PHONE_REGEX;

// Form schema based on OpenAPI CreatePatientRequest
const patientFormSchema = z.object({
  // Required fields
  first_name: z
    .string()
    .min(1, "Vui lòng nhập tên")
    .max(100, "Tên không được quá 100 ký tự"),
  last_name: z
    .string()
    .min(1, "Vui lòng nhập họ")
    .max(100, "Họ không được quá 100 ký tự"),
  date_of_birth: z.date({
    required_error: "Vui lòng chọn ngày sinh",
  }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    required_error: "Vui lòng chọn giới tính",
  }),

  // Vietnamese name fields (optional, validated for Vietnamese characters)
  first_name_vi: z
    .string()
    .max(100, "Tên không được quá 100 ký tự")
    .refine(
      (val) => !val || VIETNAMESE_NAME_REGEX.test(val),
      "Tên tiếng Việt chứa ký tự không hợp lệ"
    )
    .optional()
    .or(z.literal("")),
  last_name_vi: z
    .string()
    .max(100, "Họ không được quá 100 ký tự")
    .refine(
      (val) => !val || VIETNAMESE_NAME_REGEX.test(val),
      "Họ tiếng Việt chứa ký tự không hợp lệ"
    )
    .optional()
    .or(z.literal("")),

  // Contact info
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || vietnamesePhoneRegex.test(val),
      "Số điện thoại không hợp lệ"
    )
    .or(z.literal("")),
  email: z
    .string()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Địa chỉ không được quá 500 ký tự")
    .optional()
    .or(z.literal("")),
  address_vi: z
    .string()
    .max(500, "Địa chỉ không được quá 500 ký tự")
    .optional()
    .or(z.literal("")),

  // Settings
  language_preference: z.enum(["vi", "en"]).default("vi"),

  // Emergency contact
  emergency_contact_name: z
    .string()
    .max(100, "Ten khong duoc qua 100 ky tu")
    .optional()
    .or(z.literal("")),
  emergency_contact_phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || vietnamesePhoneRegex.test(val),
      "So dien thoai khong hop le"
    )
    .or(z.literal("")),
  emergency_contact_relationship: z
    .string()
    .max(50, "Quan he khong duoc qua 50 ky tu")
    .optional()
    .or(z.literal("")),

  // Medical
  medical_alerts: z.array(z.string()).default([]),
  notes: z
    .string()
    .max(2000, "Ghi chu khong duoc qua 2000 ky tu")
    .optional()
    .or(z.literal("")),

  // Status (for edit only)
  is_active: z.boolean().optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

// Transform form values to API format
export function transformToApiFormat(data: PatientFormValues) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    first_name_vi: data.first_name_vi || undefined,
    last_name_vi: data.last_name_vi || undefined,
    date_of_birth: format(data.date_of_birth, "yyyy-MM-dd"),
    gender: data.gender,
    phone: data.phone || undefined,
    email: data.email || undefined,
    address: data.address || undefined,
    address_vi: data.address_vi || undefined,
    language_preference: data.language_preference,
    emergency_contact:
      data.emergency_contact_name || data.emergency_contact_phone
        ? {
            name: data.emergency_contact_name || "",
            phone: data.emergency_contact_phone || "",
            relationship: data.emergency_contact_relationship || "",
          }
        : undefined,
    medical_alerts: data.medical_alerts.length > 0 ? data.medical_alerts : undefined,
    notes: data.notes || undefined,
    is_active: data.is_active,
  };
}

// Date Picker Dialog Component
interface DatePickerDialogProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  locale?: "vi" | "en";
  placeholder?: string;
  dialogTitle?: string;
}

function DatePickerDialog({ value, onChange, locale = "vi", placeholder, dialogTitle }: DatePickerDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value ? (
            format(value, "dd/MM/yyyy", { locale: vi })
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
          locale={locale}
          fromYear={1900}
          toYear={new Date().getFullYear()}
        />
      </DialogContent>
    </Dialog>
  );
}

// Props for the form component
interface PatientFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: PatientFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  locale?: "vi" | "en";
}

export function PatientForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  locale = "vi",
}: PatientFormProps) {
  const t = useTranslations("patientForm");
  const [isEmergencyOpen, setIsEmergencyOpen] = React.useState(
    !!(defaultValues?.emergency_contact_name || defaultValues?.emergency_contact_phone)
  );
  const [newAlert, setNewAlert] = React.useState("");
  const alertInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      first_name_vi: "",
      last_name_vi: "",
      date_of_birth: undefined,
      gender: undefined,
      phone: "",
      email: "",
      address: "",
      address_vi: "",
      language_preference: "vi",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      medical_alerts: [],
      notes: "",
      is_active: true,
      ...defaultValues,
    },
  });

  const medicalAlerts = form.watch("medical_alerts") || [];

  const handleAddAlert = () => {
    const trimmed = newAlert.trim();
    if (trimmed && !medicalAlerts.includes(trimmed)) {
      form.setValue("medical_alerts", [...medicalAlerts, trimmed]);
      setNewAlert("");
      alertInputRef.current?.focus();
    }
  };

  const handleRemoveAlert = (alert: string) => {
    form.setValue(
      "medical_alerts",
      medicalAlerts.filter((a) => a !== alert)
    );
  };

  const handleAlertKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAlert();
    }
  };

  const handleFormSubmit = async (data: PatientFormValues) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("basicInfo.title")}
            </CardTitle>
            <CardDescription>
              {t("basicInfo.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* English Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("fields.firstNameEn")} *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("fields.lastNameEn")} *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vietnamese Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name_vi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("fields.firstNameVi")}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Van A" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t("fields.optional")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name_vi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("fields.lastNameVi")}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DOB and Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.dateOfBirth")} *</FormLabel>
                    <DatePickerDialog
                      value={field.value}
                      onChange={field.onChange}
                      locale={locale}
                      placeholder={t("fields.selectDate")}
                      dialogTitle={t("fields.selectDateOfBirth")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.gender")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("fields.selectGender")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`gender.${option.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Language Preference */}
            <FormField
              control={form.control}
              name="language_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.languagePreference")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("contactInfo.title")}
            </CardTitle>
            <CardDescription>
              {t("contactInfo.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.phone")}</FormLabel>
                    <FormControl>
                      <Input placeholder="0912345678" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t("fields.phoneDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.addressEn")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Street, District, City"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.addressVi")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Duong ABC, Quan XYZ, TP.HCM"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Emergency Contact (Collapsible) */}
        <Card>
          <Collapsible open={isEmergencyOpen} onOpenChange={setIsEmergencyOpen}>
            <CardHeader className="cursor-pointer" onClick={() => setIsEmergencyOpen(!isEmergencyOpen)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {t("emergencyContact.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("emergencyContact.description")}
                    </CardDescription>
                  </div>
                  {isEmergencyOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("fields.emergencyContactName")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("placeholders.emergencyContactName")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("fields.emergencyContactPhone")}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="0987654321" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="emergency_contact_relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("fields.relationship")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("placeholders.relationship")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Medical Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("medicalAlerts.title")}
            </CardTitle>
            <CardDescription>
              {t("medicalAlerts.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alert Tags */}
            {medicalAlerts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {medicalAlerts.map((alert) => (
                  <Badge
                    key={alert}
                    variant="destructive"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {alert}
                    <button
                      type="button"
                      onClick={() => handleRemoveAlert(alert)}
                      className="ml-1 hover:bg-destructive-foreground/20 rounded-full p-0.5"
                      aria-label={`${t("medicalAlerts.removeAlert")}: ${alert}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Alert Input */}
            <div className="flex gap-2">
              <Input
                ref={alertInputRef}
                value={newAlert}
                onChange={(e) => setNewAlert(e.target.value)}
                onKeyDown={handleAlertKeyDown}
                placeholder={t("medicalAlerts.placeholder")}
                aria-label={t("medicalAlerts.inputLabel")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddAlert}
                disabled={!newAlert.trim()}
                aria-label={t("medicalAlerts.addButton")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <FormDescription>
              {t("medicalAlerts.hint")}
            </FormDescription>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("notes.title")}</CardTitle>
            <CardDescription>
              {t("notes.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notes.placeholder")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Status (Edit mode only) */}
        {mode === "edit" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("status.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("status.activeStatus")}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">
                          {t("status.active")}
                        </SelectItem>
                        <SelectItem value="false">
                          {t("status.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <div role="alert" className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("actions.saving")}
              </>
            ) : mode === "create" ? (
              t("actions.create")
            ) : (
              t("actions.save")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
