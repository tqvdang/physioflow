import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Colors } from '@/constants/Colors';
import { database } from '@/lib/database';
import type DischargePlanModel from '@/lib/database/models/DischargePlan';
import type DischargeSummaryModel from '@/lib/database/models/DischargeSummary';
import type Patient from '@/lib/database/models/Patient';
import { OutcomeComparisonTable } from '@/components/discharge/OutcomeComparisonTable';
import { HEPList } from '@/components/discharge/HEPList';
import { SummaryExport } from '@/components/discharge/SummaryExport';
import {
  createDischargePlan,
  generateDischargeSummary,
} from '@/services/discharge/summaryGenerator';
import {
  syncDischargePlans,
  syncDischargeSummaries,
} from '@/services/sync/dischargeSync';

export default function DischargeScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [plan, setPlan] = useState<DischargePlanModel | null>(null);
  const [summary, setSummary] = useState<DischargeSummaryModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = useCallback(async () => {
    if (!patientId) return;

    try {
      // Load patient
      const patients = await database
        .get<Patient>('patients')
        .query(Q.where('id', patientId))
        .fetch();
      if (patients.length > 0) {
        setPatient(patients[0]);
      }

      // Load most recent discharge plan
      const plans = await database
        .get<DischargePlanModel>('discharge_plans')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();
      setPlan(plans.length > 0 ? plans[0] : null);

      // Load most recent discharge summary
      const summaries = await database
        .get<DischargeSummaryModel>('discharge_summaries')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();
      setSummary(summaries.length > 0 ? summaries[0] : null);
    } catch (error) {
      console.error('Failed to load discharge data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async () => {
    if (!patientId) return;

    setIsCreatingPlan(true);
    try {
      const result = await createDischargePlan(patientId);
      if (result.success) {
        Alert.alert(
          'Discharge Plan Created',
          'Ke hoach xuat vien da duoc tao thanh cong.'
        );
        await loadData();
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to create discharge plan.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Create plan error:', error);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!patientId) return;

    setIsGeneratingSummary(true);
    try {
      const result = await generateDischargeSummary(patientId);
      if (result.success) {
        Alert.alert(
          'Summary Generated',
          'Bao cao xuat vien da duoc tao thanh cong.'
        );
        await loadData();
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to generate discharge summary.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Generate summary error:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSync = async () => {
    if (!patientId) return;

    setIsSyncing(true);
    try {
      const [planResult, summaryResult] = await Promise.all([
        syncDischargePlans(patientId),
        syncDischargeSummaries(patientId),
      ]);

      const totalSynced = planResult.synced + summaryResult.synced;
      const allErrors = [...planResult.errors, ...summaryResult.errors];

      if (allErrors.length === 0) {
        Alert.alert('Sync Complete', `${totalSynced} items synced successfully.`);
      } else {
        Alert.alert(
          'Sync Partial',
          `${totalSynced} synced, ${allErrors.length} errors:\n${allErrors.join('\n')}`
        );
      }

      await loadData();
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync discharge data.');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading discharge data...</Text>
      </View>
    );
  }

  const patientName = patient?.fullName ?? 'Patient';

  // No plan exists yet
  if (!plan) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text-outline" size={48} color={Colors.light.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Discharge Plan</Text>
          <Text style={styles.emptyTitleVi}>Chua co ke hoach xuat vien</Text>
          <Text style={styles.emptyDescription}>
            Create a discharge plan to track outcome comparisons, home exercises,
            and generate a discharge summary for {patientName}.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, isCreatingPlan && styles.buttonDisabled]}
            onPress={handleCreatePlan}
            disabled={isCreatingPlan}
            activeOpacity={0.7}
          >
            {isCreatingPlan ? (
              <ActivityIndicator size="small" color={Colors.light.background} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={Colors.light.background} />
            )}
            <Text style={styles.primaryButtonText}>
              {isCreatingPlan ? 'Creating...' : 'Create Discharge Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Plan exists - show discharge details
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.patientName}>{patientName}</Text>
          <View style={[styles.syncBadge, plan.isSynced ? styles.syncedBadge : styles.unsyncedBadge]}>
            <Ionicons
              name={plan.isSynced ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={14}
              color={plan.isSynced ? Colors.light.success : Colors.light.warning}
            />
            <Text style={[styles.syncText, { color: plan.isSynced ? Colors.light.success : Colors.light.warning }]}>
              {plan.isSynced ? 'Synced' : 'Offline'}
            </Text>
          </View>
        </View>
        <Text style={styles.headerMeta}>
          Planned date: {plan.plannedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={styles.headerMetaVi}>
          Ngay du kien: {plan.plannedDate.toLocaleDateString('vi-VN')}
        </Text>
      </View>

      {/* Outcome Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Baseline vs Discharge</Text>
        <Text style={styles.sectionTitleVi}>So sanh ban dau va xuat vien</Text>
        <OutcomeComparisonTable comparisons={plan.baselineComparison} />
      </View>

      {/* Home Exercise Program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Home Exercise Program (HEP)</Text>
        <Text style={styles.sectionTitleVi}>Chuong trinh bai tap tai nha</Text>
        <HEPList exercises={plan.hepExercises} />
      </View>

      {/* Recommendations */}
      {(plan.recommendations || plan.recommendationsVi) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <Text style={styles.sectionTitleVi}>Khuyen nghi</Text>
          <View style={styles.card}>
            {plan.recommendations ? (
              <Text style={styles.cardText}>{plan.recommendations}</Text>
            ) : null}
            {plan.recommendationsVi ? (
              <Text style={styles.cardTextVi}>{plan.recommendationsVi}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discharge Summary</Text>
        <Text style={styles.sectionTitleVi}>Bao cao xuat vien</Text>

        {summary ? (
          <SummaryExport summary={summary} patientName={patientName} />
        ) : (
          <View style={styles.noSummaryCard}>
            <Ionicons name="clipboard-outline" size={24} color={Colors.light.textSecondary} />
            <Text style={styles.noSummaryText}>No summary generated yet</Text>
            <Text style={styles.noSummaryTextVi}>Chua tao bao cao</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {!summary && (
          <TouchableOpacity
            style={[styles.actionButton, styles.generateButton, isGeneratingSummary && styles.buttonDisabled]}
            onPress={handleGenerateSummary}
            disabled={isGeneratingSummary}
            activeOpacity={0.7}
          >
            {isGeneratingSummary ? (
              <ActivityIndicator size="small" color={Colors.light.background} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={Colors.light.background} />
            )}
            <Text style={styles.actionButtonText}>
              {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton, isSyncing && styles.buttonDisabled]}
          onPress={handleSync}
          disabled={isSyncing}
          activeOpacity={0.7}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <Ionicons name="sync-outline" size={20} color={Colors.light.tint} />
          )}
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  emptyTitleVi: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Header
  header: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  syncedBadge: {
    backgroundColor: Colors.light.success + '15',
  },
  unsyncedBadge: {
    backgroundColor: Colors.light.warning + '15',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerMeta: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  headerMetaVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  sectionTitleVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  cardTextVi: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // No summary
  noSummaryCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noSummaryText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  noSummaryTextVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  generateButton: {
    backgroundColor: Colors.light.success,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  syncButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
  },

  bottomPadding: {
    height: 40,
  },
});
