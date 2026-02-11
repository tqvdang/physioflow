"use client";

/**
 * InvoicePreview - Invoice preview and print component
 * Bilingual template (Vietnamese primary, English secondary)
 * with print-specific styles
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatVND } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import type { Invoice } from "@/types/billing";

interface InvoicePreviewProps {
  invoice: Invoice;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export function InvoicePreview({
  invoice,
  clinicName = "PhysioFlow Clinic",
  clinicAddress,
  clinicPhone,
}: InvoicePreviewProps) {
  const t = useTranslations("billing");
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Print button - hidden when printing */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          {t("print")}
        </Button>
      </div>

      {/* Invoice content */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-8 print:p-0" ref={printRef}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold">{clinicName}</h1>
              {clinicAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  {clinicAddress}
                </p>
              )}
              {clinicPhone && (
                <p className="text-sm text-muted-foreground">
                  {clinicPhone}
                </p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-primary">
                {t("invoiceTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                HOA DON / INVOICE
              </p>
            </div>
          </div>

          {/* Invoice info and patient info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Invoice details */}
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28">
                  {t("invoiceNumber")}:
                </span>
                <span className="font-medium font-mono">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28">
                  {t("invoiceDate")}:
                </span>
                <span>
                  {formatDate(invoice.invoiceDate, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28">
                  {t("statusLabel")}:
                </span>
                <span className="font-medium">
                  {t(`status.${invoice.status}`)}
                </span>
              </div>
            </div>

            {/* Patient details */}
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28">
                  {t("patientLabel")}:
                </span>
                <span className="font-medium">
                  {invoice.patientName ?? "-"}
                </span>
              </div>
              {invoice.patientMrn && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28">MRN:</span>
                  <span className="font-mono">{invoice.patientMrn}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className="rounded-md border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">
                    #
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("serviceName")}
                    <br />
                    <span className="text-xs font-normal">Service</span>
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground w-16">
                    {t("quantity")}
                    <br />
                    <span className="text-xs font-normal">Qty</span>
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    {t("unitPrice")}
                    <br />
                    <span className="text-xs font-normal">Unit Price</span>
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    {t("subtotal")}
                    <br />
                    <span className="text-xs font-normal">Amount</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.lineItems?.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p>{item.descriptionVi ?? item.description}</p>
                        {item.descriptionVi && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {item.isBhytCovered && (
                          <span className="text-xs text-blue-600">
                            BHYT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatVND(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatVND(item.totalPrice)}
                    </td>
                  </tr>
                ))}
                {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      {t("noLineItems")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("subtotal")} / Subtotal
                </span>
                <span>{formatVND(invoice.subtotalAmount)}</span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("discount")} / Discount</span>
                  <span>-{formatVND(invoice.discountAmount)}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("tax")} / Tax
                  </span>
                  <span>{formatVND(invoice.taxAmount)}</span>
                </div>
              )}

              {invoice.insuranceAmount > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>
                    {t("insuranceAmount")} / Insurance
                  </span>
                  <span>-{formatVND(invoice.insuranceAmount)}</span>
                </div>
              )}

              {invoice.insuranceAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("copay")} / Patient Pays
                  </span>
                  <span>{formatVND(invoice.copayAmount)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>
                  {t("total")} / Total
                </span>
                <span className="text-primary">
                  {formatVND(invoice.totalAmount)}
                </span>
              </div>

              {invoice.balanceDue > 0 && invoice.balanceDue !== invoice.totalAmount && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>{t("balanceDue")} / Balance Due</span>
                  <span className="font-medium">
                    {formatVND(invoice.balanceDue)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BHYT claim info */}
          {invoice.bhytClaimNumber && (
            <>
              <Separator className="my-6" />
              <div className="text-sm">
                <p className="font-medium mb-1">{t("bhytClaimInfo")}</p>
                <p className="text-muted-foreground">
                  {t("bhytClaimNumber")}: {invoice.bhytClaimNumber}
                </p>
                {invoice.bhytClaimStatus && (
                  <p className="text-muted-foreground">
                    {t("bhytClaimStatus")}: {invoice.bhytClaimStatus}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator className="my-6" />
              <div className="text-sm">
                <p className="font-medium mb-1">{t("notes")}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <Separator className="my-6" />
          <div className="text-center text-xs text-muted-foreground">
            <p>
              {t("invoiceFooter")}
            </p>
            <p className="mt-1">
              Thank you for choosing {clinicName}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
