"use client";

/**
 * Protocol library browser for selecting and assigning protocols
 * Displays all available protocols with filtering by category
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProtocolCard } from "./ProtocolCard";
import { useProtocols } from "@/hooks/use-protocols";
import { PROTOCOL_CATEGORY_INFO } from "@/types/protocol";
import { Search, AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtocolSelectorProps {
  onAssign?: (protocolId: string) => void;
  onViewDetails?: (protocolId: string) => void;
  showAssignButton?: boolean;
}

export function ProtocolSelector({
  onAssign,
  onViewDetails,
  showAssignButton = true,
}: ProtocolSelectorProps) {
  const t = useTranslations("protocols");
  const tCommon = useTranslations("common");

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useProtocols({
    search: search || undefined,
    category: category,
    isActive: true,
  });

  const protocols = data?.data ?? [];

  // Client-side filter for immediate search feedback
  const filteredProtocols = React.useMemo(() => {
    if (!search) return protocols;
    const lower = search.toLowerCase();
    return protocols.filter(
      (p) =>
        p.protocolName.toLowerCase().includes(lower) ||
        p.protocolNameVi.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.descriptionVi.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
    );
  }, [protocols, search]);

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("library")}</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Select
          value={category ?? "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder={t("filterByCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {Object.entries(PROTOCOL_CATEGORY_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground text-center">
              {t("errorLoading")}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {tCommon("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Protocol Grid */}
      {!isLoading && !isError && (
        <>
          {filteredProtocols.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-2">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{t("noProtocols")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  onAssign={onAssign}
                  onViewDetails={onViewDetails}
                  showAssignButton={showAssignButton}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
