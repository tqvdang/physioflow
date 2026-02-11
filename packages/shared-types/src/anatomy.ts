/**
 * Anatomy Region types for the API-driven anatomy region selector.
 *
 * These types represent the API response from /v1/anatomy/regions endpoints.
 * For the pain-location body diagram types (AnatomyRegionId, AnatomyPainLocation, etc.),
 * see pain-location.ts.
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type AnatomyCategory =
  | 'upper_limb'
  | 'lower_limb'
  | 'spine'
  | 'trunk'
  | 'head_neck';

export type AnatomyViewType = 'front' | 'back';

export type AnatomySide = 'left' | 'right' | 'bilateral';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

/**
 * An anatomy region returned from the API.
 */
export interface AnatomyRegion {
  id: string;
  name: string;
  name_vi: string;
  category: AnatomyCategory;
  view: AnatomyViewType;
  side: AnatomySide;
  description?: string;
}
