"use client";

/**
 * React Query hooks for anatomy regions API
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AnatomyRegion,
  AnatomyCategory,
  AnatomyViewType,
} from "@physioflow/shared-types";

/**
 * API anatomy region type (snake_case from backend)
 */
interface ApiAnatomyRegion {
  id: string;
  name: string;
  name_vi: string;
  category: string;
  view: string;
  side: string;
  description?: string;
}

/**
 * Transform API region to frontend type
 */
function transformRegion(apiRegion: ApiAnatomyRegion): AnatomyRegion {
  return {
    id: apiRegion.id,
    name: apiRegion.name,
    name_vi: apiRegion.name_vi,
    category: apiRegion.category as AnatomyCategory,
    view: apiRegion.view as AnatomyViewType,
    side: apiRegion.side as AnatomyRegion["side"],
    description: apiRegion.description,
  };
}

// Query keys
export const anatomyRegionKeys = {
  all: ["anatomy", "regions"] as const,
  detail: (id: string) => [...anatomyRegionKeys.all, id] as const,
};

/**
 * Hook to fetch all anatomy regions
 */
export function useAnatomyRegions() {
  return useQuery({
    queryKey: anatomyRegionKeys.all,
    queryFn: async () => {
      const response = await api.get<ApiAnatomyRegion[]>("/v1/anatomy/regions");
      const regions = Array.isArray(response.data) ? response.data : [];
      return regions.map(transformRegion);
    },
    staleTime: 1000 * 60 * 60, // 1 hour (static reference data)
  });
}

/**
 * Hook to fetch a single anatomy region by ID
 */
export function useAnatomyRegion(id: string) {
  return useQuery({
    queryKey: anatomyRegionKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<ApiAnatomyRegion>(
        `/v1/anatomy/regions/${id}`
      );
      return transformRegion(response.data);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60,
  });
}
