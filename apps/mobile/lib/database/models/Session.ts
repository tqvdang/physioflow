import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type SessionType = 'initial_evaluation' | 'follow_up' | 'discharge' | 'telehealth';

export default class Session extends Model {
  static table = 'sessions';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
    checklist_items: { type: 'has_many' as const, foreignKey: 'session_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('therapist_id') therapistId!: string;
  @date('scheduled_at') scheduledAt!: Date;
  @field('duration_minutes') durationMinutes!: number;
  @field('status') status!: SessionStatus;
  @field('session_type') sessionType!: SessionType;
  @field('notes') notes?: string;
  @field('pain_level_before') painLevelBefore?: number;
  @field('pain_level_after') painLevelAfter?: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;
  @children('checklist_items') checklistItems: any;
}
