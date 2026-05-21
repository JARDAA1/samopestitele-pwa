import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { useCustomerList } from '@/shared/context/CustomerListContext';

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

function KosikBar() {
  const { items, itemCount } = useCustomerList();
  const pathname = usePathname();

  if (itemCount === 0) return null;
  if (pathname === '/nakupni-seznam') return null;

  // Unikátní farmáři (zachovat pořadí prvního výskytu)
  const farmari: { id: string; nazev: string }[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!seen.has(item.farmarId)) {
      seen.add(item.farmarId);
      farmari.push({ id: item.farmarId, nazev: item.farmarNazev });
    }
  }

  let farmarLabel: string;
  if (farmari.length === 1) {
    farmarLabel = farmari[0].nazev;
  } else if (farmari.length === 2) {
    farmarLabel = `${farmari[0].nazev}, ${farmari[1].nazev}`;
  } else {
    farmarLabel = `${farmari[0].nazev}, ${farmari[1].nazev} +${farmari.length - 2}`;
  }

  const polozkyLabel = itemCount === 1 ? '1 položka' : itemCount < 5 ? `${itemCount} položky` : `${itemCount} položek`;

  return (
    <TouchableOpacity
      style={styles.kosikBar}
      onPress={() => router.push('/nakupni-seznam')}
      activeOpacity={0.85}
    >
      <View style={styles.kosikBarContent}>
        <Text style={styles.kosikBarFarmar} numberOfLines={1}>🧺 {farmarLabel}</Text>
        <Text style={styles.kosikBarPolozky}>{polozkyLabel}</Text>
      </View>
      <Text style={styles.kosikBarArrow}>→</Text>
    </TouchableOpacity>
  );
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use 0 before mount so SSR and initial client render produce identical output
  const effectiveWidth = isMounted ? width : 0;

  // Určení layout mode
  let mode: LayoutMode = 'mobile';
  let maxWidth = effectiveWidth;

  if (effectiveWidth >= DESKTOP_BREAKPOINT) {
    mode = 'desktop';
    maxWidth = DESKTOP_MAX_WIDTH;
  } else if (effectiveWidth >= WIDE_MODE_BREAKPOINT) {
    mode = 'tablet';
    maxWidth = TABLET_MAX_WIDTH;
  }

  const contextValue: LayoutContextType = {
    mode,
    width: effectiveWidth,
    contentMaxWidth: maxWidth,
  };

  // Mobilní režim - žádné změny
  if (mode === 'mobile') {
    return (
      <LayoutContext.Provider value={contextValue}>
        <View style={styles.mobileContainer}>
          {children}
          <KosikBar />
        </View>
      </LayoutContext.Provider>
    );
  }

  // Tablet/Desktop mode - centrovaný layout
  const sideMargin = Math.max(0, (effectiveWidth - maxWidth) / 2);

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
          <KosikBar />
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
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centeredContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    // Jemný stín pro vizuální oddělení
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  kosikBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9800',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  kosikBarContent: {
    flex: 1,
    marginRight: 12,
  },
  kosikBarFarmar: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  kosikBarPolozky: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  kosikBarArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
