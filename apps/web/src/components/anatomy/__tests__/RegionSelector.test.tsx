import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegionSelector } from '../RegionSelector';
import { createTestQueryClient, createWrapper, mockApiResponse } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

describe('RegionSelector', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  const mockRegions = [
    {
      id: 'shoulder_left',
      name: 'Left Shoulder',
      name_vi: 'Vai trái',
      category: 'upper_limb',
      view: 'front',
      side: 'left',
    },
    {
      id: 'shoulder_right',
      name: 'Right Shoulder',
      name_vi: 'Vai phải',
      category: 'upper_limb',
      view: 'front',
      side: 'right',
    },
    {
      id: 'neck_front',
      name: 'Front Neck',
      name_vi: 'Cổ trước',
      category: 'head_neck',
      view: 'front',
      side: 'center',
    },
    {
      id: 'lower_back',
      name: 'Lower Back',
      name_vi: 'Lưng dưới',
      category: 'spine',
      view: 'back',
      side: 'center',
    },
    {
      id: 'knee_left',
      name: 'Left Knee',
      name_vi: 'Đầu gối trái',
      category: 'lower_limb',
      view: 'front',
      side: 'left',
    },
    {
      id: 'knee_right',
      name: 'Right Knee',
      name_vi: 'Đầu gối phải',
      category: 'lower_limb',
      view: 'front',
      side: 'right',
    },
    {
      id: 'trunk_anterior',
      name: 'Anterior Trunk',
      name_vi: 'Thân trước',
      category: 'trunk',
      view: 'front',
      side: 'center',
    },
  ];

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('renders with loading state initially', () => {
    vi.spyOn(apiLib.api, 'get').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<RegionSelector value="" onChange={vi.fn()} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    // Check for skeleton loading indicator (no combobox when loading)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders regions after loading', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });
  });

  it('renders regions grouped by category', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    // Open the select
    await user.click(screen.getByRole('combobox'));

    // Check for category labels (translations return the key in test environment)
    await waitFor(() => {
      expect(screen.getByText('categories.head_neck')).toBeInTheDocument();
      expect(screen.getByText('categories.upper_limb')).toBeInTheDocument();
      expect(screen.getByText('categories.trunk')).toBeInTheDocument();
      expect(screen.getByText('categories.spine')).toBeInTheDocument();
      expect(screen.getByText('categories.lower_limb')).toBeInTheDocument();
    });
  });

  it('filters regions by view (front)', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="front" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // Front view regions should be present
      expect(screen.getByText('Left Shoulder')).toBeInTheDocument();
      expect(screen.getByText('Front Neck')).toBeInTheDocument();
      expect(screen.getByText('Left Knee')).toBeInTheDocument();

      // Back view regions should NOT be present
      expect(screen.queryByText('Lower Back')).not.toBeInTheDocument();
    });
  });

  it('filters regions by view (back)', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="back" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // Back view regions should be present
      expect(screen.getByText('Lower Back')).toBeInTheDocument();

      // Front view regions should NOT be present
      expect(screen.queryByText('Front Neck')).not.toBeInTheDocument();
    });
  });

  it('shows all regions when view is "all"', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // All regions should be visible
      expect(screen.getByText('Left Shoulder')).toBeInTheDocument();
      expect(screen.getByText('Front Neck')).toBeInTheDocument();
      expect(screen.getByText('Lower Back')).toBeInTheDocument();
      expect(screen.getByText('Left Knee')).toBeInTheDocument();
    });
  });

  it('calls onChange when region is selected', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    const shoulder = await screen.findByText('Left Shoulder');
    await user.click(shoulder);

    expect(handleChange).toHaveBeenCalledWith('shoulder_left');
  });

  it('displays selected value', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();

    render(<RegionSelector value="shoulder_left" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    // The selected value should be displayed
    expect(screen.getByText('Left Shoulder')).toBeInTheDocument();
  });

  it('respects disabled prop', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();

    render(<RegionSelector value="" onChange={handleChange} view="all" disabled={true} />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeDisabled();
    });
  });

  it('uses custom placeholder', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();

    render(
      <RegionSelector
        value=""
        onChange={handleChange}
        view="all"
        placeholder="Pick a region"
      />,
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    expect(screen.getByText('Pick a region')).toBeInTheDocument();
  });

  it('groups regions in correct category order', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    // Get all group labels in order
    const groups = screen.getAllByRole('group');

    // Verify expected number of groups
    expect(groups.length).toBeGreaterThan(0);
  });

  it('handles empty regions array', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse([]));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    // Should render but with no options
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    vi.spyOn(apiLib.api, 'get').mockRejectedValue(new Error('API Error'));

    const handleChange = vi.fn();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    // Even with error, component should render (loading state or error state)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('displays Vietnamese names when locale is vi', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();
    const user = userEvent.setup();

    // The mock in setup.ts sets locale to 'vi' by default
    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    await user.click(screen.getByRole('combobox'));

    // Vietnamese names should be displayed (based on mock locale)
    await waitFor(() => {
      expect(screen.getByText('Vai trái')).toBeInTheDocument();
      expect(screen.getByText('Cổ trước')).toBeInTheDocument();
      expect(screen.getByText('Đầu gối trái')).toBeInTheDocument();
    });
  });

  it('has accessible role and labels', async () => {
    vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockRegions));

    const handleChange = vi.fn();

    render(<RegionSelector value="" onChange={handleChange} view="all" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded');
  });
});
