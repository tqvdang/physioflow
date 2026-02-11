import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Colors } from '@/constants/Colors';
import { database, ReevaluationAssessment } from '@/lib/database';

interface ReevaluationScreenProps {
  patientId: string;
  patientName: string;
}

type InterpretationResult = 'improved' | 'declined' | 'stable';

interface ComparisonRow {
  measureLabel: string;
  baselineValue: number;
  currentValue: number;
  change: number;
  changePercentage?: number;
  mcidAchieved: boolean;
  interpretation: InterpretationResult;
}

/**
 * Mobile re-evaluation screen with simplified comparison view.
 * Shows a summary of baseline vs current assessments with color-coded
 * interpretation badges and MCID indicators.
 */
export function ReevaluationScreen({
  patientId,
  patientName,
}: ReevaluationScreenProps) {
  const [data, setData] = useState<ComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const records = await database.collections
        .get<ReevaluationAssessment>('reevaluation_assessments')
        .query(Q.where('patient_id', patientId), Q.sortBy('assessed_at', Q.desc))
        .fetch();

      const rows: ComparisonRow[] = records.map((r) => ({
        measureLabel: r.measureLabel,
        baselineValue: r.baselineValue,
        currentValue: r.currentValue,
        change: r.change,
        changePercentage: r.changePercentage,
        mcidAchieved: r.mcidAchieved,
        interpretation: r.interpretation,
      }));

      setData(rows);
    } catch (error) {
      console.error('Failed to load reevaluation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const improved = data.filter((d) => d.interpretation === 'improved').length;
    const declined = data.filter((d) => d.interpretation === 'declined').length;
    const stable = data.filter((d) => d.interpretation === 'stable').length;
    const mcid = data.filter((d) => d.mcidAchieved).length;
    return { improved, declined, stable, mcid, total: data.length };
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Re-evaluation</Text>
        <Text style={styles.subtitle}>{patientName}</Text>
      </View>

      {/* Summary badges */}
      {data.length > 0 && (
        <View style={styles.summaryRow}>
          {summary.improved > 0 && (
            <View style={[styles.badge, styles.badgeImproved]}>
              <Ionicons name="trending-up" size={14} color="#16a34a" />
              <Text style={styles.badgeTextImproved}>
                {summary.improved} Improved
              </Text>
            </View>
          )}
          {summary.declined > 0 && (
            <View style={[styles.badge, styles.badgeDeclined]}>
              <Ionicons name="trending-down" size={14} color="#dc2626" />
              <Text style={styles.badgeTextDeclined}>
                {summary.declined} Declined
              </Text>
            </View>
          )}
          {summary.stable > 0 && (
            <View style={[styles.badge, styles.badgeStable]}>
              <Ionicons name="remove" size={14} color="#6b7280" />
              <Text style={styles.badgeTextStable}>
                {summary.stable} Stable
              </Text>
            </View>
          )}
          {summary.mcid > 0 && (
            <View style={[styles.badge, styles.badgeMCID]}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text style={styles.badgeTextImproved}>
                {summary.mcid} MCID
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Comparison cards */}
      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No re-evaluation history</Text>
        </View>
      ) : (
        data.map((row, index) => (
          <ComparisonCard key={index} row={row} />
        ))
      )}
    </ScrollView>
  );
}

function ComparisonCard({ row }: { row: ComparisonRow }) {
  const interpretationColor =
    row.interpretation === 'improved'
      ? '#16a34a'
      : row.interpretation === 'declined'
      ? '#dc2626'
      : '#6b7280';

  const interpretationIcon =
    row.interpretation === 'improved'
      ? 'trending-up'
      : row.interpretation === 'declined'
      ? 'trending-down'
      : 'remove';

  const sign = row.change > 0 ? '+' : '';
  const pctStr =
    row.changePercentage !== undefined
      ? ` (${row.change > 0 ? '+' : ''}${row.changePercentage.toFixed(1)}%)`
      : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{row.measureLabel}</Text>
        <View style={[styles.interpretBadge, { borderColor: interpretationColor }]}>
          <Ionicons
            name={interpretationIcon as any}
            size={12}
            color={interpretationColor}
          />
          <Text style={[styles.interpretText, { color: interpretationColor }]}>
            {row.interpretation.charAt(0).toUpperCase() + row.interpretation.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.valuesRow}>
        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>Baseline</Text>
          <Text style={styles.valueNumber}>{row.baselineValue}</Text>
        </View>
        <View style={styles.arrowCol}>
          <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
        </View>
        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>Current</Text>
          <Text style={styles.valueNumber}>{row.currentValue}</Text>
        </View>
        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>Change</Text>
          <Text style={[styles.valueNumber, { color: interpretationColor }]}>
            {sign}
            {row.change}
            {pctStr}
          </Text>
        </View>
      </View>

      {row.mcidAchieved && (
        <View style={styles.mcidRow}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.mcidText}>MCID Achieved</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeImproved: {
    backgroundColor: '#dcfce7',
  },
  badgeDeclined: {
    backgroundColor: '#fee2e2',
  },
  badgeStable: {
    backgroundColor: '#f3f4f6',
  },
  badgeMCID: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  badgeTextImproved: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  badgeTextDeclined: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  badgeTextStable: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  interpretBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  interpretText: {
    fontSize: 11,
    fontWeight: '600',
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
  },
  arrowCol: {
    paddingHorizontal: 4,
  },
  valueLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  valueNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mcidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mcidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
});
