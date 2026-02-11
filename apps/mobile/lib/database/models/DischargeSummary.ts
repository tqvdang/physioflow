import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export interface FinalScore {
  measureType: string;
  label: string;
  score: number;
  baselineScore: number;
  change: number;
  percentImprovement: number;
  metMcid: boolean;
}

export default class DischargeSummary extends Model {
  static table = 'discharge_summaries';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @date('discharge_date') dischargeDate!: Date;
  @field('summary_text') summaryText?: string;
  @field('summary_text_vi') summaryTextVi?: string;
  @field('final_scores') finalScoresRaw!: string;
  @field('improvement_percent') improvementPercent!: number;
  @field('follow_up_recommendations') followUpRecommendations?: string;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;

  get finalScores(): FinalScore[] {
    try {
      return JSON.parse(this.finalScoresRaw) as FinalScore[];
    } catch {
      return [];
    }
  }
}
