"use client";

/**
 * Patient Billing page
 * Displays invoice management and payment history for a specific patient
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Plus,
  Eye,
  Download,
  FileText,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/billing/InvoiceForm";
import { InvoicePreview } from "@/components/billing/InvoicePreview";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { usePatient, usePatientDashboard } from "@/hooks/use-patients";
import { usePatientInvoices } from "@/hooks/use-billing";
import { downloadPDF } from "@/lib/api";
import { formatVND } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/billing";
import type { PatientInsurance } from "@/types/patient";

/**
 * Invoice status badge
 */
function InvoiceStatusBadge({ status, t }: { status: InvoiceStatus; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    approved: "bg-indigo-100 text-indigo-800 border-indigo-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    partially_paid: "bg-orange-100 text-orange-800 border-orange-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
    void: "bg-gray-100 text-gray-400 border-gray-200",
  };

  return (
    <Badge variant="outline" className={styles[status] ?? styles.draft}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export default function PatientBillingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const patientId = params.id as string;

  const t = useTranslations("billing");
  const tCommon = useTranslations("common");

  // State
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [previewInvoice, setPreviewInvoice] = React.useState<Invoice | null>(null);

  // Fetch data
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const { data: dashboard } = usePatientDashboard(patientId);
  const { data: invoices, isLoading: isLoadingInvoices } = usePatientInvoices(patientId);

  const handleDownloadInvoicePDF = async (invoiceId: string) => {
    try {
      await downloadPDF(
        `/v1/reports/invoice/${invoiceId}/pdf`,
        undefined,
        { locale }
      );
      toast.success(t("pdfDownloaded"));
    } catch {
      toast.error(t("pdfDownloadError"));
    }
  };

  // Get primary insurance from dashboard
  const primaryInsurance = dashboard?.insuranceInfo?.find(
    (ins: PatientInsurance) => ins.isPrimary && ins.isActive
  );

  const patientName = patient
    ? (locale === "en" && patient.nameEn ? patient.nameEn : patient.nameVi)
    : "";

  // Loading state
  if (isLoadingPatient) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found
  if (!patient) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Patient not found</p>
        <Link href={"/patients"}>
          <Button className="mt-4">{tCommon("retry")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{patientName}</p>
          </div>
        </div>

        {/* Create invoice button */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("createInvoice")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createInvoice")}</DialogTitle>
              <DialogDescription>
                {t("createInvoiceDescription")}
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              patientId={patientId}
              patientName={patientName}
              insurance={primaryInsurance}
              onSuccess={() => setCreateDialogOpen(false)}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs: Invoices vs Payments */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("invoices")}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {t("payments")}
          </TabsTrigger>
        </TabsList>

        {/* Invoices tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("invoiceList")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("noInvoices")}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            {t("invoiceNumber")}
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            {t("date")}
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                            {t("total")}
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                            {t("balanceDue")}
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            {t("statusLabel")}
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                            {t("actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => setPreviewInvoice(invoice)}
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(invoice.invoiceDate, {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                              {formatVND(invoice.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {invoice.balanceDue > 0 ? (
                                <span className="text-destructive font-medium">
                                  {formatVND(invoice.balanceDue)}
                                </span>
                              ) : (
                                <span className="text-green-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <InvoiceStatusBadge status={invoice.status} t={t} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewInvoice(invoice);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadInvoicePDF(invoice.id);
                                  }}
                                  title={t("print")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments" className="mt-4">
          <PaymentHistory patientId={patientId} />
        </TabsContent>
      </Tabs>

      {/* Invoice preview dialog */}
      <Dialog
        open={previewInvoice !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewInvoice(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("invoice")} {previewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoicePDF(previewInvoice.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("print")}
                </Button>
              </div>
              <InvoicePreview invoice={previewInvoice} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
