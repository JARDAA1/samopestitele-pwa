import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ReactNode } from 'react';

interface ResponsiveLayoutProps {
  children: ReactNode;
  maxWidth?: number;
  backgroundColor?: string;
}

/**
 * Responzivní layout wrapper pro podporu tabletů
 *
 * - Pod 768px: plná šířka (mobilní layout)
 * - 768px a více: centrovaný obsah s max-width
 */
export function ResponsiveLayout({
  children,
  maxWidth = 600,
  backgroundColor = '#6A1B9A'
}: ResponsiveLayoutProps) {
  const { width } = useWindowDimensions();
  const isWideMode = width >= 768;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[
        styles.content,
        isWideMode && { maxWidth, alignSelf: 'center', width: '100%' }
      ]}>
        {children}
      </View>
    </View>
  );
}

/**
 * Hook pro získání informace o wide mode
 * Použití pro grid layouty (1 vs 2 sloupce)
 */
export function useResponsiveColumns(): { columns: 1 | 2; isWideMode: boolean } {
  const { width } = useWindowDimensions();
  const isWideMode = width >= 768;
  return {
    columns: isWideMode ? 2 : 1,
    isWideMode
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
