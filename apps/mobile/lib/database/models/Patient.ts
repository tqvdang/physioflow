import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export default class Patient extends Model {
  static table = 'patients';

  static associations = {
    sessions: { type: 'has_many' as const, foreignKey: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @date('date_of_birth') dateOfBirth!: Date;
  @field('phone') phone?: string;
  @field('email') email?: string;
  @field('medical_notes') medicalNotes?: string;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('sessions') sessions: any;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
