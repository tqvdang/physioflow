import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export interface ProtocolGoal {
  description: string;
  descriptionVi: string;
}

export interface ProtocolExercise {
  id: string;
  name: string;
  nameVi: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  restSeconds?: number;
  videoUrl?: string;
  instructions?: string;
  instructionsVi?: string;
}

export default class ClinicalProtocol extends Model {
  static table = 'clinical_protocols';

  static associations = {
    patient_protocols: { type: 'has_many' as const, foreignKey: 'protocol_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('protocol_name') protocolName!: string;
  @field('protocol_name_vi') protocolNameVi!: string;
  @field('description') description!: string;
  @field('description_vi') descriptionVi!: string;
  @field('goals') goalsJSON!: string;
  @field('exercises') exercisesJSON!: string;
  @field('frequency') frequency!: string;
  @field('duration_weeks') durationWeeks!: number;
  @field('progression_criteria') progressionCriteria!: string;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('patient_protocols') patientProtocols: any;

  get goals(): ProtocolGoal[] {
    try {
      return JSON.parse(this.goalsJSON || '[]');
    } catch {
      return [];
    }
  }

  get exercises(): ProtocolExercise[] {
    try {
      return JSON.parse(this.exercisesJSON || '[]');
    } catch {
      return [];
    }
  }
}
