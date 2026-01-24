import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useFarmarAuth } from './utils/farmarAuthContext';

export default function MujProfilScreen() {
  const { isAuthenticated, farmar, logout } = useFarmarAuth();

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Můj profil</Text>
        <Text style={styles.headerSubtitle}>Nastavení vašeho účtu</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profil info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🌾</Text>
          </View>
          <Text style={styles.profileName}>{farmar?.nazev_farmy || 'Farma'}</Text>
          <Text style={styles.profilePhone}>{farmar?.telefon || ''}</Text>

          {/* Číslo farmy - důležité pro přihlášení */}
          {farmar?.farm_number && (
            <View style={styles.farmNumberBox}>
              <Text style={styles.farmNumberLabel}>Vaše číslo farmy:</Text>
              <Text style={styles.farmNumberValue}>{farmar.farm_number}</Text>
              <Text style={styles.farmNumberHint}>
                Používejte pro přihlášení do Prodejny spolu s PIN kódem
              </Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nastavení účtu</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/moje-farma/upravit-farmu')}
          >
            <Text style={styles.menuIcon}>✏️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Upravit profil</Text>
              <Text style={styles.menuSubtitle}>Název farmy, kontakty</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profil/foto-farmy')}
          >
            <Text style={styles.menuIcon}>📸</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Tady mě najdete</Text>
              <Text style={styles.menuSubtitle}>Zde můžete vložit foto</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profil/casova-dostupnost')}
          >
            <Text style={styles.menuIcon}>🕐</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Moje časová dostupnost</Text>
              <Text style={styles.menuSubtitle}>Kdy jste k zastižení</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/moje-farma/upravit-farmu')}
          >
            <Text style={styles.menuIcon}>📍</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Kde mě najdete</Text>
              <Text style={styles.menuSubtitle}>Adresa a GPS souřadnice</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Bezpečnost */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bezpečnost</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profil/zmenit-pin')}
          >
            <Text style={styles.menuIcon}>🔐</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Změnit PIN</Text>
              <Text style={styles.menuSubtitle}>PIN pro přihlášení do Prodejny</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Odhlásit */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleOdhlasit}>
            <Text style={styles.logoutText}>🚪 Odhlásit se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#4CAF50', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  loadingText: { fontSize: 16, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  buttonPrimary: { backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, marginBottom: 15, width: '80%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, width: '80%', alignItems: 'center', borderWidth: 2, borderColor: '#4CAF50' },
  buttonSecondaryText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  profileCard: { backgroundColor: '#FFFFFF', margin: 15, padding: 30, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 40 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 5 },
  profilePhone: { fontSize: 14, color: '#666', marginBottom: 15 },
  farmNumberBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginTop: 15, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  farmNumberLabel: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600' },
  farmNumberValue: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8, letterSpacing: 2 },
  farmNumberHint: { fontSize: 11, color: '#666', lineHeight: 16 },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  menuItem: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  menuIcon: { fontSize: 30, marginRight: 15 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  menuSubtitle: { fontSize: 14, color: '#666' },
  menuArrow: { fontSize: 24, color: '#CCC' },
  logoutButton: { backgroundColor: '#FF5252', borderRadius: 12, padding: 18, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});
