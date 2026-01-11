import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type SyncAction = 'create' | 'update' | 'delete';
export type EntityType = 'patient' | 'session' | 'checklist_item';

export default class SyncQueue extends Model {
  static table = 'sync_queue';

  @field('entity_type') entityType!: EntityType;
  @field('entity_id') entityId!: string;
  @field('action') action!: SyncAction;
  @field('payload') payload!: string;
  @field('attempts') attempts!: number;
  @date('last_attempt_at') lastAttemptAt?: Date;
  @field('error') error?: string;
  @readonly @date('created_at') createdAt!: Date;

  get parsedPayload(): unknown {
    try {
      return JSON.parse(this.payload);
    } catch {
      return null;
    }
  }
}
