import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';
import ClinicalProtocol from './ClinicalProtocol';

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'discontinued';

export default class PatientProtocol extends Model {
  static table = 'patient_protocols';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
    clinical_protocols: { type: 'belongs_to' as const, key: 'protocol_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('protocol_id') protocolId!: string;
  @date('assigned_date') assignedDate!: Date;
  @field('current_week') currentWeek!: number;
  @field('completed_exercises') completedExercisesJSON!: string;
  @field('progress_status') progressStatus!: ProgressStatus;
  @field('notes') notes?: string;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;
  @relation('clinical_protocols', 'protocol_id') protocol!: Relation<ClinicalProtocol>;

  get completedExercises(): string[] {
    try {
      return JSON.parse(this.completedExercisesJSON || '[]');
    } catch {
      return [];
    }
  }

  getProgressPercent(totalWeeks: number): number {
    if (totalWeeks <= 0) return 0;
    return Math.min(100, (this.currentWeek / totalWeeks) * 100);
  }
}
