"use client";

/**
 * Anatomy region selector dropdown.
 * Fetches regions from the API and groups them by category.
 * Supports bilingual display (Vietnamese/English) via next-intl locale.
 */

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnatomyRegions } from "@/hooks/use-anatomy-regions";
import type { AnatomyCategory, AnatomyViewType } from "@physioflow/shared-types";

interface RegionSelectorProps {
  /** Currently selected region ID */
  value?: string;
  /** Callback when a region is selected */
  onChange: (regionId: string) => void;
  /** Filter regions by view: 'front', 'back', or 'all' */
  view?: AnatomyViewType | "all";
  /** Placeholder text */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

const CATEGORY_ORDER: AnatomyCategory[] = [
  "head_neck",
  "upper_limb",
  "trunk",
  "spine",
  "lower_limb",
];

export function RegionSelector({
  value,
  onChange,
  view = "all",
  placeholder,
  disabled = false,
}: RegionSelectorProps) {
  const t = useTranslations("anatomy");
  const locale = useLocale();
  const { data: regions, isLoading } = useAnatomyRegions();

  const filteredRegions = React.useMemo(() => {
    if (!regions) return [];
    if (view === "all") return regions;
    return regions.filter((r) => r.view === view);
  }, [regions, view]);

  const groupedRegions = React.useMemo(() => {
    const groups = new Map<AnatomyCategory, typeof filteredRegions>();
    for (const category of CATEGORY_ORDER) {
      const categoryRegions = filteredRegions.filter(
        (r) => r.category === category
      );
      if (categoryRegions.length > 0) {
        groups.set(category, categoryRegions);
      }
    }
    return groups;
  }, [filteredRegions]);

  const getRegionLabel = (region: { name: string; name_vi: string }) => {
    return locale === "vi" ? region.name_vi : region.name;
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">{t("selectRegion")}</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t("selectRegion")} />
      </SelectTrigger>
      <SelectContent>
        {Array.from(groupedRegions.entries()).map(
          ([category, categoryRegions]) => (
            <SelectGroup key={category}>
              <SelectLabel>{t(`categories.${category}`)}</SelectLabel>
              {categoryRegions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {getRegionLabel(region)}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        )}
      </SelectContent>
    </Select>
  );
}
