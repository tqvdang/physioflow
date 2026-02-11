import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface ExerciseCardProps {
  id: string;
  name: string;
  nameVi: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  videoUrl?: string;
  isCompleted: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function ExerciseCard({
  id,
  name,
  nameVi,
  sets,
  reps,
  durationSeconds,
  videoUrl,
  isCompleted,
  onToggle,
  disabled = false,
}: ExerciseCardProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <Pressable
      onPress={() => !disabled && onToggle(id)}
      disabled={disabled}
      style={[styles.container, isCompleted && styles.containerCompleted]}
    >
      <View style={styles.checkboxContainer}>
        <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
          {isCompleted && (
            <Ionicons name="checkmark" size={16} color={Colors.light.background} />
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, isCompleted && styles.textCompleted]}>{name}</Text>
        <Text style={[styles.nameVi, isCompleted && styles.textCompleted]}>{nameVi}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailBadge}>
            <Ionicons name="repeat-outline" size={14} color={Colors.light.tint} />
            <Text style={styles.detailText}>{sets} sets</Text>
          </View>
          <View style={styles.detailBadge}>
            <Ionicons name="fitness-outline" size={14} color={Colors.light.tint} />
            <Text style={styles.detailText}>{reps} reps</Text>
          </View>
          {durationSeconds != null && durationSeconds > 0 && (
            <View style={styles.detailBadge}>
              <Ionicons name="time-outline" size={14} color={Colors.light.tint} />
              <Text style={styles.detailText}>{formatDuration(durationSeconds)}</Text>
            </View>
          )}
        </View>
      </View>

      {videoUrl ? (
        <View style={styles.videoThumbnail}>
          <Ionicons name="play-circle-outline" size={28} color={Colors.light.tint} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 8,
  },
  containerCompleted: {
    opacity: 0.7,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  checkboxContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  nameVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  videoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
