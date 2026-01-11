import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface QuickActionButtonProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
}: QuickActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          background: Colors.light.tint,
          text: Colors.light.background,
        };
      case 'secondary':
        return {
          background: Colors.light.backgroundSecondary,
          text: Colors.light.text,
        };
      case 'success':
        return {
          background: Colors.light.success,
          text: Colors.light.background,
        };
      case 'warning':
        return {
          background: Colors.light.warning,
          text: Colors.light.background,
        };
      case 'danger':
        return {
          background: Colors.light.error,
          text: Colors.light.background,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: 12,
          iconSize: 20,
          fontSize: 12,
          borderRadius: 10,
        };
      case 'medium':
        return {
          padding: 16,
          iconSize: 24,
          fontSize: 14,
          borderRadius: 12,
        };
      case 'large':
        return {
          padding: 20,
          iconSize: 32,
          fontSize: 16,
          borderRadius: 16,
        };
    }
  };

  const colors = getVariantColors();
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: colors.background,
          padding: sizeStyles.padding,
          borderRadius: sizeStyles.borderRadius,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={colors.text}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          { color: colors.text, fontSize: sizeStyles.fontSize },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
