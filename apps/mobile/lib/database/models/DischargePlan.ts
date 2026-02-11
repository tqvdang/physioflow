import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export interface BaselineComparison {
  measureType: string;
  label: string;
  baselineScore: number;
  dischargeScore: number;
  change: number;
  percentImprovement: number;
  metMcid: boolean;
  mcidThreshold: number;
  lowerIsBetter: boolean;
}

export interface OutcomeTrending {
  measureType: string;
  label: string;
  dataPoints: { date: string; score: number }[];
}

export interface HEPExercise {
  name: string;
  nameVi: string;
  sets: number;
  reps: number;
  durationSeconds: number;
  frequency: string;
  frequencyVi: string;
  instructions: string;
  instructionsVi: string;
}

export default class DischargePlan extends Model {
  static table = 'discharge_plans';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @date('planned_date') plannedDate!: Date;
  @field('baseline_comparison') baselineComparisonRaw!: string;
  @field('outcome_trending') outcomeTrendingRaw!: string;
  @field('hep_exercises') hepExercisesRaw!: string;
  @field('recommendations') recommendations?: string;
  @field('recommendations_vi') recommendationsVi?: string;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;

  get baselineComparison(): BaselineComparison[] {
    try {
      return JSON.parse(this.baselineComparisonRaw) as BaselineComparison[];
    } catch {
      return [];
    }
  }

  get outcomeTrending(): OutcomeTrending[] {
    try {
      return JSON.parse(this.outcomeTrendingRaw) as OutcomeTrending[];
    } catch {
      return [];
    }
  }

  get hepExercises(): HEPExercise[] {
    try {
      return JSON.parse(this.hepExercisesRaw) as HEPExercise[];
    } catch {
      return [];
    }
  }
}
