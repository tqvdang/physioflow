"use client";

/**
 * Insurance Card Form Component
 * Create/Edit BHYT insurance card with real-time validation
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { CalendarIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BHYT_PREFIX_CODES,
  validateBhytCardLocal,
  type InsuranceFormData,
  type Insurance,
} from "@/hooks/use-insurance";

// BHYT card number regex: 2 letters + 13 digits = 15 chars
const BHYT_CARD_REGEX = /^[A-Z]{2}\d{13}$/;

// Form validation schema
const insuranceFormSchema = z
  .object({
    card_number: z
      .string()
      .min(1, "Vui long nhap so the BHYT")
      .transform((val) => val.toUpperCase())
      .pipe(
        z
          .string()
          .regex(BHYT_CARD_REGEX, "Dinh dang the khong dung (VD: DN4012345678901)")
      ),
    prefix_code: z.string().min(1, "Vui long chon ma dau the"),
    hospital_registration_code: z
      .string()
      .optional()
      .refine((val) => !val || val.length === 5, {
        message: "Ma KCB ban dau phai co dung 5 ky tu",
      }),
    expiration_date: z.date().optional().nullable(),
    valid_from: z.date({
      required_error: "Vui long chon ngay bat dau",
    }),
    valid_to: z.date({
      required_error: "Vui long chon ngay ket thuc",
    }),
    coverage_percent: z.coerce
      .number()
      .min(0, "Ty le chi tra phai tu 0-100")
      .max(100, "Ty le chi tra phai tu 0-100"),
    copay_rate: z.coerce
      .number()
      .min(0, "Ty le dong chi tra phai tu 0-100")
      .max(100, "Ty le dong chi tra phai tu 0-100"),
  })
  .refine((data) => data.valid_from < data.valid_to, {
    message: "Ngay bat dau phai truoc ngay ket thuc",
    path: ["valid_to"],
  });

type InsuranceFormValues = z.infer<typeof insuranceFormSchema>;

/**
 * Date Picker Dialog Component (reused from PatientForm pattern)
 */
interface DatePickerDialogProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  locale?: "vi" | "en";
  placeholder?: string;
  dialogTitle?: string;
  disabledFn?: (date: Date) => boolean;
}

function DatePickerDialog({
  value,
  onChange,
  locale: localeStr = "vi",
  placeholder,
  dialogTitle,
  disabledFn,
}: DatePickerDialogProps) {
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
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledFn}
          locale={localeStr}
          fromYear={2000}
          toYear={new Date().getFullYear() + 10}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Transform Insurance to form default values
 */
function insuranceToFormValues(insurance: Insurance): Partial<InsuranceFormValues> {
  return {
    card_number: insurance.cardNumber,
    prefix_code: insurance.prefix,
    hospital_registration_code: insurance.hospitalRegistrationCode || "",
    expiration_date: insurance.expirationDate ? new Date(insurance.expirationDate) : undefined,
    valid_from: new Date(insurance.validFrom),
    valid_to: insurance.validTo ? new Date(insurance.validTo) : undefined,
    coverage_percent: BHYT_PREFIX_CODES.find((p) => p.value === insurance.prefix)?.coverage ?? 80,
    copay_rate: 100 - (BHYT_PREFIX_CODES.find((p) => p.value === insurance.prefix)?.coverage ?? 80),
  };
}

/**
 * Transform form values to API format
 */
function formValuesToApi(data: InsuranceFormValues): InsuranceFormData {
  return {
    card_number: data.card_number,
    prefix_code: data.prefix_code,
    holder_name: "",
    holder_name_vi: "",
    date_of_birth: "",
    registered_facility_code: "",
    hospital_registration_code: data.hospital_registration_code || undefined,
    expiration_date: data.expiration_date ? format(data.expiration_date, "yyyy-MM-dd") : undefined,
    valid_from: format(data.valid_from, "yyyy-MM-dd"),
    valid_to: data.valid_to ? format(data.valid_to, "yyyy-MM-dd") : undefined,
    coverage_percent: data.coverage_percent,
    copay_rate: data.copay_rate,
  };
}

// Props
interface InsuranceCardFormProps {
  mode: "create" | "edit";
  defaultValues?: Insurance;
  onSubmit: (data: InsuranceFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  locale?: "vi" | "en";
}

export function InsuranceCardForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  locale = "vi",
}: InsuranceCardFormProps) {
  const t = useTranslations("insurance");
  const [validationBadge, setValidationBadge] = React.useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const form = useForm<InsuranceFormValues>({
    resolver: zodResolver(insuranceFormSchema),
    defaultValues: {
      card_number: "",
      prefix_code: "",
      hospital_registration_code: "",
      expiration_date: undefined,
      valid_from: undefined,
      valid_to: undefined,
      coverage_percent: 80,
      copay_rate: 20,
      ...(defaultValues ? insuranceToFormValues(defaultValues) : {}),
    },
  });

  // Watch card_number for real-time validation
  const cardNumber = form.watch("card_number");

  React.useEffect(() => {
    if (!cardNumber || cardNumber.length < 2) {
      setValidationBadge(null);
      return;
    }

    const trimmed = cardNumber.toUpperCase();

    // Only validate when we have a full card number
    if (trimmed.length === 15) {
      const result = validateBhytCardLocal(trimmed);
      if (result.valid) {
        setValidationBadge({ valid: true, message: t("validation.valid") });
        // Auto-set prefix code and coverage
        form.setValue("prefix_code", result.prefixCode);
        form.setValue("coverage_percent", result.defaultCoverage);
        form.setValue("copay_rate", 100 - result.defaultCoverage);
      } else if (result.errorCode === "invalid_prefix") {
        setValidationBadge({ valid: false, message: t("validation.invalidPrefix") });
      } else {
        setValidationBadge({ valid: false, message: t("validation.invalidFormat") });
      }
    } else if (trimmed.length > 0) {
      // Partial input - check prefix as user types
      if (trimmed.length >= 2) {
        const prefixCode = trimmed.substring(0, 2);
        const prefix = BHYT_PREFIX_CODES.find((p) => p.value === prefixCode);
        if (prefix) {
          form.setValue("prefix_code", prefix.value);
          form.setValue("coverage_percent", prefix.coverage);
          form.setValue("copay_rate", 100 - prefix.coverage);
        }
      }
      setValidationBadge(null);
    }
  }, [cardNumber, form, t]);

  // When prefix_code changes manually, update coverage
  const handlePrefixChange = (value: string) => {
    form.setValue("prefix_code", value);
    const prefix = BHYT_PREFIX_CODES.find((p) => p.value === value);
    if (prefix) {
      form.setValue("coverage_percent", prefix.coverage);
      form.setValue("copay_rate", 100 - prefix.coverage);
    }
  };

  const handleFormSubmit = async (data: InsuranceFormValues) => {
    const apiData = formValuesToApi(data);
    await onSubmit(apiData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create" ? t("actions.add") : t("actions.edit")}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? t("form.createDescription")
                : t("form.editDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Card Number */}
            <FormField
              control={form.control}
              name="card_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("card.number")} *</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        placeholder="DN4012345678901"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase());
                        }}
                        maxLength={15}
                        className="font-mono"
                      />
                    </FormControl>
                    {validationBadge && (
                      <Badge
                        variant={validationBadge.valid ? "default" : "destructive"}
                        className={cn(
                          "flex-shrink-0",
                          validationBadge.valid &&
                            "bg-green-100 text-green-800 hover:bg-green-100"
                        )}
                      >
                        {validationBadge.message}
                      </Badge>
                    )}
                  </div>
                  <FormDescription>{t("form.cardNumberHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prefix Code */}
            <FormField
              control={form.control}
              name="prefix_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("card.prefix")} *</FormLabel>
                  <Select
                    onValueChange={handlePrefixChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectPrefix")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BHYT_PREFIX_CODES.map((prefix) => (
                        <SelectItem key={prefix.value} value={prefix.value}>
                          {prefix.label} ({prefix.coverage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hospital Registration Code */}
            <FormField
              control={form.control}
              name="hospital_registration_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("card.hospitalRegCode")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="79024"
                      {...field}
                      maxLength={5}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>{t("form.hospitalRegCodeHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expiration_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("card.expirationDate")}</FormLabel>
                  <DatePickerDialog
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    locale={locale}
                    placeholder={t("form.selectDate")}
                    dialogTitle={t("card.expirationDate")}
                  />
                  <FormDescription>{t("form.expirationDateHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valid From / Valid To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("card.validFrom")} *</FormLabel>
                    <DatePickerDialog
                      value={field.value}
                      onChange={field.onChange}
                      locale={locale}
                      placeholder={t("form.selectDate")}
                      dialogTitle={t("card.validFrom")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("card.validTo")} *</FormLabel>
                    <DatePickerDialog
                      value={field.value}
                      onChange={field.onChange}
                      locale={locale}
                      placeholder={t("form.selectDate")}
                      dialogTitle={t("card.validTo")}
                      disabledFn={(date) => {
                        const validFrom = form.getValues("valid_from");
                        return validFrom ? date < validFrom : false;
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Coverage Percent / Copay Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coverage_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("card.coverage")} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            field.onChange(value);
                            form.setValue("copay_rate", 100 - value);
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copay_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("card.copay")} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            field.onChange(value);
                            form.setValue("coverage_percent", 100 - value);
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("form.saving")}
              </>
            ) : (
              t("actions.save")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export { formValuesToApi, type InsuranceFormValues };
