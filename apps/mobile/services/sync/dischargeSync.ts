import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/database';
import { api } from '@/lib/api';
import { isOnline } from '@/lib/offline';
import type DischargePlan from '@/lib/database/models/DischargePlan';
import type DischargeSummary from '@/lib/database/models/DischargeSummary';

interface DischargeSyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

export async function syncDischargePlans(
  patientId: string
): Promise<DischargeSyncResult> {
  const result: DischargeSyncResult = { success: true, synced: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, errors: ['No internet connection'] };
  }

  try {
    // Push unsynced plans to server
    const unsyncedPlans = await database
      .get<DischargePlan>('discharge_plans')
      .query(
        Q.and(
          Q.where('patient_id', patientId),
          Q.where('is_synced', false)
        )
      )
      .fetch();

    for (const plan of unsyncedPlans) {
      try {
        const payload = {
          patientId: plan.patientId,
          plannedDate: plan.plannedDate.toISOString(),
          baselineComparison: plan.baselineComparison,
          outcomeTrending: plan.outcomeTrending,
          hepExercises: plan.hepExercises,
          recommendations: plan.recommendations,
          recommendationsVi: plan.recommendationsVi,
          version: plan.version,
        };

        const response = plan.remoteId
          ? await api.put<{ id: string }>(`/discharge-plans/${plan.remoteId}`, payload)
          : await api.post<{ id: string }>('/discharge-plans', payload);

        await database.write(async () => {
          await plan.update((record) => {
            record.isSynced = true;
            record.syncedAt = new Date();
            if (!record.remoteId && response.id) {
              record.remoteId = response.id;
            }
          });
        });

        result.synced++;
      } catch (error) {
        result.errors.push(
          `Plan ${plan.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Pull plans from server
    try {
      const serverPlans = await api.get<any[]>(
        `/discharge-plans?patientId=${patientId}`
      );

      await database.write(async () => {
        for (const serverPlan of serverPlans) {
          const existing = await database
            .get<DischargePlan>('discharge_plans')
            .query(Q.where('remote_id', serverPlan.id))
            .fetch();

          if (existing.length === 0) {
            await database
              .get<DischargePlan>('discharge_plans')
              .create((record) => {
                record.remoteId = serverPlan.id;
                record.patientId = serverPlan.patientId;
                record.plannedDate = new Date(serverPlan.plannedDate);
                record.baselineComparisonRaw = JSON.stringify(
                  serverPlan.baselineComparison ?? []
                );
                record.outcomeTrendingRaw = JSON.stringify(
                  serverPlan.outcomeTrending ?? []
                );
                record.hepExercisesRaw = JSON.stringify(
                  serverPlan.hepExercises ?? []
                );
                record.recommendations = serverPlan.recommendations ?? '';
                record.recommendationsVi = serverPlan.recommendationsVi ?? '';
                record.version = serverPlan.version ?? 1;
                record.isSynced = true;
                record.syncedAt = new Date();
              });
          }
        }
      });
    } catch (error) {
      result.errors.push(
        `Pull plans: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Sync failed');
  }

  return result;
}

export async function syncDischargeSummaries(
  patientId: string
): Promise<DischargeSyncResult> {
  const result: DischargeSyncResult = { success: true, synced: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, errors: ['No internet connection'] };
  }

  try {
    // Push unsynced summaries to server
    const unsyncedSummaries = await database
      .get<DischargeSummary>('discharge_summaries')
      .query(
        Q.and(
          Q.where('patient_id', patientId),
          Q.where('is_synced', false)
        )
      )
      .fetch();

    for (const summary of unsyncedSummaries) {
      try {
        const payload = {
          patientId: summary.patientId,
          dischargeDate: summary.dischargeDate.toISOString(),
          summaryText: summary.summaryText,
          summaryTextVi: summary.summaryTextVi,
          finalScores: summary.finalScores,
          improvementPercent: summary.improvementPercent,
          followUpRecommendations: summary.followUpRecommendations,
        };

        const response = summary.remoteId
          ? await api.put<{ id: string }>(
              `/discharge-summaries/${summary.remoteId}`,
              payload
            )
          : await api.post<{ id: string }>('/discharge-summaries', payload);

        await database.write(async () => {
          await summary.update((record) => {
            record.isSynced = true;
            if (!record.remoteId && response.id) {
              record.remoteId = response.id;
            }
          });
        });

        result.synced++;
      } catch (error) {
        result.errors.push(
          `Summary ${summary.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Pull summaries from server
    try {
      const serverSummaries = await api.get<any[]>(
        `/discharge-summaries?patientId=${patientId}`
      );

      await database.write(async () => {
        for (const serverSummary of serverSummaries) {
          const existing = await database
            .get<DischargeSummary>('discharge_summaries')
            .query(Q.where('remote_id', serverSummary.id))
            .fetch();

          if (existing.length === 0) {
            await database
              .get<DischargeSummary>('discharge_summaries')
              .create((record) => {
                record.remoteId = serverSummary.id;
                record.patientId = serverSummary.patientId;
                record.dischargeDate = new Date(serverSummary.dischargeDate);
                record.summaryText = serverSummary.summaryText ?? '';
                record.summaryTextVi = serverSummary.summaryTextVi ?? '';
                record.finalScoresRaw = JSON.stringify(
                  serverSummary.finalScores ?? []
                );
                record.improvementPercent = serverSummary.improvementPercent ?? 0;
                record.followUpRecommendations =
                  serverSummary.followUpRecommendations ?? '';
                record.isSynced = true;
              });
          }
        }
      });
    } catch (error) {
      result.errors.push(
        `Pull summaries: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Sync failed');
  }

  return result;
}
