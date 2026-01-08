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
    Alert.alert(
      'Odhlásit se?',
      'Opravdu se chcete odhlásit?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odhlásit',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Odhlášeno', 'Byli jste úspěšně odhlášeni', [
              { text: 'OK', onPress: () => router.push('/prihlaseni') }
            ]);
          }
        }
      ]
    );
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

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📸</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Fotky farmy</Text>
              <Text style={styles.menuSubtitle}>Galerie vašich produktů</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🕐</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Otevírací doba</Text>
              <Text style={styles.menuSubtitle}>Nastavte dostupnost</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📍</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Adresa</Text>
              <Text style={styles.menuSubtitle}>GPS souřadnice</Text>
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
  profilePhone: { fontSize: 14, color: '#666' },
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
