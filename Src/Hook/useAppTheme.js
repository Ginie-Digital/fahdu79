import { useColorScheme } from 'react-native';

const darkColors = {
  background: '#0D0D0D',
  card: '#1A1A1A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textLabel: '#E0E0E0',
  inputBg: '#1A1A1A',
  inputBorder: '#2A2A2A',
  placeholder: '#555555',
  accent: '#FFA86B',
  accentBorder: '#FF7819',
  pressed: '#292929',
  error: '#FF6B6B',
  success: '#4CAF50',
  tabBarBg: '#0D0D0D',
  headerBg: '#0D0D0D',
  headerText: '#FFFFFF',
  headerTint: '#FFFFFF',
  iconTint: '#FFFFFF',
  iconTintFocused: '#FFA86B',
  separator: '#1A1A1A',
  overlayBg: '#292929',
};

const lightColors = {
  background: '#FFFFFF',
  card: '#F5F5F5',
  border: '#E0E0E0',
  text: '#1E1E1E',
  textSecondary: '#666666',
  textLabel: '#333333',
  inputBg: '#F5F5F5',
  inputBorder: '#E0E0E0',
  placeholder: '#B2B2B2',
  accent: '#FFA86B',
  accentBorder: '#FF7819',
  pressed: '#EBEBEB',
  error: '#FF5252',
  success: '#4CAF50',
  tabBarBg: '#FFFFFF',
  headerBg: '#FFFFFF',
  headerText: '#1E1E1E',
  headerTint: '#1E1E1E',
  iconTint: '#1E1E1E',
  iconTintFocused: '#FFA86B',
  separator: '#EEEEEE',
  overlayBg: '#1e1e1e',
};

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return { isDark, colors: isDark ? darkColors : lightColors };
}

export { darkColors, lightColors };
