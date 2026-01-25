import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useFarmarAuth } from './utils/farmarAuthContext';
import { DrawerMenu } from './utils/DrawerMenu';
import { useDrawerMenu } from './utils/useDrawerMenu';
import { Feather } from '@expo/vector-icons';

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
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>🌾</Text>
          </View>
          <Text style={styles.headerTitle}>{farmar?.nazev_farmy || 'Farma'}</Text>
          <Text style={styles.headerSubtitle}>{farmar?.telefon || ''}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Číslo farmy - prominentně nahoře */}
        {farmar?.farm_number && (
          <View style={styles.farmNumberCard}>
            <View style={styles.farmNumberHeader}>
              <View style={styles.farmNumberIconContainer}>
                <Text style={styles.farmNumberIcon}>🔑</Text>
              </View>
              <View style={styles.farmNumberTextContainer}>
                <Text style={styles.farmNumberLabel}>Vaše číslo farmy</Text>
                <Text style={styles.farmNumberValue}>{farmar.farm_number}</Text>
              </View>
            </View>
            <View style={styles.farmNumberHintBox}>
              <Text style={styles.farmNumberHint}>
                💡 Pro přihlášení do Prodejny použijte toto číslo + PIN
              </Text>
            </View>
          </View>
        )}

        {/* Moderní grid menu */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>Nastavení účtu</Text>

          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/moje-farma/upravit-farmu')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.gridIcon}>✏️</Text>
              </View>
              <Text style={styles.gridTitle}>Upravit profil</Text>
              <Text style={styles.gridSubtitle}>Název farmy, kontakty</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push('/profil/foto-farmy')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.gridIcon}>📸</Text>
              </View>
              <Text style={styles.gridTitle}>Tady mě najdete</Text>
              <Text style={styles.gridSubtitle}>Vložit foto</Text>
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
              onPress={() => router.push('/moje-farma/upravit-farmu')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.gridIcon}>📍</Text>
              </View>
              <Text style={styles.gridTitle}>Kde mě najdete</Text>
              <Text style={styles.gridSubtitle}>GPS souřadnice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bezpečnost */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bezpečnost</Text>

          <TouchableOpacity
            style={styles.securityCard}
            onPress={() => router.push('/profil/zmenit-pin')}
          >
            <View style={styles.securityIconContainer}>
              <Text style={styles.securityIcon}>🔐</Text>
            </View>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Změnit PIN kód</Text>
              <Text style={styles.securitySubtitle}>PIN pro přihlášení do Prodejny</Text>
            </View>
            <Text style={styles.securityArrow}>›</Text>
          </TouchableOpacity>
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

  // Moderní header s gradientem
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  menuIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarLargeText: {
    fontSize: 48
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95
  },

  content: {
    flex: 1,
    marginTop: -20,
  },

  // Číslo farmy - moderní karta
  farmNumberCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  farmNumberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmNumberIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  farmNumberIcon: {
    fontSize: 28,
  },
  farmNumberTextContainer: {
    flex: 1,
  },
  farmNumberLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  farmNumberValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 3,
  },
  farmNumberHintBox: {
    backgroundColor: '#F1F8F4',
    padding: 12,
    borderRadius: 10,
  },
  farmNumberHint: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },

  // Grid menu
  gridSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIcon: {
    fontSize: 32,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Bezpečnost
  section: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  securityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  securityIcon: {
    fontSize: 26,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  securitySubtitle: {
    fontSize: 13,
    color: '#666',
  },
  securityArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '600',
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
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  buttonPrimary: { backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, marginBottom: 15, width: '80%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, width: '80%', alignItems: 'center', borderWidth: 2, borderColor: '#4CAF50' },
  buttonSecondaryText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
});
