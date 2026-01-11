const tintColorLight = '#0F766E';
const tintColorDark = '#14B8A6';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    background: '#FFFFFF',
    backgroundSecondary: '#F4F4F5',
    tint: tintColorLight,
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E4E4E7',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    card: '#FFFFFF',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    backgroundSecondary: '#1C1C1E',
    tint: tintColorDark,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#27272A',
    success: '#22C55E',
    warning: '#FBBF24',
    error: '#EF4444',
    card: '#1C1C1E',
  },
};

export type ColorScheme = keyof typeof Colors;
