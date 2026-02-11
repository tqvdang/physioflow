import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export type AssessmentType = 'rom' | 'mmt' | 'outcome_measure';
export type InterpretationResult = 'improved' | 'declined' | 'stable';

export default class ReevaluationAssessment extends Model {
  static table = 'reevaluation_assessments';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('visit_id') visitId?: string;
  @field('clinic_id') clinicId!: string;
  @field('baseline_assessment_id') baselineAssessmentId?: string;
  @field('assessment_type') assessmentType!: AssessmentType;
  @field('measure_label') measureLabel!: string;
  @field('current_value') currentValue!: number;
  @field('baseline_value') baselineValue!: number;
  @field('change') change!: number;
  @field('change_percentage') changePercentage?: number;
  @field('higher_is_better') higherIsBetter!: boolean;
  @field('mcid_threshold') mcidThreshold?: number;
  @field('mcid_achieved') mcidAchieved!: boolean;
  @field('interpretation') interpretation!: InterpretationResult;
  @field('therapist_id') therapistId!: string;
  @field('notes') notes?: string;
  @date('assessed_at') assessedAt!: Date;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;

  get isImproved(): boolean {
    return this.interpretation === 'improved';
  }

  get isDeclined(): boolean {
    return this.interpretation === 'declined';
  }

  get isStable(): boolean {
    return this.interpretation === 'stable';
  }
}
