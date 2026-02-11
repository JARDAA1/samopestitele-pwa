import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const MAX_CONTENT_WIDTH = 600;
const WIDE_MODE_BREAKPOINT = 768;

/**
 * Globální layout wrapper pro celou aplikaci
 *
 * Zajišťuje responzivní chování:
 * - Pod 768px: plná šířka (mobilní layout beze změn)
 * - 768px a více: centrovaný obsah s max-width 600px
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { width } = useWindowDimensions();
  const isWideMode = width >= WIDE_MODE_BREAKPOINT;

  if (!isWideMode) {
    // Mobilní režim - žádné změny
    return <>{children}</>;
  }

  // Wide mode - centrovaný layout
  return (
    <View style={styles.wideContainer}>
      <View style={styles.centeredContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wideContainer: {
    flex: 1,
    backgroundColor: '#4A148C', // Tmavší pozadí pro okraje
    alignItems: 'center',
  },
  centeredContent: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: '#6A1B9A', // Hlavní barva aplikace
    // Jemný stín pro vizuální oddělení
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});
