import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface PainSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getPainColor = (level: number): string => {
  if (level <= 2) return '#22C55E'; // Green
  if (level <= 4) return '#84CC16'; // Lime
  if (level <= 6) return '#FBBF24'; // Yellow
  if (level <= 8) return '#F97316'; // Orange
  return '#EF4444'; // Red
};

const getPainLabel = (level: number): string => {
  if (level === 0) return 'No pain';
  if (level <= 2) return 'Mild';
  if (level <= 4) return 'Moderate';
  if (level <= 6) return 'Severe';
  if (level <= 8) return 'Very severe';
  return 'Worst possible';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PainSlider({
  value,
  onChange,
  label = 'Pain Level',
  disabled = false,
}: PainSliderProps) {
  const scale = useSharedValue(1);

  const handlePress = (level: number) => {
    if (disabled) return;
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onChange(level);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: getPainColor(value) }]}>
            {value}
          </Text>
          <Text style={styles.valueLabel}>{getPainLabel(value)}</Text>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        {PAIN_LEVELS.map((level) => (
          <PainButton
            key={level}
            level={level}
            isSelected={value === level}
            onPress={() => handlePress(level)}
            disabled={disabled}
          />
        ))}
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>No pain</Text>
        <Text style={styles.legendText}>Worst pain</Text>
      </View>
    </View>
  );
}

interface PainButtonProps {
  level: number;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
}

function PainButton({ level, isSelected, onPress, disabled }: PainButtonProps) {
  const scale = useSharedValue(1);
  const color = getPainColor(level);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.9);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.painButton,
        animatedStyle,
        isSelected && { backgroundColor: color, borderColor: color },
        disabled && styles.painButtonDisabled,
      ]}
    >
      <Text
        style={[
          styles.painButtonText,
          isSelected && styles.painButtonTextSelected,
        ]}
      >
        {level}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  valueLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  painButton: {
    width: 28,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  painButtonDisabled: {
    opacity: 0.5,
  },
  painButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  painButtonTextSelected: {
    color: Colors.light.background,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
});
