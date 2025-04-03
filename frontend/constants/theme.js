import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary colors
  primary: '#FF8C42',
  primaryDark: '#F9A826',
  primaryLight: '#FFC988',
  
  // Secondary colors
  secondary: '#ff9900',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  lightGray: '#f5f5f5',
  darkGray: '#333333',
  
  // Supporting colors
  success: '#4CD964',
  error: '#FF3B30',
  warning: '#FFCC00',
  info: '#34AADC',
  
  // Background colors
  background: '#FFF1D0',
  cardBackground: '#FFFFFF',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,
  margin: 20,
  
  // Font sizes
  largeTitle: 40,
  h1: 30,
  h2: 22,
  h3: 18,
  h4: 16,
  h5: 14,
  body1: 30,
  body2: 22,
  body3: 16,
  body4: 14,
  body5: 12,
  
  // App dimensions
  width,
  height,
};

export const FONTS = {
  largeTitle: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.largeTitle, fontWeight: '700' },
  h1: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.h1, fontWeight: '700' },
  h2: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.h2, fontWeight: '700' },
  h3: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.h3, fontWeight: '700' },
  h4: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.h4, fontWeight: '700' },
  h5: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.h5, fontWeight: '700' },
  body1: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.body1, fontWeight: '400' },
  body2: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.body2, fontWeight: '400' },
  body3: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.body3, fontWeight: '400' },
  body4: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.body4, fontWeight: '400' },
  body5: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontSize: SIZES.body5, fontWeight: '400' },
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  dark: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
};

export const GRADIENTS = {
  primary: ['#FF8C42', '#F9A826', '#FFF1D0'],
  button: ['#FF8C42', '#F9A826'],
  disabled: ['#c0c0c0', '#a0a0a0'],
};

export const SPACING = {
  statusBarHeight: StatusBar.currentHeight || 0,
  headerHeight: 60 + (StatusBar.currentHeight || 0),
};

export default { COLORS, SIZES, FONTS, SHADOWS, GRADIENTS, SPACING };