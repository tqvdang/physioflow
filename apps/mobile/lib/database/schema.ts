import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'date_of_birth', type: 'number' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'medical_notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sessions',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'therapist_id', type: 'string', isIndexed: true },
        { name: 'scheduled_at', type: 'number', isIndexed: true },
        { name: 'duration_minutes', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'session_type', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'pain_level_before', type: 'number', isOptional: true },
        { name: 'pain_level_after', type: 'number', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'checklist_items',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'is_completed', type: 'boolean' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'last_attempt_at', type: 'number', isOptional: true },
        { name: 'error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
