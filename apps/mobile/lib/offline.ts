import { database, SyncQueue, Patient, Session, ChecklistItem, InsuranceCard } from './database';
import { Q } from '@nozbe/watermelondb';
import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

const MAX_SYNC_ATTEMPTS = 5;
const SYNC_BATCH_SIZE = 50;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function queueForSync(
  entityType: 'patient' | 'session' | 'checklist_item' | 'insurance_card' | 'outcome_measure' | 'invoice' | 'payment' | 'discharge_plan' | 'discharge_summary' | 'anatomy_region',
  entityId: string,
  action: 'create' | 'update' | 'delete',
  payload: unknown
): Promise<void> {
  await database.write(async () => {
    await database.get<SyncQueue>('sync_queue').create((item) => {
      item.entityType = entityType;
      item.entityId = entityId;
      item.action = action;
      item.payload = JSON.stringify(payload);
      item.attempts = 0;
    });
  });
}

async function processSyncItem(item: SyncQueue): Promise<boolean> {
  const payload = item.parsedPayload;
  const endpoint = getEndpointForEntity(item.entityType);

  try {
    switch (item.action) {
      case 'create':
        await api.post(endpoint, payload);
        break;
      case 'update':
        await api.put(`${endpoint}/${item.entityId}`, payload);
        break;
      case 'delete':
        await api.delete(`${endpoint}/${item.entityId}`);
        break;
    }

    // Mark local entity as synced
    await markEntityAsSynced(item.entityType, item.entityId);

    // Remove from sync queue
    await database.write(async () => {
      await item.destroyPermanently();
    });

    return true;
  } catch (error) {
    // Update attempt count
    await database.write(async () => {
      await item.update((i) => {
        i.attempts += 1;
        i.lastAttemptAt = new Date();
        i.error = error instanceof Error ? error.message : 'Unknown error';
      });
    });

    return false;
  }
}

function getEndpointForEntity(entityType: string): string {
  switch (entityType) {
    case 'patient':
      return '/patients';
    case 'session':
      return '/sessions';
    case 'checklist_item':
      return '/checklist-items';
    case 'insurance_card':
      return '/insurance-cards';
    case 'outcome_measure':
      return '/outcome-measures';
    case 'invoice':
      return '/invoices';
    case 'payment':
      return '/payments';
    case 'discharge_plan':
      return '/discharge-plans';
    case 'discharge_summary':
      return '/discharge-summaries';
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

async function markEntityAsSynced(
  entityType: string,
  entityId: string
): Promise<void> {
  const table = getTableForEntity(entityType);

  await database.write(async () => {
    const records = await database
      .get(table)
      .query(Q.where('id', entityId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((record: any) => {
        record.isSynced = true;
      });
    }
  });
}

function getTableForEntity(entityType: string): string {
  switch (entityType) {
    case 'patient':
      return 'patients';
    case 'session':
      return 'sessions';
    case 'checklist_item':
      return 'checklist_items';
    case 'insurance_card':
      return 'insurance_cards';
    case 'outcome_measure':
      return 'outcome_measures';
    case 'invoice':
      return 'invoices';
    case 'payment':
      return 'payments';
    case 'discharge_plan':
      return 'discharge_plans';
    case 'discharge_summary':
      return 'discharge_summaries';
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

export async function syncPendingItems(): Promise<SyncResult> {
  const online = await isOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['No internet connection'],
    };
  }

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pendingItems = await database
      .get<SyncQueue>('sync_queue')
      .query(Q.where('attempts', Q.lt(MAX_SYNC_ATTEMPTS)))
      .fetch();

    const batch = pendingItems.slice(0, SYNC_BATCH_SIZE);

    for (const item of batch) {
      const success = await processSyncItem(item);
      if (success) {
        result.synced++;
      } else {
        result.failed++;
      }
    }

    result.success = result.failed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Sync failed');
  }

  return result;
}

export async function pullFromServer(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  try {
    // Pull patients
    const patients = await api.get<any[]>('/patients');
    await database.write(async () => {
      for (const patient of patients) {
        const existing = await database
          .get<Patient>('patients')
          .query(Q.where('remote_id', patient.id))
          .fetch();

        if (existing.length === 0) {
          await database.get<Patient>('patients').create((p) => {
            p.remoteId = patient.id;
            p.firstName = patient.firstName;
            p.lastName = patient.lastName;
            p.dateOfBirth = new Date(patient.dateOfBirth);
            p.phone = patient.phone;
            p.email = patient.email;
            p.medicalNotes = patient.medicalNotes;
            p.isSynced = true;
          });
        }
      }
    });

    // Pull sessions for today
    const today = new Date().toISOString().split('T')[0];
    const sessions = await api.get<any[]>(`/sessions?date=${today}`);
    await database.write(async () => {
      for (const session of sessions) {
        const existing = await database
          .get<Session>('sessions')
          .query(Q.where('remote_id', session.id))
          .fetch();

        if (existing.length === 0) {
          await database.get<Session>('sessions').create((s) => {
            s.remoteId = session.id;
            s.patientId = session.patientId;
            s.therapistId = session.therapistId;
            s.scheduledAt = new Date(session.scheduledAt);
            s.durationMinutes = session.durationMinutes;
            s.status = session.status;
            s.sessionType = session.sessionType;
            s.notes = session.notes;
            s.painLevelBefore = session.painLevelBefore;
            s.painLevelAfter = session.painLevelAfter;
            s.isSynced = true;
          });
        }
      }
    });
  } catch (error) {
    console.error('Pull from server failed:', error);
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const items = await database
    .get<SyncQueue>('sync_queue')
    .query(Q.where('attempts', Q.lt(MAX_SYNC_ATTEMPTS)))
    .fetchCount();
  return items;
}
