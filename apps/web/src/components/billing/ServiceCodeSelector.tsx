"use client";

/**
 * ServiceCodeSelector - Autocomplete combobox for PT service codes
 * Displays code + Vietnamese name + price, filterable by code or name
 */

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useServiceCodes } from "@/hooks/use-billing";
import type { ServiceCode } from "@/types/billing";

interface ServiceCodeSelectorProps {
  /** Called when a service code is selected */
  onSelect: (serviceCode: ServiceCode) => void;
  /** Service code IDs that are already selected (to show check marks) */
  selectedIds?: string[];
  /** Placeholder text for the trigger button */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export function ServiceCodeSelector({
  onSelect,
  selectedIds = [],
  placeholder,
  disabled = false,
}: ServiceCodeSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const t = useTranslations("billing");

  const { data: serviceCodes, isLoading } = useServiceCodes();

  const filteredCodes = React.useMemo(() => {
    if (!serviceCodes) return [];
    if (!search) return serviceCodes;

    const query = search.toLowerCase();
    return serviceCodes.filter(
      (sc) =>
        sc.code.toLowerCase().includes(query) ||
        sc.serviceName.toLowerCase().includes(query) ||
        sc.serviceNameVi.toLowerCase().includes(query)
    );
  }, [serviceCodes, search]);

  const handleSelect = (serviceCode: ServiceCode) => {
    onSelect(serviceCode);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="truncate text-muted-foreground">
            {placeholder ?? t("addService")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[460px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("searchServiceCode")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? t("loading") : t("noServiceCodes")}
            </CommandEmpty>
            <CommandGroup>
              {filteredCodes.map((sc) => {
                const isSelected = selectedIds.includes(sc.id);
                return (
                  <CommandItem
                    key={sc.id}
                    onClick={() => handleSelect(sc)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {sc.code}
                        </span>
                        <span className="text-sm">{sc.serviceNameVi}</span>
                        {sc.durationMinutes && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({sc.durationMinutes} {t("minutes")})
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-primary whitespace-nowrap">
                        {formatVND(sc.unitPrice)}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
