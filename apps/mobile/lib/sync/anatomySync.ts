import { anatomyApi, type AnatomyRegion } from '@/src/services/api/anatomyApi';
import { isOnline } from '../offline';

// Module-level in-memory cache for anatomy regions.
// These are static reference data that rarely changes,
// so caching in memory for the app session is sufficient.
let cachedRegions: AnatomyRegion[] = [];
let lastFetchedAt: number = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch anatomy regions from API and cache in memory.
 * Falls back to cached data when offline.
 * Refreshes cache every 24 hours or on force refresh.
 */
export async function syncAnatomyRegions(
  forceRefresh = false
): Promise<AnatomyRegion[]> {
  // Return cached data if still fresh
  const age = Date.now() - lastFetchedAt;
  if (!forceRefresh && cachedRegions.length > 0 && age < CACHE_TTL_MS) {
    return cachedRegions;
  }

  const online = await isOnline();
  if (!online) {
    // Return whatever we have cached, even if stale
    return cachedRegions;
  }

  try {
    const regions = await anatomyApi.getRegions();
    cachedRegions = regions;
    lastFetchedAt = Date.now();
    return regions;
  } catch (error) {
    console.error('Failed to sync anatomy regions:', error);
    // Fall back to stale cache
    return cachedRegions;
  }
}

/**
 * Get a single anatomy region by ID from cached data.
 */
export async function getAnatomyRegion(
  regionId: string
): Promise<AnatomyRegion | null> {
  const regions = await syncAnatomyRegions();
  return regions.find((r) => r.id === regionId) ?? null;
}

/**
 * Get anatomy regions grouped by category.
 */
export async function getRegionsByCategory(): Promise<
  Record<string, AnatomyRegion[]>
> {
  const regions = await syncAnatomyRegions();
  return regions.reduce(
    (acc, region) => {
      if (!acc[region.category]) {
        acc[region.category] = [];
      }
      acc[region.category].push(region);
      return acc;
    },
    {} as Record<string, AnatomyRegion[]>
  );
}

/**
 * Get regions filtered by view (front/back).
 */
export async function getRegionsByView(
  view: 'front' | 'back'
): Promise<AnatomyRegion[]> {
  const regions = await syncAnatomyRegions();
  return regions.filter((r) => r.view === view);
}
