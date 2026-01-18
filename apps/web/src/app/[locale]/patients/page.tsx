"use client";

/**
 * Patient list page
 * Displays searchable, filterable list of patients with pagination
 */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PatientStatusBadge } from "@/components/patient";
import { usePatients } from "@/hooks/use-patients";
import { formatDate, debounce } from "@/lib/utils";
import type { Patient, PatientStatus } from "@/types/patient";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Play,
  Filter,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

export default function PatientsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? "vi";

  // Translations
  const t = useTranslations("patients");
  const tCommon = useTranslations("common");

  // URL state
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = (searchParams.get("status") as PatientStatus) ?? undefined;
  const initialSortBy = searchParams.get("sortBy") ?? "createdAt";
  const initialSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";

  // Local state
  const [search, setSearch] = React.useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialSearch);
  const [status, setStatus] = React.useState<PatientStatus | undefined>(initialStatus);
  const [page, setPage] = React.useState(initialPage);
  const [sortBy, setSortBy] = React.useState(initialSortBy);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(initialSortOrder);

  // Debounced search
  const debouncedSetSearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300),
    []
  );

  // Fetch patients
  const { data, isLoading, isError, refetch } = usePatients({
    page,
    pageSize: 10,
    search: debouncedSearch,
    status,
    sortBy,
    sortOrder,
  });

  // Update URL params
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);

    const queryString = params.toString();
    router.replace(`/${locale}/patients${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [page, debouncedSearch, status, sortBy, sortOrder, locale, router]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  // Handle status filter
  const handleStatusChange = (value: string) => {
    setStatus(value === "all" ? undefined : (value as PatientStatus));
    setPage(1);
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Navigate to patient
  const handleRowClick = (patient: Patient) => {
    router.push(`/${locale}/patients/${patient.id}`);
  };

  // Table columns
  const columns: Column<Patient>[] = [
    {
      key: "mrn",
      header: t("table.mrn"),
      sortable: true,
      className: "w-24",
    },
    {
      key: "nameVi",
      header: t("table.name"),
      sortable: true,
      render: (_, patient) => {
        const displayName =
          locale === "en" && patient.nameEn ? patient.nameEn : patient.nameVi;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={patient.photoUrl} alt={displayName} />
              <AvatarFallback className="text-xs">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{displayName}</p>
              {patient.nameEn && locale === "vi" && (
                <p className="text-xs text-muted-foreground">{patient.nameEn}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: t("table.phone"),
    },
    {
      key: "lastVisitDate",
      header: t("table.lastVisit"),
      sortable: true,
      render: (value) =>
        value ? formatDate(value as string) : <span className="text-muted-foreground">-</span>,
    },
    {
      key: "status",
      header: t("table.status"),
      render: (_, patient) => <PatientStatusBadge status={patient.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (_, patient) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/patients/${patient.id}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/patients/${patient.id}/edit`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/patients/${patient.id}/session/new`);
              }}
              className="text-green-600"
            >
              <Play className="mr-2 h-4 w-4" />
              {t("actions.startSession")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link href={`/${locale}/patients/new` as any}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("newPatient")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select
              value={status ?? "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("status.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status.all")}</SelectItem>
                <SelectItem value="active">{t("status.active")}</SelectItem>
                <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                <SelectItem value="discharged">{t("status.discharged")}</SelectItem>
                <SelectItem value="pending">{t("status.pending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <ErrorState
          message={t("error")}
          onRetry={() => refetch()}
          retryLabel={tCommon("retry")}
        />
      )}

      {/* Patient Table */}
      {!isError && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              keyField="id"
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              page={data?.meta.page ?? page}
              pageSize={data?.meta.pageSize ?? 10}
              total={data?.meta.total ?? 0}
              totalPages={data?.meta.totalPages ?? 0}
              onPageChange={handlePageChange}
              onRowClick={handleRowClick}
              emptyMessage={t("empty")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
