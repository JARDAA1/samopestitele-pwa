import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function PrihlaseniScreen() {
  const { loginWithSMS, sendSMSCode, isAuthenticated } = useFarmarAuth();

  const [krok, setKrok] = useState(1); // 1 = telefon, 2 = SMS kód
  const [telefon, setTelefon] = useState('');
  const [smsKod, setSmsKod] = useState('');
  const [loading, setLoading] = useState(false);

  // Poznámka: Nebudeme zde dělat automatický redirect,
  // protože to může způsobit problémy při načítání.
  // Redirect se udělá až po úspěšném přihlášení.

  /**
   * KROK 1: Odeslat SMS kód
   */
  const handleOdeslatKod = async () => {
    // Validace telefonu
    let cleanPhone = telefon.trim().replace(/\s/g, '');

    if (!cleanPhone) {
      if (Platform.OS === 'web') {
        alert('Zadejte telefonní číslo');
      } else {
        Alert.alert('Chyba', 'Zadejte telefonní číslo');
      }
      return;
    }

    // Pokud nezačíná +420, přidáme předvolbu
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+420' + cleanPhone;
    }

    // Validace formátu
    if (!cleanPhone.match(/^\+420\d{9}$/)) {
      if (Platform.OS === 'web') {
        alert('Zadejte platné české telefonní číslo (9 číslic)');
      } else {
        Alert.alert('Chyba', 'Zadejte platné české telefonní číslo (9 číslic)');
      }
      return;
    }

    // Uložíme normalizované číslo
    setTelefon(cleanPhone);

    setLoading(true);
    const success = await sendSMSCode(cleanPhone);
    setLoading(false);

    if (success) {
      if (Platform.OS === 'web') {
        alert('SMS kód byl odeslán na ' + cleanPhone);
      } else {
        Alert.alert('SMS odeslána ✓', 'Zadejte kód z SMS zprávy');
      }
      setKrok(2);
    } else {
      if (Platform.OS === 'web') {
        alert('Nepodařilo se odeslat SMS. Zkontrolujte telefonní číslo.');
      } else {
        Alert.alert('Chyba', 'Nepodařilo se odeslat SMS. Zkontrolujte telefonní číslo.');
      }
    }
  };

  /**
   * KROK 2: Ověřit SMS kód a přihlásit
   */
  const handleOveritKod = async () => {
    if (smsKod.length !== 6) {
      if (Platform.OS === 'web') {
        alert('Zadejte 6-místný kód z SMS');
      } else {
        Alert.alert('Chyba', 'Zadejte 6-místný kód z SMS');
      }
      return;
    }

    setLoading(true);
    const success = await loginWithSMS(telefon, smsKod);
    setLoading(false);

    if (success) {
      router.replace('/(tabs)/moje-farma');
    } else {
      if (Platform.OS === 'web') {
        alert('Neplatný SMS kód. Zkuste to znovu nebo požádejte o nový kód.');
      } else {
        Alert.alert('Chyba', 'Neplatný SMS kód. Zkuste to znovu nebo požádejte o nový kód.');
      }
      setSmsKod('');
    }
  };

  /**
   * Zpět na zadání telefonu
   */
  const handleZpet = () => {
    setKrok(1);
    setSmsKod('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Přihlášení farmáře</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          {krok === 1 ? (
            // KROK 1: Zadání telefonu
            <>
              <Text style={styles.title}>📱 Přihlášení</Text>
              <Text style={styles.subtitle}>
                Zadejte telefonní číslo. Na toto číslo vám pošleme SMS s ověřovacím kódem.
              </Text>

              <Text style={styles.label}>Telefonní číslo</Text>
              <TextInput
                style={styles.input}
                placeholder="Např. 123456789"
                value={telefon}
                onChangeText={setTelefon}
                keyboardType="phone-pad"
                autoFocus
                autoComplete="tel"
                onSubmitEditing={handleOdeslatKod}
              />

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleOdeslatKod}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Odesílám SMS...' : 'Odeslat SMS kód'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // KROK 2: Zadání SMS kódu
            <>
              <Text style={styles.title}>🔐 Ověření</Text>
              <Text style={styles.subtitle}>
                Zadejte 6-místný kód, který jsme vám poslali na {telefon}
              </Text>

              <Text style={styles.label}>SMS kód</Text>
              <TextInput
                style={styles.pinInput}
                placeholder="••••••"
                value={smsKod}
                onChangeText={setSmsKod}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                autoFocus
                onSubmitEditing={handleOveritKod}
              />

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleOveritKod}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Ověřuji...' : 'Přihlásit se'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={handleZpet}
              >
                <Text style={styles.backLinkText}>
                  ← Změnit telefonní číslo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleOdeslatKod}
                disabled={loading}
              >
                <Text style={styles.resendLinkText}>
                  Znovu odeslat SMS kód
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEBO</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/registrace')}
          >
            <Text style={styles.registerLinkText}>
              Ještě nemám účet - Zaregistrovat se
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>💡 Nemáte přístup k telefonu?</Text>
          <Text style={styles.helpText}>
            Pokud nemáte přístup k registrovanému telefonu, můžete požádat o obnovení přístupu přes email.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/zapomenute-heslo')}
          >
            <Text style={styles.helpButtonText}>
              Obnovit přístup přes email
            </Text>
          </TouchableOpacity>
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
    marginBottom: 32,
    lineHeight: 20,
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 18,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  registerLink: {
    padding: 12,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  helpButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
  },
  backLink: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backLinkText: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    padding: 12,
    alignItems: 'center',
  },
  resendLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
