import { api } from '@/lib/api';

export interface MeasureResponse {
  question_id: string;
  value: number;
  text_value?: string;
}

export interface UpdateOutcomeMeasureRequest {
  responses?: MeasureResponse[];
  notes?: string;
  measured_at?: string;
}

export interface OutcomeMeasureApiResponse {
  id: string;
  patient_id: string;
  clinic_id: string;
  therapist_id: string;
  library_id: string;
  measure_type: string;
  session_id?: string;
  score: number;
  max_possible: number;
  percentage?: number;
  responses?: MeasureResponse[];
  notes?: string;
  measured_at: string;
  created_at: string;
  updated_at: string;
}

export const outcomeMeasuresApi = {
  async getByPatient(patientId: string): Promise<OutcomeMeasureApiResponse[]> {
    return api.get<OutcomeMeasureApiResponse[]>(
      `/patients/${patientId}/outcome-measures`
    );
  },

  async update(
    patientId: string,
    measureId: string,
    data: UpdateOutcomeMeasureRequest
  ): Promise<OutcomeMeasureApiResponse> {
    return api.put<OutcomeMeasureApiResponse>(
      `/patients/${patientId}/outcome-measures/${measureId}`,
      data
    );
  },

  async delete(patientId: string, measureId: string): Promise<void> {
    await api.delete(`/patients/${patientId}/outcome-measures/${measureId}`);
  },
};
