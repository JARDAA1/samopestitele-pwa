import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function ProdejnaLoginScreen() {
  const { loginWithPin, sendMagicLink } = useFarmarAuth();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMagicLinkOption, setShowMagicLinkOption] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const handlePinLogin = async () => {
    // Validace délky PINu
    if (pin.length !== 6) {
      if (Platform.OS === 'web') {
        alert('PIN musí mít přesně 6 číslic');
      } else {
        Alert.alert('Chyba', 'PIN musí mít přesně 6 číslic');
      }
      return;
    }

    // Validace zakázaných PINů
    const forbiddenPins = ['123456', '654321'];
    if (forbiddenPins.includes(pin)) {
      if (Platform.OS === 'web') {
        alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      } else {
        Alert.alert('Chyba', 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      }
      return;
    }

    // Validace opakujících se číslic (111111, 222222, atd.)
    if (/^(.)\1+$/.test(pin)) {
      if (Platform.OS === 'web') {
        alert('PIN nesmí obsahovat pouze stejné číslice.');
      } else {
        Alert.alert('Chyba', 'PIN nesmí obsahovat pouze stejné číslice.');
      }
      return;
    }

    setLoading(true);
    const result = await loginWithPin('', pin); // Telefon už nepotřebujeme
    setLoading(false);

    if (result.success) {
      setRemainingAttempts(null);
      router.replace('/(tabs)/moje-farma');
    } else {
      // Zobrazit zbývající pokusy, pokud jsou dostupné
      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
      }

      if (Platform.OS === 'web') {
        alert(result.error || 'Nesprávný PIN');
      } else {
        Alert.alert('Chyba', result.error || 'Nesprávný PIN');
      }
      setShowMagicLinkOption(true);
    }
  };

  const handleMagicLinkFallback = () => {
    router.push('/prihlaseni/profil');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prodejna - Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🏪</Text>
          </View>

          <Text style={styles.title}>Přihlášení PIN kódem</Text>
          <Text style={styles.subtitle}>
            Spravujte své stánky na trzích - flexibilně, dnes tady, zítra jinde
          </Text>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔒 Střední bezpečnost</Text>
            <Text style={styles.securityText}>
              PIN kód • Správa stánků • Fotografie a lokace
            </Text>
          </View>

          {remainingAttempts !== null && remainingAttempts < 5 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Zbývající pokusy: {remainingAttempts}
              </Text>
              <Text style={styles.warningSubtext}>
                Poté bude účet uzamčen na 15 minut
              </Text>
            </View>
          )}

          <Text style={styles.label}>PIN kód (6 číslic)</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="••••••"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            autoFocus
            onSubmitEditing={handlePinLogin}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handlePinLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Přihlašuji...' : 'Přihlásit se'}
            </Text>
          </TouchableOpacity>

          {showMagicLinkOption && (
            <View style={styles.fallbackContainer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ZAPOMNĚLI JSTE PIN?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={handleMagicLinkFallback}
              >
                <Text style={styles.magicLinkButtonText}>
                  Přihlásit se emailem (Magic Link)
                </Text>
              </TouchableOpacity>

              <Text style={styles.fallbackInfo}>
                Po přihlášení emailem si můžete vytvořit nový PIN v nastavení
              </Text>
            </View>
          )}

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 První přihlášení?</Text>
            <Text style={styles.helpText}>
              Pokud jste si ještě nevytvořili PIN, nejdřív se přihlaste do Profilu pomocí emailu. Tam si PIN vytvoříte.
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
    borderTopColor: '#4CAF50',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
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
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  pinInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackContainer: {
    marginTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  magicLinkButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  magicLinkButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  fallbackInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  helpBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
  },
});
