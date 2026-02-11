import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/Colors';
import type { MeasureTypeConfig } from '@/lib/database/models/OutcomeMeasure';

interface DataPoint {
  date: string;
  score: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  baselineScore: number;
  targetScore: number;
  mcidThreshold: number;
  config: MeasureTypeConfig;
}

const CHART_PADDING = 32;

export function ProgressChart({
  data,
  baselineScore,
  targetScore,
  mcidThreshold,
  config,
}: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No measurements recorded yet</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - CHART_PADDING;

  // Format date labels to fit the chart
  const formatLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Show at most 6 labels to prevent overlap
  const maxLabels = 6;
  const labelInterval = Math.max(1, Math.floor(data.length / maxLabels));
  const labels = data.map((d, i) =>
    i % labelInterval === 0 || i === data.length - 1
      ? formatLabel(d.date)
      : ''
  );

  const scores = data.map((d) => d.score);

  // Build datasets: scores + baseline + target + MCID line
  const baselineData = data.map(() => baselineScore);
  const targetData = data.map(() => targetScore);

  // MCID threshold line: baseline +/- mcid depending on direction
  const mcidLineValue = config.lowerIsBetter
    ? baselineScore - mcidThreshold
    : baselineScore + mcidThreshold;
  const mcidData = data.map(() => mcidLineValue);

  const chartData = {
    labels,
    datasets: [
      {
        data: scores,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: baselineData,
        color: (opacity = 1) => `rgba(220, 38, 38, ${opacity * 0.5})`,
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: targetData,
        color: (opacity = 1) => `rgba(22, 163, 74, ${opacity * 0.5})`,
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: mcidData,
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity * 0.5})`,
        strokeWidth: 1,
        withDots: false,
      },
    ],
    legend: ['Score', 'Baseline', 'Target', 'MCID'],
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={screenWidth}
        height={220}
        yAxisSuffix={config.unit === '%' ? '%' : ''}
        chartConfig={{
          backgroundColor: Colors.light.background,
          backgroundGradientFrom: Colors.light.background,
          backgroundGradientTo: Colors.light.background,
          decimalPlaces: config.unit === 'seconds' ? 1 : 0,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          labelColor: (opacity = 1) =>
            `rgba(104, 112, 118, ${opacity})`,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: Colors.light.tint,
          },
          propsForBackgroundLines: {
            strokeDasharray: '4',
            stroke: Colors.light.border,
          },
        }}
        bezier
        style={styles.chart}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color="#10B981" label="Score" />
        <LegendItem color="rgba(220, 38, 38, 0.5)" label="Baseline" />
        <LegendItem color="rgba(22, 163, 74, 0.5)" label="Target" />
        <LegendItem color="rgba(245, 158, 11, 0.5)" label="MCID" />
      </View>

      {/* Score summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Baseline</Text>
          <Text style={[styles.summaryValue, { color: Colors.light.error }]}>
            {baselineScore}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Current</Text>
          <Text style={[styles.summaryValue, { color: Colors.light.tint }]}>
            {scores[scores.length - 1]}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Target</Text>
          <Text
            style={[styles.summaryValue, { color: Colors.light.success }]}
          >
            {targetScore}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>MCID</Text>
          <Text
            style={[styles.summaryValue, { color: Colors.light.warning }]}
          >
            {mcidThreshold}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  chart: {
    borderRadius: 8,
    marginLeft: -8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
