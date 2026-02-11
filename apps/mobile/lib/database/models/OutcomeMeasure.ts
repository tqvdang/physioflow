import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export type MeasureType =
  | 'nprs'         // Numeric Pain Rating Scale (0-10)
  | 'oswestry'     // Oswestry Disability Index (0-100)
  | 'dash'         // Disabilities of Arm, Shoulder, Hand (0-100)
  | 'lefs'         // Lower Extremity Functional Scale (0-80)
  | 'neck_di'      // Neck Disability Index (0-100)
  | 'sf36'         // SF-36 Health Survey (0-100)
  | 'berg_balance'  // Berg Balance Scale (0-56)
  | 'timed_up_go'; // Timed Up and Go (seconds, lower is better)

export type MeasurePhase = 'baseline' | 'interim' | 'discharge';

export interface MeasureTypeConfig {
  label: string;
  abbreviation: string;
  minScore: number;
  maxScore: number;
  mcidDefault: number;
  unit: string;
  lowerIsBetter: boolean;
}

export const MEASURE_TYPE_CONFIGS: Record<MeasureType, MeasureTypeConfig> = {
  nprs: {
    label: 'Numeric Pain Rating Scale',
    abbreviation: 'NPRS',
    minScore: 0,
    maxScore: 10,
    mcidDefault: 2,
    unit: 'points',
    lowerIsBetter: true,
  },
  oswestry: {
    label: 'Oswestry Disability Index',
    abbreviation: 'ODI',
    minScore: 0,
    maxScore: 100,
    mcidDefault: 6,
    unit: '%',
    lowerIsBetter: true,
  },
  dash: {
    label: 'DASH Score',
    abbreviation: 'DASH',
    minScore: 0,
    maxScore: 100,
    mcidDefault: 10,
    unit: 'points',
    lowerIsBetter: true,
  },
  lefs: {
    label: 'Lower Extremity Functional Scale',
    abbreviation: 'LEFS',
    minScore: 0,
    maxScore: 80,
    mcidDefault: 9,
    unit: 'points',
    lowerIsBetter: false,
  },
  neck_di: {
    label: 'Neck Disability Index',
    abbreviation: 'NDI',
    minScore: 0,
    maxScore: 100,
    mcidDefault: 7,
    unit: '%',
    lowerIsBetter: true,
  },
  sf36: {
    label: 'SF-36 Health Survey',
    abbreviation: 'SF-36',
    minScore: 0,
    maxScore: 100,
    mcidDefault: 5,
    unit: 'points',
    lowerIsBetter: false,
  },
  berg_balance: {
    label: 'Berg Balance Scale',
    abbreviation: 'BBS',
    minScore: 0,
    maxScore: 56,
    mcidDefault: 4,
    unit: 'points',
    lowerIsBetter: false,
  },
  timed_up_go: {
    label: 'Timed Up and Go',
    abbreviation: 'TUG',
    minScore: 0,
    maxScore: 120,
    mcidDefault: 3.4,
    unit: 'seconds',
    lowerIsBetter: true,
  },
};

export default class OutcomeMeasure extends Model {
  static table = 'outcome_measures';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('measure_type') measureType!: MeasureType;
  @field('baseline_score') baselineScore!: number;
  @field('current_score') currentScore!: number;
  @field('target_score') targetScore!: number;
  @date('measurement_date') measurementDate!: Date;
  @field('mcid_threshold') mcidThreshold!: number;
  @field('phase') phase!: MeasurePhase;
  @field('notes') notes?: string;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;

  get config(): MeasureTypeConfig {
    return MEASURE_TYPE_CONFIGS[this.measureType];
  }

  calculateProgress(): number {
    if (this.targetScore === this.baselineScore) return 0;
    const progress =
      ((this.currentScore - this.baselineScore) /
        (this.targetScore - this.baselineScore)) *
      100;
    return Math.max(0, Math.min(100, progress));
  }

  get hasMcidImprovement(): boolean {
    const config = this.config;
    const change = Math.abs(this.currentScore - this.baselineScore);
    if (config.lowerIsBetter) {
      return this.currentScore < this.baselineScore && change >= this.mcidThreshold;
    }
    return this.currentScore > this.baselineScore && change >= this.mcidThreshold;
  }

  get changeFromBaseline(): number {
    return this.currentScore - this.baselineScore;
  }
}
