import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function ProdejnaLoginScreen() {
  const { loginWithPin, isAuthenticated, authLevel } = useFarmarAuth();

  const [farmNumber, setFarmNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMagicLinkOption, setShowMagicLinkOption] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && authLevel === 'pin') {
      router.replace('/(tabs)/moje-farma');
    }
  }, [isAuthenticated, authLevel]);

  const handlePinLogin = async () => {
    if (!farmNumber || farmNumber.trim() === '') {
      if (Platform.OS === 'web') {
        alert('Zadejte číslo farmy');
      } else {
        Alert.alert('Chyba', 'Zadejte číslo farmy');
      }
      return;
    }

    if (pin.length < 4) {
      if (Platform.OS === 'web') {
        alert('PIN musí mít minimálně 4 číslice');
      } else {
        Alert.alert('Chyba', 'PIN musí mít minimálně 4 číslice');
      }
      return;
    }

    if (!/^\d+$/.test(pin)) {
      if (Platform.OS === 'web') {
        alert('PIN může obsahovat pouze číslice');
      } else {
        Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      }
      return;
    }

    const forbiddenPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '12345678', '87654321'];
    if (forbiddenPins.includes(pin)) {
      if (Platform.OS === 'web') {
        alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      } else {
        Alert.alert('Chyba', 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      }
      return;
    }

    if (/^(.)\1+$/.test(pin)) {
      if (Platform.OS === 'web') {
        alert('PIN nesmí obsahovat pouze stejné číslice.');
      } else {
        Alert.alert('Chyba', 'PIN nesmí obsahovat pouze stejné číslice.');
      }
      return;
    }

    setLoading(true);
    const result = await loginWithPin(farmNumber, pin);
    setLoading(false);

    if (result.success) {
      setRemainingAttempts(null);
      router.replace('/(tabs)/moje-farma');
    } else {
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

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🏪</Text>
          </View>

          <Text style={styles.title}>Přihlášení PIN kódem</Text>
          <Text style={styles.subtitle}>
            Přihlaste se pomocí čísla farmy a PIN kódu
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Bezpečný přístup</Text>
            <Text style={styles.infoText}>
              Číslo farmy + PIN kód. Správa produktů a objednávek.
            </Text>
          </View>

          {remainingAttempts !== null && remainingAttempts < 5 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Zbývající pokusy: {remainingAttempts}</Text>
              <Text style={styles.warningText}>
                Poté bude účet uzamčen na 15 minut.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Číslo farmy</Text>
          <TextInput
            style={styles.input}
            placeholder="Vaše číslo farmy"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={farmNumber}
            onChangeText={(text) => setFarmNumber(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={4}
            autoFocus
          />

          <Text style={styles.label}>PIN kód (min. 4 číslice)</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
            onSubmitEditing={handlePinLogin}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handlePinLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Přihlašuji...' : 'Přihlásit se'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/zapomenute-udaje')}
          >
            <Text style={styles.forgotLinkText}>
              Zapomenuté údaje?
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
                style={styles.secondaryButton}
                onPress={handleMagicLinkFallback}
              >
                <Text style={styles.secondaryButtonText}>
                  Přihlásit se emailem
                </Text>
              </TouchableOpacity>

              <Text style={styles.fallbackInfo}>
                Po přihlášení emailem si můžete vytvořit nový PIN v nastavení.
              </Text>
            </View>
          )}

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>První přihlášení?</Text>
            <Text style={styles.helpText}>
              Pokud jste si ještě nevytvořili PIN, přihlaste se do Profilu pomocí emailu. Tam najdete své číslo farmy a můžete si vytvořit PIN.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ef9a9a',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef9a9a',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
    color: '#ffffff',
  },
  pinInput: {
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotLink: {
    padding: 12,
    alignItems: 'center',
  },
  forgotLinkText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  fallbackContainer: {
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fallbackInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  helpBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
});
