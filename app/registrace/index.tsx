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
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrace pěstitele</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress bar */}
      {krok < 4 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, krok >= 1 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 2 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 3 && styles.progressStepActive]} />
        </View>
      )}

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* KROK 1: Základní informace */}
        {krok === 1 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🌾</Text>
            </View>
            <Text style={styles.stepTitle}>O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok 1 z 3</Text>
            <Text style={styles.infoText}>
              Pár základních informací, aby vás zákazníci mohli najít.
            </Text>

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="vas@email.cz"
              placeholderTextColor="rgba(255,255,255,0.5)"
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
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={jmeno}
              onChangeText={setJmeno}
            />

            <Text style={styles.label}>Název farmy *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Farma U Nováků"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={nazevFarmy}
              onChangeText={setNazevFarmy}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={validovatInfo}
            >
              <Text style={styles.primaryButtonText}>Pokračovat →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Vytvoření PINu */}
        {krok === 2 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.stepTitle}>Vytvořte PIN</Text>
            <Text style={styles.stepSubtitle}>Krok 2 z 3</Text>
            <Text style={styles.infoText}>
              PIN budete používat společně s kódem farmy pro rychlé přihlášení.
            </Text>

            <Text style={styles.label}>PIN (4-6 číslic) *</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              placeholder="••••"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={heslo}
              onChangeText={setHeslo}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <Text style={styles.label}>Potvrďte PIN *</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              placeholder="••••"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={hesloPotvrdit}
              onChangeText={setHesloPotvrdit}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setKrok(1)}
              >
                <Text style={styles.secondaryButtonText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                onPress={validovatHeslo}
              >
                <Text style={styles.primaryButtonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 4: Úspěšná registrace */}
        {krok === 4 && registrationSuccess && (
          <View style={styles.card}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconText}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Registrace úspěšná!</Text>
            <Text style={styles.successSubtitle}>
              Váš účet byl vytvořen. Uložte si prosím své přihlašovací údaje:
            </Text>

            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Vaše přihlašovací údaje:</Text>

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
              <Text style={styles.warningTitle}>Důležité</Text>
              <Text style={styles.warningText}>
                • Uložte si tyto údaje na bezpečné místo{'\n'}
                • Budete je potřebovat pro přihlášení{'\n'}
                • Pokud zapomenete, lze je obnovit přes email na "Zapomenuté údaje"
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/prihlaseni/prodejna')}
            >
              <Text style={styles.primaryButtonText}>Přihlásit se →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 3: Shrnutí a souhlas */}
        {krok === 3 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <Text style={styles.stepTitle}>Dokončení</Text>
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
                style={styles.secondaryButton}
                onPress={() => setKrok(2)}
              >
                <Text style={styles.secondaryButtonText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }, loading && styles.primaryButtonDisabled]}
                onPress={registrovat}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
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
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#FF9800',
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
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#ffffff',
  },
  pinInput: {
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#ffffff',
  },
  summaryItem: {
    fontSize: 14,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.8)',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#FF9800',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  checkboxLink: {
    color: '#FF9800',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Úspěšná registrace
  successIconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#a5d6a7',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  credentialsBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 16,
    textAlign: 'center',
  },
  credentialItem: {
    marginBottom: 12,
  },
  credentialLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    fontWeight: '600',
  },
  credentialValue: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  credentialValueText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 4,
  },
  warningBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
});
