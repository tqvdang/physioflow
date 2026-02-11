import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface ProgressBarProps {
  currentWeek: number;
  totalWeeks: number;
  label?: string;
}

export function ProgressBar({ currentWeek, totalWeeks, label }: ProgressBarProps) {
  const percent = totalWeeks > 0 ? Math.min(100, (currentWeek / totalWeeks) * 100) : 0;

  const getBarColor = (): string => {
    if (percent >= 100) return Colors.light.success;
    if (percent >= 50) return Colors.light.tint;
    if (percent >= 25) return Colors.light.warning;
    return Colors.light.tint;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label || 'Progress'}</Text>
        <Text style={styles.weekText}>
          Week {currentWeek} / {totalWeeks}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${percent}%`, backgroundColor: getBarColor() },
          ]}
        />
      </View>
      <Text style={styles.percentText}>{Math.round(percent)}% complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  weekText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
});
