import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Session from './Session';

export default class ChecklistItem extends Model {
  static table = 'checklist_items';

  static associations = {
    sessions: { type: 'belongs_to' as const, key: 'session_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('session_id') sessionId!: string;
  @field('title') title!: string;
  @field('description') description?: string;
  @field('is_completed') isCompleted!: boolean;
  @date('completed_at') completedAt?: Date;
  @field('sort_order') sortOrder!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('sessions', 'session_id') session!: Relation<Session>;
}
