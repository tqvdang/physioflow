import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { BaselineComparison } from '@/lib/database/models/DischargePlan';

interface OutcomeComparisonTableProps {
  comparisons: BaselineComparison[];
}

export function OutcomeComparisonTable({ comparisons }: OutcomeComparisonTableProps) {
  if (comparisons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No outcome measures recorded</Text>
        <Text style={styles.emptySubtext}>Chua co do luong ket qua nao</Text>
      </View>
    );
  }

  const getChangeIndicator = (comparison: BaselineComparison): string => {
    const { change, lowerIsBetter } = comparison;
    if (change === 0) return '-';
    const improved = lowerIsBetter ? change < 0 : change > 0;
    return improved ? '\u2191' : '\u2193';
  };

  const getChangeColor = (comparison: BaselineComparison): string => {
    const { change, lowerIsBetter } = comparison;
    if (change === 0) return Colors.light.textSecondary;
    const improved = lowerIsBetter ? change < 0 : change > 0;
    return improved ? Colors.light.success : Colors.light.error;
  };

  const formatChange = (change: number): string => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  };

  const formatPercent = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
  };

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.measureCell]}>Measure</Text>
        <Text style={[styles.headerCell, styles.scoreCell]}>Baseline</Text>
        <Text style={[styles.headerCell, styles.scoreCell]}>Discharge</Text>
        <Text style={[styles.headerCell, styles.changeCell]}>Change</Text>
        <Text style={[styles.headerCell, styles.percentCell]}>%</Text>
      </View>

      {/* Data rows */}
      {comparisons.map((comparison, index) => {
        const changeColor = getChangeColor(comparison);
        const indicator = getChangeIndicator(comparison);
        const isLastRow = index === comparisons.length - 1;

        return (
          <View
            key={comparison.measureType}
            style={[styles.dataRow, !isLastRow && styles.dataRowBorder]}
          >
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel} numberOfLines={1}>
                {comparison.label}
              </Text>
              {comparison.metMcid && (
                <Text style={styles.mcidBadge}>{'\u2713'} MCID</Text>
              )}
            </View>
            <Text style={[styles.dataCell, styles.scoreCell]}>
              {comparison.baselineScore.toFixed(1)}
            </Text>
            <Text style={[styles.dataCell, styles.scoreCell]}>
              {comparison.dischargeScore.toFixed(1)}
            </Text>
            <Text style={[styles.dataCell, styles.changeCell, { color: changeColor }]}>
              {indicator} {formatChange(comparison.change)}
            </Text>
            <Text style={[styles.dataCell, styles.percentCell, { color: changeColor }]}>
              {formatPercent(comparison.percentImprovement)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  emptyContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dataCell: {
    fontSize: 14,
    color: Colors.light.text,
  },
  measureCell: {
    flex: 2.5,
    paddingRight: 4,
  },
  scoreCell: {
    flex: 1.2,
    textAlign: 'center',
  },
  changeCell: {
    flex: 1.3,
    textAlign: 'center',
  },
  percentCell: {
    flex: 1,
    textAlign: 'right',
  },
  measureLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  mcidBadge: {
    fontSize: 11,
    color: Colors.light.success,
    fontWeight: '600',
    marginTop: 2,
  },
});
