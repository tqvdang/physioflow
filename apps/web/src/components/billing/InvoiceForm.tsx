"use client";

/**
 * InvoiceForm - Form for creating invoices
 * Supports service code multi-selection, real-time total calculation,
 * and insurance coverage preview
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ServiceCodeSelector } from "./ServiceCodeSelector";
import { useCreateInvoice } from "@/hooks/use-billing";
import { formatVND } from "@/lib/currency";
import type { ServiceCode, CreateInvoiceRequest } from "@/types/billing";
import type { PatientInsurance } from "@/types/patient";

interface SelectedService {
  serviceCode: ServiceCode;
  quantity: number;
}

interface InvoiceFormProps {
  patientId: string;
  patientName: string;
  /** Patient insurance info for coverage preview */
  insurance?: PatientInsurance;
  /** Called after successful invoice creation */
  onSuccess?: () => void;
  /** Called when the form is cancelled */
  onCancel?: () => void;
}

export function InvoiceForm({
  patientId,
  patientName,
  insurance,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const t = useTranslations("billing");
  const tCommon = useTranslations("common");

  const [selectedServices, setSelectedServices] = React.useState<SelectedService[]>([]);
  const [notes, setNotes] = React.useState("");
  const createInvoice = useCreateInvoice();

  // Add a service to the list
  const handleAddService = (serviceCode: ServiceCode) => {
    const existing = selectedServices.find(
      (s) => s.serviceCode.id === serviceCode.id
    );
    if (existing) {
      // Increment quantity if already selected
      setSelectedServices((prev) =>
        prev.map((s) =>
          s.serviceCode.id === serviceCode.id
            ? { ...s, quantity: s.quantity + 1 }
            : s
        )
      );
    } else {
      setSelectedServices((prev) => [
        ...prev,
        { serviceCode, quantity: 1 },
      ]);
    }
  };

  // Remove a service from the list
  const handleRemoveService = (serviceCodeId: string) => {
    setSelectedServices((prev) =>
      prev.filter((s) => s.serviceCode.id !== serviceCodeId)
    );
  };

  // Update quantity for a service
  const handleQuantityChange = (serviceCodeId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.serviceCode.id === serviceCodeId ? { ...s, quantity } : s
      )
    );
  };

  // Calculate totals
  const subtotal = selectedServices.reduce(
    (sum, s) => sum + s.serviceCode.unitPrice * s.quantity,
    0
  );

  const insuranceAmount = insurance
    ? selectedServices.reduce((sum, s) => {
        if (s.serviceCode.isBhytCovered && insurance.coveragePercentage > 0) {
          const rate = s.serviceCode.bhytReimbursementRate ?? insurance.coveragePercentage;
          return sum + (s.serviceCode.unitPrice * s.quantity * rate) / 100;
        }
        return sum;
      }, 0)
    : 0;

  const copay = subtotal - insuranceAmount;
  const total = copay;

  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (selectedServices.length === 0) {
      setValidationError(t("validation.noLineItems"));
      return;
    }

    // Validate all quantities are positive
    const invalidQty = selectedServices.find((s) => s.quantity < 1);
    if (invalidQty) {
      setValidationError(t("validation.invalidQuantity"));
      return;
    }

    const request: CreateInvoiceRequest = {
      patientId,
      notes: notes || undefined,
      lineItems: selectedServices.map((s) => ({
        serviceCodeId: s.serviceCode.id,
        description: s.serviceCode.serviceName,
        descriptionVi: s.serviceCode.serviceNameVi,
        quantity: s.quantity,
        unitPrice: s.serviceCode.unitPrice,
      })),
    };

    try {
      await createInvoice.mutateAsync(request);
      onSuccess?.();
    } catch {
      // Error is handled by the mutation state
    }
  };

  const selectedIds = selectedServices.map((s) => s.serviceCode.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient info */}
      <div>
        <Label className="text-sm text-muted-foreground">
          {t("patientLabel")}
        </Label>
        <p className="font-medium">{patientName}</p>
      </div>

      {/* Insurance info */}
      {insurance && (
        <div className="rounded-lg border bg-blue-50 p-3 text-sm">
          <p className="font-medium text-blue-800">{t("insuranceInfo")}</p>
          <p className="text-blue-700">
            {insurance.provider} - {t("coverageRate")}: {insurance.coveragePercentage}%
          </p>
        </div>
      )}

      {/* Service code selector */}
      <div className="space-y-3">
        <Label>{t("serviceCode")}</Label>
        <ServiceCodeSelector
          onSelect={handleAddService}
          selectedIds={selectedIds}
        />
      </div>

      {/* Selected services table */}
      {selectedServices.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("serviceCode")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("serviceName")}
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                    {t("duration")}
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground w-20">
                    {t("quantity")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    {t("unitPrice")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    {t("subtotal")}
                  </th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedServices.map((s) => (
                  <tr key={s.serviceCode.id}>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">
                        {s.serviceCode.code}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div>
                        <p>{s.serviceCode.serviceNameVi}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.serviceCode.serviceName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-muted-foreground">
                      {s.serviceCode.durationMinutes
                        ? `${s.serviceCode.durationMinutes} ${t("minutes")}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={s.quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            s.serviceCode.id,
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-16 text-center mx-auto"
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {formatVND(s.serviceCode.unitPrice)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                      {formatVND(s.serviceCode.unitPrice * s.quantity)}
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveService(s.serviceCode.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      {selectedServices.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          {insurance && insuranceAmount > 0 && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>{t("insuranceAmount")}</span>
              <span>-{formatVND(insuranceAmount)}</span>
            </div>
          )}
          {insurance && insuranceAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("copay")}</span>
              <span>{formatVND(copay)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>{t("total")}</span>
            <span className="text-primary">{formatVND(total)}</span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="invoice-notes">{t("notes")}</Label>
        <Textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={selectedServices.length === 0 || createInvoice.isPending}
        >
          {createInvoice.isPending ? t("creating") : t("createInvoice")}
        </Button>
      </div>

      {/* Validation error message */}
      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}

      {/* API error message */}
      {createInvoice.isError && (
        <p className="text-sm text-destructive">
          {createInvoice.error instanceof Error
            ? createInvoice.error.message
            : t("createError")}
        </p>
      )}
    </form>
  );
}
