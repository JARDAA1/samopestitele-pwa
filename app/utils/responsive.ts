import { Dimensions, Platform } from 'react-native';

/**
 * Responzivní utility pro adaptivní design
 * Automaticky detekuje velikost zařízení a poskytuje správné hodnoty
 */

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Breakpointy
export const BREAKPOINTS = {
  SMALL_MOBILE: 375,   // iPhone SE, malé telefony
  MOBILE: 768,         // Standardní mobily
  TABLET: 1024,        // Tablety
  DESKTOP: 1280,       // Desktop
};

// Detekce typu zařízení
export const isSmallMobile = screenWidth < BREAKPOINTS.SMALL_MOBILE;
export const isMobile = screenWidth < BREAKPOINTS.MOBILE;
export const isTablet = screenWidth >= BREAKPOINTS.MOBILE && screenWidth < BREAKPOINTS.TABLET;
export const isDesktop = screenWidth >= BREAKPOINTS.TABLET;
export const isWeb = Platform.OS === 'web';

/**
 * Vybere hodnotu podle velikosti zařízení
 * @example
 * fontSize: responsive({ mobile: 14, tablet: 16, desktop: 18 })
 */
export function responsive<T>(options: {
  mobile: T;
  tablet?: T;
  desktop?: T;
}): T {
  if (isDesktop) return options.desktop ?? options.tablet ?? options.mobile;
  if (isTablet) return options.tablet ?? options.mobile;
  return options.mobile;
}

/**
 * Škálování hodnot podle šířky obrazovky
 * @param size Základní velikost pro mobile
 * @param factor Faktor škálování (default: 1.5 pro tablet, 2 pro desktop)
 */
export function scale(size: number, factor?: { mobile?: number; tablet?: number; desktop?: number }): number {
  const factors = {
    mobile: factor?.mobile ?? 1,
    tablet: factor?.tablet ?? 1.3,
    desktop: factor?.desktop ?? 1.6,
  };

  return responsive({
    mobile: size * factors.mobile,
    tablet: size * factors.tablet,
    desktop: size * factors.desktop,
  });
}

/**
 * Responzivní padding/margin
 */
export const spacing = {
  xs: responsive({ mobile: 4, tablet: 6, desktop: 8 }),
  sm: responsive({ mobile: 8, tablet: 12, desktop: 16 }),
  md: responsive({ mobile: 12, tablet: 16, desktop: 20 }),
  lg: responsive({ mobile: 16, tablet: 24, desktop: 32 }),
  xl: responsive({ mobile: 20, tablet: 32, desktop: 40 }),
  xxl: responsive({ mobile: 24, tablet: 40, desktop: 48 }),
};

/**
 * Responzivní font sizes
 */
export const fontSize = {
  xs: responsive({ mobile: 10, tablet: 11, desktop: 12 }),
  sm: responsive({ mobile: 12, tablet: 13, desktop: 14 }),
  base: responsive({ mobile: 14, tablet: 16, desktop: 18 }),
  md: responsive({ mobile: 16, tablet: 18, desktop: 20 }),
  lg: responsive({ mobile: 18, tablet: 20, desktop: 24 }),
  xl: responsive({ mobile: 20, tablet: 24, desktop: 28 }),
  xxl: responsive({ mobile: 24, tablet: 32, desktop: 40 }),
  xxxl: responsive({ mobile: 28, tablet: 40, desktop: 48 }),
};

/**
 * Responzivní border radius
 */
export const borderRadius = {
  sm: responsive({ mobile: 8, tablet: 10, desktop: 12 }),
  md: responsive({ mobile: 12, tablet: 16, desktop: 20 }),
  lg: responsive({ mobile: 16, tablet: 20, desktop: 24 }),
  xl: responsive({ mobile: 20, tablet: 28, desktop: 32 }),
  full: 9999,
};

/**
 * Helper pro max width contentů na desktopu
 */
export const maxWidth = {
  sm: responsive({ mobile: '100%', tablet: '100%', desktop: 600 }),
  md: responsive({ mobile: '100%', tablet: '100%', desktop: 800 }),
  lg: responsive({ mobile: '100%', tablet: '100%', desktop: 1000 }),
  xl: responsive({ mobile: '100%', tablet: '100%', desktop: 1200 }),
};

/**
 * Detekce orientace
 */
export const isLandscape = screenWidth > screenHeight;
export const isPortrait = screenHeight > screenWidth;

/**
 * Responzivní hodnoty pro konkrétní prvky
 */
export const layout = {
  header: {
    height: responsive({ mobile: 90, tablet: 120, desktop: 140 }),
    paddingTop: responsive({ mobile: 40, tablet: 45, desktop: 50 }),
    paddingBottom: responsive({ mobile: 10, tablet: 15, desktop: 20 }),
  },
  avatar: {
    small: responsive({ mobile: 50, tablet: 60, desktop: 70 }),
    medium: responsive({ mobile: 70, tablet: 90, desktop: 110 }),
    large: responsive({ mobile: 90, tablet: 120, desktop: 150 }),
  },
  card: {
    padding: responsive({ mobile: 16, tablet: 20, desktop: 24 }),
    margin: responsive({ mobile: 16, tablet: 20, desktop: 24 }),
  },
};
