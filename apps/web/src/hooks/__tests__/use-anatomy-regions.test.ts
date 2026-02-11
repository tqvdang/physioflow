import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnatomyRegions, useAnatomyRegion } from '../use-anatomy-regions';
import { createWrapper, mockApiResponse, mockApiError } from '@/__tests__/utils';
import { createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

describe('use-anatomy-regions hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useAnatomyRegions', () => {
    const mockRegions = [
      {
        id: 'shoulder_left',
        name: 'Left Shoulder',
        name_vi: 'Vai trái',
        category: 'upper_limb',
        view: 'front',
        side: 'left',
        description: 'Left shoulder region',
      },
      {
        id: 'shoulder_right',
        name: 'Right Shoulder',
        name_vi: 'Vai phải',
        category: 'upper_limb',
        view: 'front',
        side: 'right',
        description: 'Right shoulder region',
      },
      {
        id: 'neck_front',
        name: 'Front Neck',
        name_vi: 'Cổ trước',
        category: 'head_neck',
        view: 'front',
        side: 'center',
        description: 'Front of neck',
      },
      {
        id: 'lower_back',
        name: 'Lower Back',
        name_vi: 'Lưng dưới',
        category: 'spine',
        view: 'back',
        side: 'center',
        description: 'Lumbar spine region',
      },
      {
        id: 'knee_left',
        name: 'Left Knee',
        name_vi: 'Đầu gối trái',
        category: 'lower_limb',
        view: 'front',
        side: 'left',
        description: 'Left knee region',
      },
    ];

    it('fetches all anatomy regions successfully', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(5);
      expect(result.current.data?.[0]).toEqual({
        id: 'shoulder_left',
        name: 'Left Shoulder',
        name_vi: 'Vai trái',
        category: 'upper_limb',
        view: 'front',
        side: 'left',
        description: 'Left shoulder region',
      });
      expect(apiLib.api.get).toHaveBeenCalledWith('/v1/anatomy/regions');
    });

    it('transforms API response correctly', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const region = result.current.data?.[0];
      expect(region).toHaveProperty('id');
      expect(region).toHaveProperty('name');
      expect(region).toHaveProperty('name_vi');
      expect(region).toHaveProperty('category');
      expect(region).toHaveProperty('view');
      expect(region).toHaveProperty('side');
    });

    it('handles empty array response', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('handles non-array API response gracefully', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(null));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('handles API error gracefully', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(
        mockApiError(500, 'Internal Server Error')
      );

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('handles 404 not found error', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(
        mockApiError(404, 'Regions not found')
      );

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('caches data with 1 hour staleTime', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Data should not be stale initially
      expect(result.current.isStale).toBe(false);
    });

    it('filters regions by category', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const upperLimbRegions = result.current.data?.filter(
        (r) => r.category === 'upper_limb'
      );
      expect(upperLimbRegions).toHaveLength(2);
      expect(upperLimbRegions?.every((r) => r.category === 'upper_limb')).toBe(true);
    });

    it('filters regions by view', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const frontViewRegions = result.current.data?.filter(
        (r) => r.view === 'front'
      );
      expect(frontViewRegions).toHaveLength(4);

      const backViewRegions = result.current.data?.filter(
        (r) => r.view === 'back'
      );
      expect(backViewRegions).toHaveLength(1);
    });

    it('supports bilingual region names', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

      const { result } = renderHook(() => useAnatomyRegions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const region = result.current.data?.[0];
      expect(region?.name).toBe('Left Shoulder');
      expect(region?.name_vi).toBe('Vai trái');
    });
  });

  describe('useAnatomyRegion', () => {
    const mockRegion = {
      id: 'shoulder_left',
      name: 'Left Shoulder',
      name_vi: 'Vai trái',
      category: 'upper_limb',
      view: 'front',
      side: 'left',
      description: 'Left shoulder region',
    };

    it('fetches single region by ID', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegion));

      const { result } = renderHook(() => useAnatomyRegion('shoulder_left'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockRegion);
      expect(apiLib.api.get).toHaveBeenCalledWith(
        '/v1/anatomy/regions/shoulder_left'
      );
    });

    it('transforms single region correctly', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegion));

      const { result } = renderHook(() => useAnatomyRegion('shoulder_left'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveProperty('id', 'shoulder_left');
      expect(result.current.data).toHaveProperty('name', 'Left Shoulder');
      expect(result.current.data).toHaveProperty('name_vi', 'Vai trái');
      expect(result.current.data).toHaveProperty('category', 'upper_limb');
      expect(result.current.data).toHaveProperty('view', 'front');
      expect(result.current.data).toHaveProperty('side', 'left');
    });

    it('does not fetch when id is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useAnatomyRegion(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('handles API error for single region', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(
        mockApiError(404, 'Region not found')
      );

      const { result } = renderHook(() => useAnatomyRegion('invalid_id'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('caches single region data with 1 hour staleTime', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegion));

      const { result } = renderHook(() => useAnatomyRegion('shoulder_left'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isStale).toBe(false);
    });

    it('uses correct query key for caching', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegion));

      const { result } = renderHook(() => useAnatomyRegion('shoulder_left'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the query is in the cache with expected key
      const cachedData = queryClient.getQueryData([
        'anatomy',
        'regions',
        'shoulder_left',
      ]);
      expect(cachedData).toEqual(mockRegion);
    });

    it('handles 500 server error', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(
        mockApiError(500, 'Internal Server Error')
      );

      const { result } = renderHook(() => useAnatomyRegion('shoulder_left'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
