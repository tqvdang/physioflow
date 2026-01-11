import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface ChecklistItemProps {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChecklistItem({
  id,
  title,
  description,
  isCompleted,
  onToggle,
  disabled = false,
}: ChecklistItemProps) {
  const progress = useSharedValue(isCompleted ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    progress.value = withTiming(isCompleted ? 1 : 0, { duration: 200 });
  }, [isCompleted, progress]);

  const checkboxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      progress.value,
      [0, 1],
      [0, 1]
    ) === 1
      ? Colors.light.tint
      : Colors.light.background,
    borderColor: interpolate(
      progress.value,
      [0, 1],
      [0, 1]
    ) === 1
      ? Colors.light.tint
      : Colors.light.border,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(progress.value, [0, 1], [1, 0.8]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    textDecorationLine: progress.value === 1 ? 'line-through' : 'none',
    opacity: interpolate(progress.value, [0, 1], [1, 0.6]),
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSpring(0.98, {}, () => {
      scale.value = withSpring(1);
    });
    onToggle(id);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, containerStyle]}
    >
      <Animated.View style={[styles.checkbox, checkboxStyle]}>
        {isCompleted && (
          <Ionicons name="checkmark" size={16} color={Colors.light.background} />
        )}
      </Animated.View>

      <View style={styles.content}>
        <Animated.Text style={[styles.title, textStyle]}>{title}</Animated.Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
