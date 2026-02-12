"use client";

/**
 * Global invoice list page
 * Displays all invoices across patients with filtering
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Eye,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { InvoicePreview } from "@/components/billing/InvoicePreview";
import { useInvoices } from "@/hooks/use-billing";
import { downloadPDF } from "@/lib/api";
import { formatVND } from "@/lib/currency";
import { formatDate, debounce } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/billing";

/**
 * Invoice status badge
 */
function InvoiceStatusBadge({
  status,
  t,
}: {
  status: InvoiceStatus;
  t: (key: string) => string;
}) {
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

/**
 * Error state component
 */
function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground text-center">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const t = useTranslations("billing");
  const tCommon = useTranslations("common");

  // URL state
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = (searchParams.get("status") as InvoiceStatus) ?? undefined;
  const initialStartDate = searchParams.get("startDate") ?? "";
  const initialEndDate = searchParams.get("endDate") ?? "";

  // Local state
  const [search, setSearch] = React.useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialSearch);
  const [status, setStatus] = React.useState<InvoiceStatus | undefined>(initialStatus);
  const [startDate, setStartDate] = React.useState(initialStartDate);
  const [endDate, setEndDate] = React.useState(initialEndDate);
  const [page, setPage] = React.useState(initialPage);
  const [previewInvoice, setPreviewInvoice] = React.useState<Invoice | null>(null);

  // Debounced search
  const debouncedSetSearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300),
    []
  );

  // Fetch invoices
  const { data, isLoading, isError, refetch } = useInvoices({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    status,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Update URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams();
    if (page > 1) urlParams.set("page", String(page));
    if (debouncedSearch) urlParams.set("search", debouncedSearch);
    if (status) urlParams.set("status", status);
    if (startDate) urlParams.set("startDate", startDate);
    if (endDate) urlParams.set("endDate", endDate);

    const queryString = urlParams.toString();
    router.replace(
      `/billing/invoices${queryString ? `?${queryString}` : ""}`,
      { scroll: false }
    );
  }, [page, debouncedSearch, status, startDate, endDate, locale, router]);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === "all" ? undefined : (value as InvoiceStatus));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowClick = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
  };

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

  // Table columns
  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: t("invoiceNumber"),
      sortable: true,
      className: "w-36",
      render: (_, invoice) => (
        <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: "patientName",
      header: t("patientLabel"),
      sortable: true,
      render: (_, invoice) => (
        <div>
          <p className="font-medium">{invoice.patientName ?? "-"}</p>
          {invoice.patientMrn && (
            <p className="text-xs text-muted-foreground">
              MRN: {invoice.patientMrn}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "invoiceDate",
      header: t("date"),
      sortable: true,
      render: (_, invoice) =>
        formatDate(invoice.invoiceDate, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    },
    {
      key: "totalAmount",
      header: t("total"),
      sortable: true,
      className: "text-right",
      render: (_, invoice) => (
        <span className="font-medium whitespace-nowrap">
          {formatVND(invoice.totalAmount)}
        </span>
      ),
    },
    {
      key: "balanceDue",
      header: t("balanceDue"),
      className: "text-right",
      render: (_, invoice) =>
        invoice.balanceDue > 0 ? (
          <span className="text-destructive font-medium whitespace-nowrap">
            {formatVND(invoice.balanceDue)}
          </span>
        ) : (
          <span className="text-green-600">-</span>
        ),
    },
    {
      key: "status",
      header: t("statusLabel"),
      render: (_, invoice) => (
        <InvoiceStatusBadge status={invoice.status} t={t} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (_, invoice) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewInvoice(invoice);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadInvoicePDF(invoice.id);
            }}
            title={t("print")}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("allInvoices")}</h1>
        <p className="text-muted-foreground">{t("allInvoicesDescription")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Top row: Search + Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder={t("searchInvoices")}
                  className="pl-9"
                />
              </div>

              <Select
                value={status ?? "all"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("status.draft")}</SelectItem>
                  <SelectItem value="pending">{t("status.pending")}</SelectItem>
                  <SelectItem value="paid">{t("status.paid")}</SelectItem>
                  <SelectItem value="partially_paid">{t("status.partially_paid")}</SelectItem>
                  <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bottom row: Date range */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
              <span className="text-muted-foreground text-sm">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                >
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <ErrorState
          message={t("loadError")}
          onRetry={() => refetch()}
          retryLabel={tCommon("retry")}
        />
      )}

      {/* Invoice Table */}
      {!isError && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              keyField="id"
              isLoading={isLoading}
              page={data?.meta.page ?? page}
              pageSize={data?.meta.pageSize ?? 20}
              total={data?.meta.total ?? 0}
              totalPages={data?.meta.totalPages ?? 0}
              onPageChange={handlePageChange}
              onRowClick={handleRowClick}
              emptyMessage={t("noInvoices")}
            />
          </CardContent>
        </Card>
      )}

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
