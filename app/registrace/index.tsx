import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function RegistraceScreen() {
  const { register } = useFarmarAuth();

  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [farmNumber, setFarmNumber] = useState('');

  // KROK 1: Email a základní informace
  const [email, setEmail] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');

  // KROK 2: PIN (4-6 číslic)
  const [heslo, setHeslo] = useState('');
  const [hesloPotvrdit, setHesloPotvrdit] = useState('');

  // KROK 3: Souhlasy
  const [souhlasGDPR, setSouhlasGDPR] = useState(false);
  const [souhlasOdpovednost, setSouhlasOdpovednost] = useState(false);

  /**
   * KROK 1: Validace základních informací
   */
  const validovatInfo = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      if (Platform.OS === 'web') {
        alert('Zadejte emailovou adresu');
      } else {
        Alert.alert('Chyba', 'Zadejte emailovou adresu');
      }
      return;
    }

    if (!cleanEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      if (Platform.OS === 'web') {
        alert('Zadejte platnou emailovou adresu');
      } else {
        Alert.alert('Chyba', 'Zadejte platnou emailovou adresu');
      }
      return;
    }

    if (!jmeno.trim()) {
      if (Platform.OS === 'web') {
        alert('Zadejte vaše jméno');
      } else {
        Alert.alert('Chyba', 'Zadejte vaše jméno');
      }
      return;
    }

    if (!nazevFarmy.trim()) {
      if (Platform.OS === 'web') {
        alert('Zadejte název farmy');
      } else {
        Alert.alert('Chyba', 'Zadejte název farmy');
      }
      return;
    }

    setEmail(cleanEmail);
    setKrok(2);
  };

  /**
   * KROK 2: Validace PINu
   */
  const validovatHeslo = () => {
    // PIN musí mít 4-6 znaků a obsahovat pouze číslice
    if (heslo.length < 4 || heslo.length > 6) {
      if (Platform.OS === 'web') {
        alert('PIN musí mít 4-6 číslic');
      } else {
        Alert.alert('Chyba', 'PIN musí mít 4-6 číslic');
      }
      return;
    }

    if (!/^\d+$/.test(heslo)) {
      if (Platform.OS === 'web') {
        alert('PIN může obsahovat pouze číslice');
      } else {
        Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      }
      return;
    }

    if (heslo !== hesloPotvrdit) {
      if (Platform.OS === 'web') {
        alert('PINy se neshodují');
      } else {
        Alert.alert('Chyba', 'PINy se neshodují');
      }
      return;
    }

    setKrok(3);
  };

  /**
   * KROK 3: Dokončení registrace
   */
  const registrovat = async () => {
    if (!souhlasGDPR) {
      if (Platform.OS === 'web') {
        alert('Musíte souhlasit se zpracováním osobních údajů');
      } else {
        Alert.alert('Chyba', 'Musíte souhlasit se zpracováním osobních údajů');
      }
      return;
    }

    if (!souhlasOdpovednost) {
      if (Platform.OS === 'web') {
        alert('Musíte potvrdit odpovědnost za nabízené produkty');
      } else {
        Alert.alert('Chyba', 'Musíte potvrdit odpovědnost za nabízené produkty');
      }
      return;
    }

    setLoading(true);
    try {
      // Pro nyní použijeme dummy telefon, protože register() funkce ho vyžaduje
      // V budoucnu můžeme upravit register() funkci aby akceptovala email místo telefonu
      const result = await register({
        telefon: '+420000000000', // Dummy - nebude se používat
        nazev_farmy: nazevFarmy,
        jmeno,
        email: email,
        pin: heslo,
      });

      if (result.success && result.farmNumber) {
        // Uložíme kód farmy a zobrazíme úspěšnou obrazovku
        setFarmNumber(result.farmNumber);
        setRegistrationSuccess(true);
        setKrok(4); // Nový krok 4 - úspěšná registrace
      } else {
        if (Platform.OS === 'web') {
          alert(result.error || 'Nepodařilo se vytvořit účet');
        } else {
          Alert.alert('Chyba', result.error || 'Nepodařilo se vytvořit účet');
        }
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error.message || 'Nepodařilo se vytvořit účet');
      } else {
        Alert.alert('Chyba', error.message || 'Nepodařilo se vytvořit účet');
      }
      console.error('Registrace error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => krok > 1 ? setKrok(krok - 1) : router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrace pěstitele</Text>
      </View>

      {/* Progress bar */}
      {krok < 4 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, krok >= 1 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 2 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 3 && styles.progressStepActive]} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* KROK 1: Základní informace */}
        {krok === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🌾 O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok 1 z 3</Text>
            <Text style={styles.infoText}>
              Pár základních informací, aby vás zákazníci mohli najít.
            </Text>

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="vas@email.cz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />

            <Text style={styles.label}>Vaše jméno *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Jan Novák"
              value={jmeno}
              onChangeText={setJmeno}
            />

            <Text style={styles.label}>Název farmy *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Farma U Nováků"
              value={nazevFarmy}
              onChangeText={setNazevFarmy}
            />

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={validovatInfo}
            >
              <Text style={styles.buttonText}>Pokračovat →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Vytvoření PINu */}
        {krok === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🔐 Vytvořte PIN</Text>
            <Text style={styles.stepSubtitle}>Krok 2 z 3</Text>
            <Text style={styles.infoText}>
              PIN budete používat společně s kódem farmy pro rychlé přihlášení.
            </Text>

            <Text style={styles.label}>PIN (4-6 číslic) *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              value={heslo}
              onChangeText={setHeslo}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />

            <Text style={styles.label}>Potvrďte PIN *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              value={hesloPotvrdit}
              onChangeText={setHesloPotvrdit}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(1)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }]}
                onPress={validovatHeslo}
              >
                <Text style={styles.buttonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 4: Úspěšná registrace */}
        {krok === 4 && registrationSuccess && (
          <View style={styles.step}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Registrace úspěšná!</Text>
              <Text style={styles.successSubtitle}>
                Váš účet byl vytvořen. Uložte si prosím své přihlašovací údaje:
              </Text>

              <View style={styles.credentialsBox}>
                <Text style={styles.credentialsTitle}>🔑 Vaše přihlašovací údaje:</Text>

                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Kód farmy:</Text>
                  <View style={styles.credentialValue}>
                    <Text style={styles.credentialValueText}>{farmNumber}</Text>
                  </View>
                </View>

                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>PIN:</Text>
                  <View style={styles.credentialValue}>
                    <Text style={styles.credentialValueText}>{heslo}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Důležité</Text>
                <Text style={styles.warningText}>
                  • Uložte si tyto údaje na bezpečné místo{'\n'}
                  • Budete je potřebovat pro přihlášení{'\n'}
                  • Pokud zapomenete, lze je obnovit přes email na "Zapomenuté údaje"
                </Text>
              </View>

              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={() => router.replace('/prihlaseni/prodejna')}
              >
                <Text style={styles.buttonText}>Přihlásit se →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 3: Shrnutí a souhlas */}
        {krok === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>✓ Dokončení</Text>
            <Text style={styles.stepSubtitle}>Krok 3 z 3</Text>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Shrnutí:</Text>
              <Text style={styles.summaryItem}>📧 {email}</Text>
              <Text style={styles.summaryItem}>👤 {jmeno}</Text>
              <Text style={styles.summaryItem}>🌾 {nazevFarmy}</Text>
              <Text style={styles.summaryItem}>🔐 PIN: {'•'.repeat(heslo.length)}</Text>
            </View>

            {/* GDPR Souhlas */}
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setSouhlasGDPR(!souhlasGDPR)}
            >
              <View style={[styles.checkboxBox, souhlasGDPR && styles.checkboxBoxChecked]}>
                {souhlasGDPR && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Souhlasím se zpracováním osobních údajů (jméno, email, telefon, adresa) v souladu s nařízením GDPR pro účely poskytování služeb této platformy. Jsem si vědom/a svých práv na přístup, opravu, výmaz a přenositelnost údajů. Více informací v{' '}
                <Text
                  style={styles.checkboxLink}
                  onPress={() => router.push('/podmínky')}
                >
                  Zásadách ochrany osobních údajů
                </Text>.
              </Text>
            </TouchableOpacity>

            {/* Odpovědnost za nabídku */}
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setSouhlasOdpovednost(!souhlasOdpovednost)}
            >
              <View style={[styles.checkboxBox, souhlasOdpovednost && styles.checkboxBoxChecked]}>
                {souhlasOdpovednost && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Prohlašuji, že nesu plnou odpovědnost za pravdivost, kvalitu a bezpečnost nabízených produktů. Zavazuji se dodržovat platné hygienické a zdravotní standardy ČR při pěstování a prodeji potravin. Více informací v{' '}
                <Text
                  style={styles.checkboxLink}
                  onPress={() => router.push('/podminky')}
                >
                  Obchodních podmínkách
                </Text>.
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(2)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={registrovat}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Registruji...' : 'Zaregistrovat se ✓'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: { marginRight: 15 },
  backButtonText: { fontSize: 16, color: '#7B1FA2', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#6A1B9A' },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20, gap: 10 },
  progressStep: { flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  progressStepActive: { backgroundColor: '#7B1FA2' },
  content: { padding: 20 },
  step: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 5 },
  stepSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  infoText: { fontSize: 15, color: '#666', marginBottom: 25, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 30 },
  buttonPrimary: {
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#666', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  summary: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: 10, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#6A1B9A' },
  summaryItem: { fontSize: 15, marginBottom: 5, color: '#333' },
  checkbox: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#7B1FA2',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBoxChecked: { backgroundColor: '#7B1FA2' },
  checkboxCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  checkboxText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 18 },
  checkboxLink: { color: '#7B1FA2', fontWeight: '600', textDecorationLine: 'underline' },

  // Úspěšná registrace
  successContainer: { alignItems: 'center', paddingVertical: 20 },
  successIcon: { fontSize: 80, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10, textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center', lineHeight: 24 },
  credentialsBox: {
    backgroundColor: '#F3E5F5',
    padding: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#7B1FA2'
  },
  credentialsTitle: { fontSize: 18, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 20, textAlign: 'center' },
  credentialItem: { marginBottom: 16 },
  credentialLabel: { fontSize: 14, color: '#666', marginBottom: 6, fontWeight: '600' },
  credentialValue: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7B1FA2',
  },
  credentialValueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A1B9A',
    textAlign: 'center',
    letterSpacing: 4,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  warningTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#666', lineHeight: 20 },
});
