import { View, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { useLayoutMode } from './AppLayout';

interface DesktopTwoColumnLayoutProps {
  leftColumn: ReactNode;
  rightColumn: ReactNode | null;
  leftColumnWidth?: number; // Procenta (výchozí 40)
}

/**
 * Dvousloupcový layout pro desktop
 *
 * Na mobile/tablet: zobrazí pouze leftColumn (plná šířka)
 * Na desktop: zobrazí dva sloupce vedle sebe
 *
 * Použití:
 * - leftColumn: Seznam (objednávky, produkty)
 * - rightColumn: Detail panel (null = prázdný stav)
 */
export function DesktopTwoColumnLayout({
  leftColumn,
  rightColumn,
  leftColumnWidth = 40,
}: DesktopTwoColumnLayoutProps) {
  const { mode } = useLayoutMode();

  // Na mobile/tablet zobrazíme pouze leftColumn
  if (mode !== 'desktop') {
    return <View style={styles.mobileContainer}>{leftColumn}</View>;
  }

  // Na desktop zobrazíme dva sloupce
  return (
    <View style={styles.desktopContainer}>
      <View style={[styles.leftColumn, { flex: leftColumnWidth }]}>
        {leftColumn}
      </View>
      <View style={[styles.rightColumn, { flex: 100 - leftColumnWidth }]}>
        {rightColumn || (
          <View style={styles.emptyRightColumn}>
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View>
              <View style={styles.emptyTextPrimary} />
              <View style={styles.emptyTextSecondary} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Hook pro zjištění, zda jsme v desktop dvousloupcovém režimu
 */
export function useDesktopTwoColumn() {
  const { mode } = useLayoutMode();
  return {
    isDesktopTwoColumn: mode === 'desktop',
    mode,
  };
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  rightColumn: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  emptyRightColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    opacity: 0.3,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconInner: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  emptyTextPrimary: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  emptyTextSecondary: {
    width: 180,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
