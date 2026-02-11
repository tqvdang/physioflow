import { database, OutcomeMeasure, SyncQueue } from '../database';
import { Q } from '@nozbe/watermelondb';
import { api } from '../api';
import { isOnline } from '../offline';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_BATCH_SIZE = 25;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

interface ServerMeasure {
  id: string;
  patientId: string;
  measureType: string;
  baselineScore: number;
  currentScore: number;
  targetScore: number;
  measurementDate: string;
  mcidThreshold: number;
  phase: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export async function syncOutcomeMeasures(
  patientId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  const online = await isOnline();
  if (!online) {
    return {
      ...result,
      success: false,
      errors: ['No internet connection'],
    };
  }

  try {
    // Push local unsynced measures to server
    await pushLocalMeasures(patientId, result);

    // Pull server measures and merge
    await pullServerMeasures(patientId, result);

    result.success = result.failed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : 'Sync failed'
    );
  }

  return result;
}

async function pushLocalMeasures(
  patientId: string,
  result: SyncResult
): Promise<void> {
  // Find unsynced outcome measures in the sync queue
  const pendingItems = await database
    .get<SyncQueue>('sync_queue')
    .query(
      Q.and(
        Q.where('entity_type', 'outcome_measure'),
        Q.where('attempts', Q.lt(MAX_RETRY_ATTEMPTS))
      )
    )
    .fetch();

  const batch = pendingItems.slice(0, SYNC_BATCH_SIZE);

  for (const item of batch) {
    const payload = item.parsedPayload as Record<string, unknown> | null;
    if (!payload || payload.patientId !== patientId) continue;

    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRY_ATTEMPTS && !success) {
      attempt++;
      try {
        switch (item.action) {
          case 'create':
            await api.post('/outcome-measures', payload);
            break;
          case 'update': {
            // Check for conflicts using version
            const serverVersion = await getServerVersion(item.entityId);
            const localVersion = (payload.version as number) || 1;

            if (serverVersion !== null && serverVersion > localVersion) {
              // Server has newer version - conflict
              await resolveConflict(item.entityId, payload, serverVersion);
              result.conflicts++;
            } else {
              await api.put(`/outcome-measures/${item.entityId}`, payload);
            }
            break;
          }
          case 'delete':
            await api.delete(`/outcome-measures/${item.entityId}`);
            break;
        }

        // Mark local record as synced
        await markMeasureAsSynced(item.entityId);

        // Remove from sync queue
        await database.write(async () => {
          await item.destroyPermanently();
        });

        success = true;
        result.synced++;
      } catch (error) {
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          await database.write(async () => {
            await item.update((i) => {
              i.attempts = attempt;
              i.lastAttemptAt = new Date();
              i.error =
                error instanceof Error ? error.message : 'Unknown error';
            });
          });
          result.failed++;
          result.errors.push(
            `Failed to sync measure ${item.entityId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }
  }
}

async function pullServerMeasures(
  patientId: string,
  result: SyncResult
): Promise<void> {
  try {
    const serverMeasures = await api.get<ServerMeasure[]>(
      `/outcome-measures?patientId=${patientId}`
    );

    await database.write(async () => {
      for (const serverMeasure of serverMeasures) {
        const existing = await database
          .get<OutcomeMeasure>('outcome_measures')
          .query(Q.where('remote_id', serverMeasure.id))
          .fetch();

        if (existing.length === 0) {
          // New record from server
          await database
            .get<OutcomeMeasure>('outcome_measures')
            .create((m) => {
              m.remoteId = serverMeasure.id;
              m.patientId = serverMeasure.patientId;
              m.measureType = serverMeasure.measureType as any;
              m.baselineScore = serverMeasure.baselineScore;
              m.currentScore = serverMeasure.currentScore;
              m.targetScore = serverMeasure.targetScore;
              m.measurementDate = new Date(serverMeasure.measurementDate);
              m.mcidThreshold = serverMeasure.mcidThreshold;
              m.phase = serverMeasure.phase as any;
              m.notes = serverMeasure.notes;
              m.version = serverMeasure.version;
              m.isSynced = true;
              m.syncedAt = new Date();
            });
          result.synced++;
        } else {
          const local = existing[0];
          // Update only if server version is newer
          if (serverMeasure.version > local.version) {
            await local.update((m) => {
              m.currentScore = serverMeasure.currentScore;
              m.targetScore = serverMeasure.targetScore;
              m.mcidThreshold = serverMeasure.mcidThreshold;
              m.phase = serverMeasure.phase as any;
              m.notes = serverMeasure.notes;
              m.version = serverMeasure.version;
              m.isSynced = true;
              m.syncedAt = new Date();
            });
          }
        }
      }
    });
  } catch (error) {
    result.errors.push(
      `Failed to pull measures: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

async function getServerVersion(entityId: string): Promise<number | null> {
  try {
    const response = await api.get<{ version: number }>(
      `/outcome-measures/${entityId}/version`
    );
    return response.version;
  } catch {
    return null;
  }
}

async function resolveConflict(
  entityId: string,
  localPayload: Record<string, unknown>,
  serverVersion: number
): Promise<void> {
  // Server-wins strategy: fetch server data and merge
  // Local changes to notes are preserved, scores use server values
  const serverData = await api.get<ServerMeasure>(
    `/outcome-measures/${entityId}`
  );

  const merged = {
    ...serverData,
    notes: localPayload.notes || serverData.notes,
    version: serverVersion + 1,
  };

  await api.put(`/outcome-measures/${entityId}`, merged);

  // Update local record with merged data
  await database.write(async () => {
    const records = await database
      .get<OutcomeMeasure>('outcome_measures')
      .query(Q.where('id', entityId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((m) => {
        m.currentScore = serverData.currentScore;
        m.targetScore = serverData.targetScore;
        m.notes = (merged.notes as string) || undefined;
        m.version = serverVersion + 1;
        m.isSynced = true;
        m.syncedAt = new Date();
      });
    }
  });
}

async function markMeasureAsSynced(entityId: string): Promise<void> {
  await database.write(async () => {
    const records = await database
      .get<OutcomeMeasure>('outcome_measures')
      .query(Q.where('id', entityId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((m) => {
        m.isSynced = true;
        m.syncedAt = new Date();
      });
    }
  });
}

export async function getUnsyncedMeasureCount(
  patientId: string
): Promise<number> {
  return database
    .get<OutcomeMeasure>('outcome_measures')
    .query(
      Q.and(
        Q.where('patient_id', patientId),
        Q.where('is_synced', false)
      )
    )
    .fetchCount();
}
