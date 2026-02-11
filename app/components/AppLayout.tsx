import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ReactNode, createContext, useContext } from 'react';

// Breakpointy
const WIDE_MODE_BREAKPOINT = 768;    // Tablet
const DESKTOP_BREAKPOINT = 1200;     // Desktop

// Max-width pro různé režimy
const TABLET_MAX_WIDTH = 600;
const DESKTOP_MAX_WIDTH = 1100;

// Layout mode type
type LayoutMode = 'mobile' | 'tablet' | 'desktop';

// Context pro sdílení layout mode napříč aplikací
interface LayoutContextType {
  mode: LayoutMode;
  width: number;
  contentMaxWidth: number;
}

const LayoutContext = createContext<LayoutContextType>({
  mode: 'mobile',
  width: 375,
  contentMaxWidth: 375,
});

export function useLayoutMode() {
  return useContext(LayoutContext);
}

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Globální layout wrapper pro celou aplikaci
 *
 * Zajišťuje responzivní chování:
 * - Pod 768px: plná šířka (mobilní layout beze změn)
 * - 768px - 1199px: centrovaný obsah s max-width 600px (tablet)
 * - 1200px a více: centrovaný obsah s max-width 1100px (desktop)
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { width } = useWindowDimensions();

  // Určení layout mode
  let mode: LayoutMode = 'mobile';
  let maxWidth = width;

  if (width >= DESKTOP_BREAKPOINT) {
    mode = 'desktop';
    maxWidth = DESKTOP_MAX_WIDTH;
  } else if (width >= WIDE_MODE_BREAKPOINT) {
    mode = 'tablet';
    maxWidth = TABLET_MAX_WIDTH;
  }

  const contextValue: LayoutContextType = {
    mode,
    width,
    contentMaxWidth: maxWidth,
  };

  // Mobilní režim - žádné změny
  if (mode === 'mobile') {
    return (
      <LayoutContext.Provider value={contextValue}>
        <View style={styles.mobileContainer}>{children}</View>
      </LayoutContext.Provider>
    );
  }

  // Tablet/Desktop mode - centrovaný layout
  const sideMargin = Math.max(0, (width - maxWidth) / 2);

  return (
    <LayoutContext.Provider value={contextValue}>
      <View style={styles.wideContainer}>
        <View style={[
          styles.centeredContent,
          {
            marginLeft: sideMargin,
            marginRight: sideMargin,
            maxWidth: maxWidth,
          }
        ]}>
          {children}
        </View>
      </View>
    </LayoutContext.Provider>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  wideContainer: {
    flex: 1,
    backgroundColor: '#4A148C', // Tmavší pozadí pro okraje
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centeredContent: {
    flex: 1,
    backgroundColor: '#6A1B9A', // Hlavní barva aplikace
    // Jemný stín pro vizuální oddělení
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
});
