import { api } from '@/lib/api';

export interface AnatomyRegion {
  id: string;
  name: string;
  name_vi: string;
  category: string;
  view: string;
  side?: string;
  description?: string;
}

export const anatomyApi = {
  async getRegions(): Promise<AnatomyRegion[]> {
    return api.get<AnatomyRegion[]>('/anatomy/regions');
  },

  async getRegion(id: string): Promise<AnatomyRegion> {
    return api.get<AnatomyRegion>(`/anatomy/regions/${id}`);
  },
};
