import { database, ClinicalProtocol, PatientProtocol, SyncQueue } from '../database';
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

interface ServerProtocol {
  id: string;
  protocolName: string;
  protocolNameVi: string;
  description: string;
  descriptionVi: string;
  goals: string;
  exercises: string;
  frequency: string;
  durationWeeks: number;
  progressionCriteria: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerPatientProtocol {
  id: string;
  patientId: string;
  protocolId: string;
  assignedDate: string;
  currentWeek: number;
  completedExercises: string;
  progressStatus: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Downloads all protocol templates from the server for offline access.
 * Uses upsert logic: inserts new protocols, updates existing ones if
 * the server copy is newer.
 */
export async function downloadProtocols(): Promise<SyncResult> {
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
    const serverProtocols = await api.get<ServerProtocol[]>('/protocols');

    await database.write(async () => {
      for (const serverProto of serverProtocols) {
        const existing = await database
          .get<ClinicalProtocol>('clinical_protocols')
          .query(Q.where('remote_id', serverProto.id))
          .fetch();

        if (existing.length === 0) {
          await database
            .get<ClinicalProtocol>('clinical_protocols')
            .create((p) => {
              p.remoteId = serverProto.id;
              p.protocolName = serverProto.protocolName;
              p.protocolNameVi = serverProto.protocolNameVi;
              p.description = serverProto.description;
              p.descriptionVi = serverProto.descriptionVi;
              p.goalsJSON = serverProto.goals;
              p.exercisesJSON = serverProto.exercises;
              p.frequency = serverProto.frequency;
              p.durationWeeks = serverProto.durationWeeks;
              p.progressionCriteria = serverProto.progressionCriteria;
              p.isSynced = true;
            });
          result.synced++;
        } else {
          const local = existing[0];
          const serverUpdated = new Date(serverProto.updatedAt).getTime();
          const localUpdated = local.updatedAt.getTime();

          if (serverUpdated > localUpdated) {
            await local.update((p) => {
              p.protocolName = serverProto.protocolName;
              p.protocolNameVi = serverProto.protocolNameVi;
              p.description = serverProto.description;
              p.descriptionVi = serverProto.descriptionVi;
              p.goalsJSON = serverProto.goals;
              p.exercisesJSON = serverProto.exercises;
              p.frequency = serverProto.frequency;
              p.durationWeeks = serverProto.durationWeeks;
              p.progressionCriteria = serverProto.progressionCriteria;
              p.isSynced = true;
            });
            result.synced++;
          }
        }
      }
    });

    result.success = result.failed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Failed to download protocols: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }

  return result;
}

/**
 * Syncs patient protocol assignments and progress for a given patient.
 * Pushes local unsynced changes first, then pulls server state.
 */
export async function syncPatientProtocols(
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
    await pushLocalPatientProtocols(patientId, result);
    await pullServerPatientProtocols(patientId, result);
    result.success = result.failed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : 'Sync failed'
    );
  }

  return result;
}

async function pushLocalPatientProtocols(
  patientId: string,
  result: SyncResult
): Promise<void> {
  const pendingItems = await database
    .get<SyncQueue>('sync_queue')
    .query(
      Q.and(
        Q.where('entity_type', 'patient_protocol'),
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
            await api.post('/patient-protocols', payload);
            break;
          case 'update': {
            const serverVersion = await getServerVersion(item.entityId);
            const localVersion = (payload.version as number) || 1;

            if (serverVersion !== null && serverVersion > localVersion) {
              await resolveConflict(item.entityId, payload, serverVersion);
              result.conflicts++;
            } else {
              await api.put(`/patient-protocols/${item.entityId}`, payload);
            }
            break;
          }
          case 'delete':
            await api.delete(`/patient-protocols/${item.entityId}`);
            break;
        }

        await markPatientProtocolAsSynced(item.entityId);

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
            `Failed to sync patient protocol ${item.entityId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }
  }
}

async function pullServerPatientProtocols(
  patientId: string,
  result: SyncResult
): Promise<void> {
  try {
    const serverRecords = await api.get<ServerPatientProtocol[]>(
      `/patient-protocols?patientId=${patientId}`
    );

    await database.write(async () => {
      for (const serverRecord of serverRecords) {
        const existing = await database
          .get<PatientProtocol>('patient_protocols')
          .query(Q.where('remote_id', serverRecord.id))
          .fetch();

        if (existing.length === 0) {
          await database
            .get<PatientProtocol>('patient_protocols')
            .create((pp) => {
              pp.remoteId = serverRecord.id;
              pp.patientId = serverRecord.patientId;
              pp.protocolId = serverRecord.protocolId;
              pp.assignedDate = new Date(serverRecord.assignedDate);
              pp.currentWeek = serverRecord.currentWeek;
              pp.completedExercisesJSON = serverRecord.completedExercises;
              pp.progressStatus = serverRecord.progressStatus as any;
              pp.notes = serverRecord.notes;
              pp.version = serverRecord.version;
              pp.isSynced = true;
              pp.syncedAt = new Date();
            });
          result.synced++;
        } else {
          const local = existing[0];
          if (serverRecord.version > local.version) {
            await local.update((pp) => {
              pp.currentWeek = serverRecord.currentWeek;
              pp.completedExercisesJSON = serverRecord.completedExercises;
              pp.progressStatus = serverRecord.progressStatus as any;
              pp.notes = serverRecord.notes;
              pp.version = serverRecord.version;
              pp.isSynced = true;
              pp.syncedAt = new Date();
            });
            result.synced++;
          }
        }
      }
    });
  } catch (error) {
    result.errors.push(
      `Failed to pull patient protocols: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

async function getServerVersion(entityId: string): Promise<number | null> {
  try {
    const response = await api.get<{ version: number }>(
      `/patient-protocols/${entityId}/version`
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
  const serverData = await api.get<ServerPatientProtocol>(
    `/patient-protocols/${entityId}`
  );

  // Server-wins for progress data; local notes are preserved
  const merged = {
    ...serverData,
    notes: localPayload.notes || serverData.notes,
    version: serverVersion + 1,
  };

  await api.put(`/patient-protocols/${entityId}`, merged);

  await database.write(async () => {
    const records = await database
      .get<PatientProtocol>('patient_protocols')
      .query(Q.where('id', entityId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((pp) => {
        pp.currentWeek = serverData.currentWeek;
        pp.completedExercisesJSON = serverData.completedExercises;
        pp.progressStatus = serverData.progressStatus as any;
        pp.notes = (merged.notes as string) || undefined;
        pp.version = serverVersion + 1;
        pp.isSynced = true;
        pp.syncedAt = new Date();
      });
    }
  });
}

async function markPatientProtocolAsSynced(entityId: string): Promise<void> {
  await database.write(async () => {
    const records = await database
      .get<PatientProtocol>('patient_protocols')
      .query(Q.where('id', entityId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((pp) => {
        pp.isSynced = true;
        pp.syncedAt = new Date();
      });
    }
  });
}

export async function getUnsyncedProtocolCount(
  patientId: string
): Promise<number> {
  return database
    .get<PatientProtocol>('patient_protocols')
    .query(
      Q.and(
        Q.where('patient_id', patientId),
        Q.where('is_synced', false)
      )
    )
    .fetchCount();
}
