"use client";

/**
 * DataTable component built on top of shadcn/ui Table
 * Supports sorting, pagination, and row actions
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  loadingRows?: number;
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Row actions
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  isLoading = false,
  loadingRows = 5,
  sortBy,
  sortOrder,
  onSort,
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 0,
  onPageChange,
  onRowClick,
  className,
  emptyMessage = "Khong co du lieu",
}: DataTableProps<T>) {
  // Handle sort click
  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  // Calculate pagination info
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground",
                      column.className
                    )}
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center hover:text-foreground transition-colors"
                      >
                        {column.header}
                        {renderSortIcon(column.key)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: loadingRows }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((row, rowIndex) => {
                  const rowRecord = row as Record<string, unknown>;
                  return (
                    <tr
                      key={String(rowRecord[keyField as string])}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/50"
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn("px-4 py-3", column.className)}
                        >
                          {column.render
                            ? column.render(rowRecord[column.key], row, rowIndex)
                            : (rowRecord[column.key] as React.ReactNode)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && onPageChange && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Hien thi {startItem} - {endItem} trong tong so {total} ket qua
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
