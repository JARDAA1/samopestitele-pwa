import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function StankyLoginScreen() {
  const [kod, setKod] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKodLogin = async () => {
    const cleanKod = kod.trim().toUpperCase();

    if (cleanKod.length !== 6) {
      if (Platform.OS === 'web') {
        alert('Zadejte 6místný kód');
      } else {
        Alert.alert('Chyba', 'Zadejte 6místný kód');
      }
      return;
    }

    setLoading(true);

    // TODO: Ověřit kód proti databázi
    // Pro nyní - mock validace
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulujeme úspěšné přihlášení
    const isValid = true; // V produkci: await validateStankyCode(cleanKod);

    setLoading(false);

    if (isValid) {
      // TODO: Uložit session pro Stánky (24h)
      router.replace('/(tabs)/moje-farma');
    } else {
      if (Platform.OS === 'web') {
        alert('Neplatný nebo vypršelý kód');
      } else {
        Alert.alert('Chyba', 'Neplatný nebo vypršelý kód');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stánky - Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎪</Text>
          </View>

          <Text style={styles.title}>Rychlý přístup</Text>
          <Text style={styles.subtitle}>
            Zadejte 6místný kód pro okamžitý přístup ke stánkům
          </Text>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔒 Základní bezpečnost</Text>
            <Text style={styles.securityText}>
              Jednorázový kód • Session 24 hodin • Pouze aktualizace zásob
            </Text>
          </View>

          {/* Manual Code Input */}
          <Text style={styles.label}>Zadejte 6místný kód</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            value={kod}
            onChangeText={(text) => setKod(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
            onSubmitEditing={handleKodLogin}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleKodLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Ověřuji...' : 'Přihlásit se'}
            </Text>
          </TouchableOpacity>

          {/* Help Info */}
          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 Kde získám přístupový kód?</Text>
            <Text style={styles.helpText}>
              1. Přihlaste se do Prodejny pomocí PINu{'\n'}
              2. Klikněte na "Vygenerovat přístup pro Stánky"{'\n'}
              3. Zobrazí se 6místný kód{'\n'}
              4. Kód je platný 24 hodin
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Nesdílejte přístupový kód s nikým. Umožňuje upravovat vaše zásoby.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 4,
    borderTopColor: '#FF9800',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  securityInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  warningText: {
    fontSize: 11,
    color: '#C62828',
    lineHeight: 14,
  },
});
