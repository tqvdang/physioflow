import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type { HEPExercise } from '@/lib/database/models/DischargePlan';

interface HEPListProps {
  exercises: HEPExercise[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function ExerciseItem({ exercise, index }: { exercise: HEPExercise; index: number }) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseNameVi}>{exercise.nameVi}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="repeat-outline" size={16} color={Colors.light.tint} />
          <Text style={styles.detailLabel}>Sets</Text>
          <Text style={styles.detailValue}>{exercise.sets}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="fitness-outline" size={16} color={Colors.light.tint} />
          <Text style={styles.detailLabel}>Reps</Text>
          <Text style={styles.detailValue}>{exercise.reps}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="timer-outline" size={16} color={Colors.light.tint} />
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{formatDuration(exercise.durationSeconds)}</Text>
        </View>
      </View>

      <View style={styles.frequencyRow}>
        <Ionicons name="calendar-outline" size={14} color={Colors.light.textSecondary} />
        <Text style={styles.frequencyText}>
          {exercise.frequency} / {exercise.frequencyVi}
        </Text>
      </View>

      {exercise.instructions ? (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>{exercise.instructions}</Text>
          {exercise.instructionsVi ? (
            <Text style={styles.instructionsTextVi}>{exercise.instructionsVi}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function HEPList({ exercises }: HEPListProps) {
  if (exercises.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="barbell-outline" size={32} color={Colors.light.textSecondary} />
        <Text style={styles.emptyText}>No exercises assigned</Text>
        <Text style={styles.emptySubtext}>Chua co bai tap nao duoc chi dinh</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={exercises}
      keyExtractor={(_, index) => `exercise-${index}`}
      renderItem={({ item, index }) => <ExerciseItem exercise={item} index={index} />}
      scrollEnabled={false}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
  nameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  exerciseNameVi: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  frequencyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  instructionsContainer: {
    marginTop: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  instructionsTextVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
});
