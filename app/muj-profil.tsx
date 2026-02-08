import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useFarmarAuth } from './utils/farmarAuthContext';
import { DrawerMenu } from './utils/DrawerMenu';
import { useDrawerMenu } from './utils/useDrawerMenu';
import { Feather } from '@expo/vector-icons';
import { responsive, spacing, fontSize, borderRadius, layout } from './utils/responsive';

export default function MujProfilScreen() {
  const { isAuthenticated, farmar, logout } = useFarmarAuth();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();

  // Pokud není přihlášen, přesměruj na přihlášení
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!isAuthenticated) {
      // Odložíme redirect mimo render cycle
      timeoutId = setTimeout(() => {
        router.replace('/prihlaseni');
      }, 100);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated]);

  // Pokud není přihlášen, nezobrazuj obsah
  if (!isAuthenticated) {
    return null;
  }

  // PŘIHLÁŠENÝ PĚSTITEL - Profil
  const handleOdhlasit = async () => {
    console.log('🚪 handleOdhlasit called');

    // Pro web použít window.confirm(), pro native Alert.alert
    const shouldLogout = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm('Opravdu se chcete odhlásit?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Odhlásit se?',
            'Opravdu se chcete odhlásit?',
            [
              { text: 'Zrušit', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Odhlásit', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!shouldLogout) {
      console.log('❌ User cancelled logout');
      return;
    }

    try {
      console.log('🔓 Logging out...');
      await logout();
      console.log('✅ Logout successful');

      // Zobrazit zprávu a přesměrovat
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Byli jste úspěšně odhlášeni');
      } else {
        Alert.alert('Odhlášeno', 'Byli jste úspěšně odhlášeni');
      }

      router.push('/prihlaseni');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Chyba při odhlašování: ' + (error?.message || 'Neznámá chyba'));
      } else {
        Alert.alert('Chyba', 'Nepodařilo se odhlásit');
      }
    }
  };

  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Moderní header s gradientem */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openMenu}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{farmar?.nazev_farmy || 'Farma'}</Text>
          <Text style={styles.headerSubtitle}>{farmar?.telefon || ''}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Moderní grid menu */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>Nastavení účtu</Text>

          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/moje-prodejna/upravit-farmu')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.gridIcon}>✏️</Text>
              </View>
              <Text style={styles.gridTitle}>Upravit profil</Text>
              <Text style={styles.gridSubtitle}>Název farmy, kontakty</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/profil/lokalita')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.gridIcon}>📍</Text>
              </View>
              <Text style={styles.gridTitle}>Kde mě najdete</Text>
              <Text style={styles.gridSubtitle}>GPS souřadnice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/profil/casova-dostupnost')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.gridIcon}>🕐</Text>
              </View>
              <Text style={styles.gridTitle}>Časová dostupnost</Text>
              <Text style={styles.gridSubtitle}>Kdy jsem k zastižení</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/profil/foto-farmy')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.gridIcon}>🌳</Text>
              </View>
              <Text style={styles.gridTitle}>Tady mě najdete</Text>
              <Text style={styles.gridSubtitle}>Vložit foto</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Odhlásit */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleOdhlasit}>
            <Feather name="log-out" size={22} color="#F44336" style={{ marginRight: 10 }} />
            <Text style={styles.logoutText}>Odhlásit se</Text>
          </TouchableOpacity>
        </View>

        {/* Footer padding */}
        <View style={styles.footerPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },

  // Moderní header s gradientem - responzivní pro všechna zařízení
  header: {
    backgroundColor: '#7B1FA2',
    paddingTop: layout.header.paddingTop,
    paddingBottom: layout.header.paddingBottom,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuButton: {
    position: 'absolute',
    top: layout.header.paddingTop,
    left: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  menuIcon: {
    fontSize: fontSize.xl,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: layout.avatar.medium,
    height: layout.avatar.medium,
    borderRadius: layout.avatar.medium / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  avatarLargeText: {
    fontSize: responsive({ mobile: 36, tablet: 48, desktop: 60 })
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: '#FFFFFF',
    opacity: 0.95
  },

  content: {
    flex: 1,
    marginTop: -20,
  },

  // Grid menu - responzivní
  gridSection: {
    paddingHorizontal: layout.card.margin,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: responsive({ mobile: '48%', tablet: '48%', desktop: '23%' }),
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: responsive({ mobile: 14, tablet: 18, desktop: 22 }),
    marginBottom: spacing.md,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  gridIconContainer: {
    width: responsive({ mobile: 50, tablet: 60, desktop: 70 }),
    height: responsive({ mobile: 50, tablet: 60, desktop: 70 }),
    borderRadius: responsive({ mobile: 25, tablet: 30, desktop: 35 }),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gridIcon: {
    fontSize: responsive({ mobile: 28, tablet: 34, desktop: 40 }),
  },
  gridTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  gridSubtitle: {
    fontSize: fontSize.xs,
    color: '#666',
    textAlign: 'center',
    lineHeight: responsive({ mobile: 14, tablet: 16, desktop: 18 }),
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  // Logout button
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#FFEBEE',
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
  },

  footerPadding: {
    height: 30,
  },

  // Legacy styles pro kompatibilitu
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  buttonPrimary: { backgroundColor: '#7B1FA2', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, marginBottom: 15, width: '80%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, width: '80%', alignItems: 'center', borderWidth: 2, borderColor: '#7B1FA2' },
  buttonSecondaryText: { color: '#7B1FA2', fontSize: 16, fontWeight: '600' },
});
