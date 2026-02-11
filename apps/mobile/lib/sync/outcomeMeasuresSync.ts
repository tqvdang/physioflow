import { database, OutcomeMeasure, SyncQueue } from '../database';
import { Q } from '@nozbe/watermelondb';
import { api } from '../api';
import { outcomeMeasuresApi } from '@/src/services/api/outcomeMeasuresApi';
import { isOnline } from '../offline';

const MAX_RETRY_ATTEMPTS = 5;
const SYNC_BATCH_SIZE = 25;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_SYNC_ERROR_LOG_SIZE = 100;
const SYNC_ERROR_LOG_KEY = 'physioflow_sync_errors';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

interface SyncErrorLogEntry {
  timestamp: string;
  entityId: string;
  action: string;
  error: string;
  attempt: number;
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

/**
 * Exponential backoff delay: BASE * 2^attempt, capped at 30s
 */
function getRetryDelay(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, 30000);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a version conflict (HTTP 409)
 */
function isConflictError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 409;
  }
  return false;
}

/**
 * Log sync errors for debugging.
 * Stores recent errors in a circular buffer to avoid unbounded growth.
 */
async function logSyncError(entry: SyncErrorLogEntry): Promise<void> {
  try {
    // Use a simple in-memory approach since AsyncStorage is not available.
    // In production, replace with a persistent store (e.g. SecureStore or a DB table).
    const existingRaw = (globalThis as Record<string, unknown>)[
      SYNC_ERROR_LOG_KEY
    ] as string | undefined;
    const existing: SyncErrorLogEntry[] = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    existing.push(entry);

    // Keep only the most recent entries
    const trimmed = existing.slice(-MAX_SYNC_ERROR_LOG_SIZE);

    (globalThis as Record<string, unknown>)[SYNC_ERROR_LOG_KEY] =
      JSON.stringify(trimmed);
  } catch {
    // Logging should never crash the sync
    console.warn('[SyncErrorLog] Failed to persist sync error log entry');
  }
}

/**
 * Retrieve the sync error log for debugging.
 */
export function getSyncErrorLog(): SyncErrorLogEntry[] {
  try {
    const raw = (globalThis as Record<string, unknown>)[
      SYNC_ERROR_LOG_KEY
    ] as string | undefined;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

    // Sync locally deleted measures to server
    const deleteResult = await syncDeletedMeasures(patientId);
    result.synced += deleteResult.deleted;
    result.failed += deleteResult.failed;

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
            await api.post(
              `/patients/${patientId}/outcome-measures`,
              payload
            );
            break;
          case 'update': {
            const remoteId = (payload.remoteId as string) || item.entityId;
            await outcomeMeasuresApi.update(
              patientId,
              remoteId,
              {
                responses: payload.responses as any,
                notes: payload.notes as string | undefined,
                measured_at: payload.measuredAt as string | undefined,
              }
            );
            break;
          }
          case 'delete': {
            const deleteRemoteId = (payload.remoteId as string) || item.entityId;
            await outcomeMeasuresApi.delete(patientId, deleteRemoteId);
            break;
          }
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
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Log every failed attempt for debugging
        await logSyncError({
          timestamp: new Date().toISOString(),
          entityId: item.entityId,
          action: item.action,
          error: errorMessage,
          attempt,
        });

        // Handle version conflicts: mark as conflict, do not retry
        if (isConflictError(error)) {
          result.conflicts++;
          result.errors.push(
            `Version conflict for measure ${item.entityId}. Please refresh to get the latest data.`
          );

          await database.write(async () => {
            await item.update((i) => {
              i.attempts = MAX_RETRY_ATTEMPTS; // Prevent further retries
              i.lastAttemptAt = new Date();
              i.error = 'Version conflict - refresh required';
            });
          });

          break; // Stop retrying on conflict
        }

        if (attempt < MAX_RETRY_ATTEMPTS) {
          // Wait with exponential backoff before next retry
          await sleep(getRetryDelay(attempt));
        } else {
          await database.write(async () => {
            await item.update((i) => {
              i.attempts = attempt;
              i.lastAttemptAt = new Date();
              i.error = errorMessage;
            });
          });
          result.failed++;
          result.errors.push(
            `Failed to sync measure ${item.entityId}: ${errorMessage}`
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
      `/patients/${patientId}/outcome-measures`
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
              m.isDeleted = false;
              m.syncedAt = new Date();
            });
          result.synced++;
        } else {
          const local = existing[0];
          // Update only if server version is newer
          if (serverMeasure.version > local.version) {
            // If local has unsynced changes, log the conflict
            if (!local.isSynced) {
              result.conflicts = (result.conflicts ?? 0) + 1;
              await logSyncError({
                timestamp: new Date().toISOString(),
                entityId: local.id,
                action: 'pull_conflict',
                error: `Server version ${serverMeasure.version} overwriting local version ${local.version}`,
                attempt: 0,
              });
            }
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

/**
 * Sync locally soft-deleted measures to the server.
 * After the server acknowledges the delete, permanently remove the local record.
 */
export async function syncDeletedMeasures(
  patientId: string
): Promise<{ deleted: number; failed: number }> {
  const result = { deleted: 0, failed: 0 };

  const online = await isOnline();
  if (!online) return result;

  try {
    const deletedMeasures = await database
      .get<OutcomeMeasure>('outcome_measures')
      .query(
        Q.and(
          Q.where('patient_id', patientId),
          Q.where('is_deleted', true),
          Q.where('is_synced', false)
        )
      )
      .fetch();

    for (const measure of deletedMeasures) {
      let deleted = false;
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS && !deleted; attempt++) {
        try {
          if (measure.remoteId) {
            await outcomeMeasuresApi.delete(patientId, measure.remoteId);
          }
          // Remove from local database after successful server delete
          await database.write(async () => {
            await measure.destroyPermanently();
          });
          result.deleted++;
          deleted = true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          await logSyncError({
            timestamp: new Date().toISOString(),
            entityId: measure.id,
            action: 'delete',
            error: errorMessage,
            attempt,
          });

          if (attempt < MAX_RETRY_ATTEMPTS) {
            await sleep(getRetryDelay(attempt));
          } else {
            console.error(
              `Failed to sync delete for measure ${measure.id} after ${MAX_RETRY_ATTEMPTS} attempts:`,
              error
            );
            result.failed++;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync deleted measures:', error);
  }

  return result;
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
