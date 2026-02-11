import { Q } from '@nozbe/watermelondb';
import { database, InsuranceCard } from '@/lib/database';
import { api, ApiError } from '@/lib/api';
import { isOnline } from '@/lib/offline';

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export interface SyncConflict {
  localRecord: Record<string, unknown>;
  serverRecord: Record<string, unknown>;
  entityType: string;
  entityId: string;
}

export type ConflictResolution = 'server' | 'client';

type ConflictHandler = (conflict: SyncConflict) => Promise<ConflictResolution>;

interface InsuranceSyncResult {
  synced: number;
  conflicts: number;
  failed: number;
  errors: string[];
}

function serializeInsuranceCard(card: InsuranceCard): Record<string, unknown> {
  return {
    id: card.id,
    remoteId: card.remoteId,
    patientId: card.patientId,
    bhytCardNumber: card.bhytCardNumber,
    bhytPrefixCode: card.bhytPrefixCode,
    bhytCoveragePercent: card.bhytCoveragePercent,
    bhytCopayRate: card.bhytCopayRate,
    validFrom: card.validFrom?.toISOString(),
    validTo: card.validTo?.toISOString(),
    isVerified: card.isVerified,
    version: card.version,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function syncSingleCard(
  card: InsuranceCard,
  onConflict: ConflictHandler
): Promise<{ success: boolean; conflict: boolean }> {
  const serialized = serializeInsuranceCard(card);

  try {
    const endpoint = card.remoteId
      ? `/patients/${card.patientId}/insurance/${card.remoteId}`
      : `/patients/${card.patientId}/insurance`;

    if (card.remoteId) {
      // Update existing card with optimistic locking
      await api.put(endpoint, {
        ...serialized,
        version: card.version,
      });
    } else {
      // Create new card
      const response = await api.post<{ id: string; version: number }>(endpoint, serialized);
      await database.write(async () => {
        await card.update((c) => {
          c.remoteId = response.id;
          c.version = response.version;
        });
      });
    }

    // Mark as synced
    await database.write(async () => {
      await card.update((c) => {
        c.isSynced = true;
        c.syncedAt = new Date();
      });
    });

    return { success: true, conflict: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      // Version conflict - fetch server version and resolve
      try {
        const serverCard = await api.get<Record<string, unknown>>(
          `/patients/${card.patientId}/insurance/${card.remoteId}`
        );

        const resolution = await onConflict({
          localRecord: serialized,
          serverRecord: serverCard,
          entityType: 'insurance_card',
          entityId: card.id,
        });

        if (resolution === 'server') {
          // Accept server version
          await database.write(async () => {
            await card.update((c) => {
              c.bhytCardNumber = serverCard.bhytCardNumber as string;
              c.bhytPrefixCode = serverCard.bhytPrefixCode as string;
              c.bhytCoveragePercent = serverCard.bhytCoveragePercent as number;
              c.bhytCopayRate = serverCard.bhytCopayRate as number;
              c.validFrom = new Date(serverCard.validFrom as string);
              c.validTo = new Date(serverCard.validTo as string);
              c.isVerified = serverCard.isVerified as boolean;
              c.version = serverCard.version as number;
              c.isSynced = true;
              c.syncedAt = new Date();
            });
          });
        } else {
          // Force push client version with server's current version
          await api.put(
            `/patients/${card.patientId}/insurance/${card.remoteId}`,
            {
              ...serialized,
              version: serverCard.version as number,
            }
          );

          await database.write(async () => {
            await card.update((c) => {
              c.version = (serverCard.version as number) + 1;
              c.isSynced = true;
              c.syncedAt = new Date();
            });
          });
        }

        return { success: true, conflict: true };
      } catch {
        return { success: false, conflict: true };
      }
    }

    throw error;
  }
}

export async function syncInsuranceCards(
  patientId: string,
  onConflict: ConflictHandler
): Promise<InsuranceSyncResult> {
  const result: InsuranceSyncResult = {
    synced: 0,
    conflicts: 0,
    failed: 0,
    errors: [],
  };

  const online = await isOnline();
  if (!online) {
    result.errors.push('No internet connection');
    return result;
  }

  try {
    const unsyncedCards = await database.collections
      .get<InsuranceCard>('insurance_cards')
      .query(
        Q.where('patient_id', patientId),
        Q.where('is_synced', false)
      )
      .fetch();

    if (unsyncedCards.length === 0) {
      return result;
    }

    const batches = chunk(unsyncedCards, BATCH_SIZE);

    for (const batch of batches) {
      let retries = 0;
      let batchSuccess = false;

      while (retries < MAX_RETRIES && !batchSuccess) {
        try {
          const batchResults = await Promise.allSettled(
            batch.map((card) => syncSingleCard(card, onConflict))
          );

          let allSucceeded = true;
          for (const batchResult of batchResults) {
            if (batchResult.status === 'fulfilled') {
              result.synced++;
              if (batchResult.value.conflict) {
                result.conflicts++;
              }
            } else {
              allSucceeded = false;
              result.failed++;
              result.errors.push(
                batchResult.reason instanceof Error
                  ? batchResult.reason.message
                  : 'Unknown sync error'
              );
            }
          }

          batchSuccess = allSucceeded;
        } catch (error) {
          retries++;
          if (retries < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s
            await delay(Math.pow(2, retries) * 1000);
          } else {
            result.failed += batch.length;
            result.errors.push(
              `Batch failed after ${MAX_RETRIES} retries: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            );
          }
        }
      }
    }
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Sync failed'
    );
  }

  return result;
}

export async function pullInsuranceCards(patientId: string): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  try {
    const serverCards = await api.get<any[]>(
      `/patients/${patientId}/insurance`
    );

    await database.write(async () => {
      for (const serverCard of serverCards) {
        const existing = await database
          .get<InsuranceCard>('insurance_cards')
          .query(Q.where('remote_id', serverCard.id))
          .fetch();

        if (existing.length === 0) {
          await database.get<InsuranceCard>('insurance_cards').create((c) => {
            c.remoteId = serverCard.id;
            c.patientId = patientId;
            c.bhytCardNumber = serverCard.bhytCardNumber;
            c.bhytPrefixCode = serverCard.bhytPrefixCode;
            c.bhytCoveragePercent = serverCard.bhytCoveragePercent;
            c.bhytCopayRate = serverCard.bhytCopayRate;
            c.validFrom = new Date(serverCard.validFrom);
            c.validTo = new Date(serverCard.validTo);
            c.isVerified = serverCard.isVerified;
            c.version = serverCard.version;
            c.isSynced = true;
            c.syncedAt = new Date();
          });
        } else {
          // Update if server version is newer
          const local = existing[0];
          if (serverCard.version > local.version && local.isSynced) {
            await local.update((c) => {
              c.bhytCardNumber = serverCard.bhytCardNumber;
              c.bhytPrefixCode = serverCard.bhytPrefixCode;
              c.bhytCoveragePercent = serverCard.bhytCoveragePercent;
              c.bhytCopayRate = serverCard.bhytCopayRate;
              c.validFrom = new Date(serverCard.validFrom);
              c.validTo = new Date(serverCard.validTo);
              c.isVerified = serverCard.isVerified;
              c.version = serverCard.version;
              c.syncedAt = new Date();
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Pull insurance cards failed:', error);
  }
}
