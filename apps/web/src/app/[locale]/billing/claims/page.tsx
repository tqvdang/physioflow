"use client";

/**
 * BHYT Claim Submission page
 * Generate and manage VSS claim XML files for insurance reimbursement
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FileText,
  Download,
  Plus,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBHYTClaims,
  useGenerateClaim,
  useDownloadClaim,
} from "@/hooks/use-bhyt-claims";
import type { BHYTClaimStatus, BHYTClaimSearchParams } from "@/types/bhyt-claims";
import { formatVND } from "@/lib/currency";

// =============================================================================
// Status Badge Component
// =============================================================================

function ClaimStatusBadge({ status, t }: { status: BHYTClaimStatus; t: (key: string) => string }) {
  const config: Record<BHYTClaimStatus, { className: string; icon: React.ReactNode }> = {
    pending: {
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    submitted: {
      className: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <Send className="h-3 w-3 mr-1" />,
    },
    approved: {
      className: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
    },
    rejected: {
      className: "bg-red-100 text-red-800 border-red-200",
      icon: <XCircle className="h-3 w-3 mr-1" />,
    },
  };

  const { className, icon } = config[status] ?? config.pending;

  return (
    <Badge variant="outline" className={className}>
      {icon}
      {t(`claims.status.${status}`)}
    </Badge>
  );
}

// =============================================================================
// Generate Claim Dialog
// =============================================================================

function GenerateClaimDialog({
  t,
  onSuccess,
}: {
  t: (key: string) => string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [facilityCode, setFacilityCode] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [year, setYear] = React.useState("");

  const generateMutation = useGenerateClaim();

  // Set defaults
  React.useEffect(() => {
    if (open) {
      const now = new Date();
      // Default to previous month
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      setMonth(String(prevMonth));
      setYear(String(prevYear));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityCode || !month || !year) return;

    try {
      await generateMutation.mutateAsync({
        facilityCode,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      });
      setOpen(false);
      setFacilityCode("");
      onSuccess();
    } catch {
      // Error handled by mutation state
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: t(`claims.months.${i + 1}`),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("claims.generate")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("claims.generateTitle")}</DialogTitle>
            <DialogDescription>{t("claims.generateDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="facilityCode">{t("claims.facilityCode")}</Label>
              <Input
                id="facilityCode"
                value={facilityCode}
                onChange={(e) => setFacilityCode(e.target.value)}
                placeholder={t("claims.facilityCodePlaceholder")}
                required
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="month">{t("claims.monthLabel")}</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder={t("claims.selectMonth")} />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="year">{t("claims.yearLabel")}</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder={t("claims.selectYear")} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {generateMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>
                {(generateMutation.error as Error)?.message ?? t("claims.generateError")}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("claims.cancel")}
            </Button>
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? t("claims.generating") : t("claims.generate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function ClaimsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "vi";
  const t = useTranslations("billing");

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [yearFilter, setYearFilter] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  const searchParams: BHYTClaimSearchParams = {
    status: statusFilter === "all" ? undefined : (statusFilter as BHYTClaimStatus),
    year: yearFilter ? parseInt(yearFilter, 10) : undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isError, refetch } = useBHYTClaims(searchParams);
  const downloadMutation = useDownloadClaim();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  const handleDownload = (claimId: string) => {
    downloadMutation.mutate(claimId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("claims.title")}</h1>
          <p className="text-muted-foreground">{t("claims.subtitle")}</p>
        </div>
        <GenerateClaimDialog t={t} onSuccess={() => refetch()} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("claims.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("claims.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("claims.status.pending")}</SelectItem>
                <SelectItem value="submitted">{t("claims.status.submitted")}</SelectItem>
                <SelectItem value="approved">{t("claims.status.approved")}</SelectItem>
                <SelectItem value="rejected">{t("claims.status.rejected")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={yearFilter || "all"}
              onValueChange={(v) => {
                setYearFilter(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder={t("claims.allYears")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("claims.allYears")}</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground text-center">{t("claims.loadError")}</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("claims.retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Claims Table */}
      {!isError && (
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t("claims.loading")}</span>
              </div>
            ) : (data?.data?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t("claims.noClaims")}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("claims.period")}</TableHead>
                      <TableHead>{t("claims.facilityCode")}</TableHead>
                      <TableHead>{t("claims.fileName")}</TableHead>
                      <TableHead className="text-right">{t("claims.totalAmount")}</TableHead>
                      <TableHead className="text-right">{t("claims.insuranceAmount")}</TableHead>
                      <TableHead className="text-center">{t("claims.items")}</TableHead>
                      <TableHead>{t("claims.statusLabel")}</TableHead>
                      <TableHead className="text-center">{t("claims.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">
                          {String(claim.month).padStart(2, "0")}/{claim.year}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {claim.facilityCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{claim.fileName}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatVND(claim.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-blue-600">
                          {formatVND(claim.totalInsuranceAmount)}
                        </TableCell>
                        <TableCell className="text-center">{claim.lineItemCount}</TableCell>
                        <TableCell>
                          <ClaimStatusBadge status={claim.status} t={t} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(claim.id)}
                            disabled={downloadMutation.isPending}
                            title={t("claims.download")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data && data.meta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {t("claims.showing", {
                        from: (data.meta.page - 1) * data.meta.pageSize + 1,
                        to: Math.min(data.meta.page * data.meta.pageSize, data.meta.total),
                        total: data.meta.total,
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        {t("claims.previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                        disabled={page >= data.meta.totalPages}
                      >
                        {t("claims.next")}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
