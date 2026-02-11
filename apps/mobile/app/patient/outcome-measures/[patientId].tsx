import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Colors } from '@/constants/Colors';
import { ProgressChart } from '@/components';
import { database, OutcomeMeasure } from '@/lib/database';
import {
  MEASURE_TYPE_CONFIGS,
  type MeasureType,
  type MeasureTypeConfig,
} from '@/lib/database/models/OutcomeMeasure';
import { isOnline, queueForSync } from '@/lib/offline';
import {
  syncOutcomeMeasures,
  getUnsyncedMeasureCount,
} from '@/lib/sync/outcomeMeasuresSync';

interface MeasureGroup {
  measureType: MeasureType;
  config: MeasureTypeConfig;
  measures: OutcomeMeasure[];
  latestMeasure: OutcomeMeasure;
}

export default function OutcomeMeasuresScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();

  const [measureGroups, setMeasureGroups] = useState<MeasureGroup[]>([]);
  const [selectedType, setSelectedType] = useState<MeasureType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadMeasures = useCallback(async () => {
    if (!patientId) return;

    try {
      const measures = await database
        .get<OutcomeMeasure>('outcome_measures')
        .query(
          Q.and(
            Q.where('patient_id', patientId),
            Q.where('is_deleted', false)
          ),
          Q.sortBy('measurement_date', Q.desc)
        )
        .fetch();

      // Group by measure type
      const grouped = new Map<MeasureType, OutcomeMeasure[]>();
      for (const measure of measures) {
        const type = measure.measureType;
        if (!grouped.has(type)) {
          grouped.set(type, []);
        }
        grouped.get(type)!.push(measure);
      }

      const groups: MeasureGroup[] = [];
      for (const [measureType, typeMeasures] of grouped) {
        groups.push({
          measureType,
          config: MEASURE_TYPE_CONFIGS[measureType],
          measures: typeMeasures,
          latestMeasure: typeMeasures[0],
        });
      }

      // Sort groups alphabetically by label
      groups.sort((a, b) => a.config.label.localeCompare(b.config.label));

      setMeasureGroups(groups);

      // Auto-select first group if none selected
      if (!selectedType && groups.length > 0) {
        setSelectedType(groups[0].measureType);
      }

      // Check connectivity and unsynced count
      const [isConnected, unsynced] = await Promise.all([
        isOnline(),
        getUnsyncedMeasureCount(patientId),
      ]);
      setOnline(isConnected);
      setUnsyncedCount(unsynced);
    } catch (error) {
      console.error('Failed to load outcome measures:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, selectedType]);

  useEffect(() => {
    loadMeasures();
  }, [loadMeasures]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (patientId) {
      setSyncing(true);
      await syncOutcomeMeasures(patientId);
      setSyncing(false);
    }
    await loadMeasures();
    setRefreshing(false);
  }, [patientId, loadMeasures]);

  const handleSync = useCallback(async () => {
    if (!patientId || syncing) return;
    setSyncing(true);
    await syncOutcomeMeasures(patientId);
    await loadMeasures();
    setSyncing(false);
  }, [patientId, syncing, loadMeasures]);

  const handleEdit = useCallback(
    (measureId: string) => {
      router.push(
        `/patient/outcome-measures/edit/${measureId}`
      );
    },
    [router]
  );

  const handleDelete = useCallback(
    (item: OutcomeMeasure) => {
      Alert.alert(
        'Delete Measure',
        'Are you sure you want to delete this measurement? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Soft-delete locally
                await item.markAsDeleted();

                // Queue delete for server sync
                await queueForSync(
                  'outcome_measure',
                  item.id,
                  'delete',
                  {
                    patientId: item.patientId,
                    remoteId: item.remoteId,
                  }
                );

                // Refresh list
                await loadMeasures();
              } catch (error) {
                console.error('Failed to delete outcome measure:', error);
                Alert.alert(
                  'Error',
                  'Failed to delete outcome measure. Please try again.'
                );
              }
            },
          },
        ]
      );
    },
    [loadMeasures]
  );

  const selectedGroup = measureGroups.find(
    (g) => g.measureType === selectedType
  );

  const chartData = selectedGroup
    ? selectedGroup.measures
        .slice()
        .reverse()
        .map((m) => ({
          date: m.measurementDate.toISOString(),
          score: m.currentScore,
        }))
    : [];

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case 'baseline':
        return 'Baseline';
      case 'interim':
        return 'Interim';
      case 'discharge':
        return 'Discharge';
      default:
        return phase;
    }
  };

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'baseline':
        return Colors.light.warning;
      case 'interim':
        return Colors.light.tint;
      case 'discharge':
        return Colors.light.success;
      default:
        return Colors.light.textSecondary;
    }
  };

  const renderMeasureTypeTab = ({ item }: { item: MeasureGroup }) => {
    const isSelected = item.measureType === selectedType;
    return (
      <TouchableOpacity
        style={[styles.typeTab, isSelected && styles.typeTabSelected]}
        onPress={() => setSelectedType(item.measureType)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.typeTabText,
            isSelected && styles.typeTabTextSelected,
          ]}
        >
          {item.config.abbreviation}
        </Text>
        <Text
          style={[
            styles.typeTabCount,
            isSelected && styles.typeTabCountSelected,
          ]}
        >
          {item.measures.length}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMeasureItem = ({
    item,
  }: {
    item: OutcomeMeasure;
  }) => {
    const config = MEASURE_TYPE_CONFIGS[item.measureType];
    const progress = item.calculateProgress();

    return (
      <View style={styles.measureCard}>
        <View style={styles.measureHeader}>
          <View style={styles.measureDateRow}>
            <Text style={styles.measureDate}>
              {formatDate(item.measurementDate)}
            </Text>
            <View
              style={[
                styles.phaseBadge,
                { backgroundColor: getPhaseColor(item.phase) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.phaseText,
                  { color: getPhaseColor(item.phase) },
                ]}
              >
                {getPhaseLabel(item.phase)}
              </Text>
            </View>
          </View>
          <View style={styles.measureActions}>
            {!item.isSynced && (
              <Ionicons
                name="cloud-offline-outline"
                size={16}
                color={Colors.light.warning}
              />
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={Colors.light.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>
              {item.currentScore}
              {config.unit === '%' ? '%' : ''}
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Change</Text>
            <Text
              style={[
                styles.scoreValue,
                {
                  color: item.hasMcidImprovement
                    ? Colors.light.success
                    : Colors.light.textSecondary,
                },
              ]}
            >
              {item.changeFromBaseline > 0 ? '+' : ''}
              {item.changeFromBaseline}
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Progress</Text>
            <Text style={[styles.scoreValue, { color: Colors.light.tint }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, progress)}%`,
                backgroundColor: item.hasMcidImprovement
                  ? Colors.light.success
                  : Colors.light.tint,
              },
            ]}
          />
        </View>

        {item.notes ? (
          <Text style={styles.measureNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading measures...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline indicator */}
      {!online && (
        <View style={styles.offlineBanner}>
          <Ionicons
            name="cloud-offline-outline"
            size={16}
            color={Colors.light.background}
          />
          <Text style={styles.offlineBannerText}>
            Offline - changes will sync when connected
          </Text>
        </View>
      )}

      {/* Unsynced indicator */}
      {unsyncedCount > 0 && online && (
        <TouchableOpacity
          style={styles.syncBanner}
          onPress={handleSync}
          activeOpacity={0.7}
        >
          <Ionicons
            name="sync-outline"
            size={16}
            color={Colors.light.background}
          />
          <Text style={styles.syncBannerText}>
            {syncing
              ? 'Syncing...'
              : `${unsyncedCount} unsynced measure${unsyncedCount > 1 ? 's' : ''} - tap to sync`}
          </Text>
        </TouchableOpacity>
      )}

      {measureGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="analytics-outline"
            size={64}
            color={Colors.light.border}
          />
          <Text style={styles.emptyTitle}>No Outcome Measures</Text>
          <Text style={styles.emptySubtitle}>
            Record your first outcome measure to start tracking patient
            progress.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() =>
              router.push(
                `/patient/outcome-measures/record/${patientId}`
              )
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.light.background}
            />
            <Text style={styles.emptyButtonText}>Record Measure</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Measure type tabs */}
          <FlatList
            data={measureGroups}
            renderItem={renderMeasureTypeTab}
            keyExtractor={(item) => item.measureType}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeTabList}
            contentContainerStyle={styles.typeTabListContent}
          />

          {/* Chart section */}
          {selectedGroup && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>
                {selectedGroup.config.label}
              </Text>
              <Text style={styles.chartSubtitle}>
                {selectedGroup.measures.length} measurement
                {selectedGroup.measures.length > 1 ? 's' : ''} recorded
              </Text>
              <ProgressChart
                data={chartData}
                baselineScore={selectedGroup.latestMeasure.baselineScore}
                targetScore={selectedGroup.latestMeasure.targetScore}
                mcidThreshold={selectedGroup.latestMeasure.mcidThreshold}
                config={selectedGroup.config}
              />
            </View>
          )}

          {/* Measurement history */}
          <FlatList
            data={selectedGroup?.measures || []}
            renderItem={renderMeasureItem}
            keyExtractor={(item) => item.id}
            style={styles.measureList}
            contentContainerStyle={styles.measureListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.light.tint}
              />
            }
            ListHeaderComponent={
              <Text style={styles.historyTitle}>Measurement History</Text>
            }
            ListFooterComponent={<View style={styles.bottomPadding} />}
          />
        </>
      )}

      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push(
            `/patient/outcome-measures/record/${patientId}`
          )
        }
        activeOpacity={0.8}
      >
        <Ionicons
          name="add"
          size={28}
          color={Colors.light.background}
        />
      </TouchableOpacity>
    </View>
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
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.textSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    fontSize: 13,
    color: Colors.light.background,
    fontWeight: '500',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  syncBannerText: {
    fontSize: 13,
    color: Colors.light.background,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  typeTabList: {
    flexGrow: 0,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  typeTabListContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeTabSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  typeTabTextSelected: {
    color: Colors.light.background,
  },
  typeTabCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeTabCountSelected: {
    color: Colors.light.tint,
  },
  chartSection: {
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  chartSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  measureList: {
    flex: 1,
  },
  measureListContent: {
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  measureCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  measureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  measureActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  measureDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  measureDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  measureNotes: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomPadding: {
    height: 80,
  },
});
