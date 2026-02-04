import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFarmarAuth } from '../utils/farmarAuthContext';

// Zakázané sekvence hesel
const FORBIDDEN_PASSWORDS = [
  '12345678', '123456789', '1234567890',
  '11111111', '22222222', '33333333', '44444444', '55555555',
  '66666666', '77777777', '88888888', '99999999', '00000000',
  'abcdefgh', 'qwertyui', 'asdfghjk', 'password', 'heslo123',
];

// Validace hesla
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Heslo musí mít alespoň 8 znaků' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Heslo musí obsahovat alespoň jedno velké písmeno' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Heslo musí obsahovat alespoň jedno číslo' };
  }

  // Kontrola zakázaných sekvencí
  const lowerPassword = password.toLowerCase();
  for (const forbidden of FORBIDDEN_PASSWORDS) {
    if (lowerPassword.includes(forbidden)) {
      return { valid: false, error: 'Heslo nesmí obsahovat jednoduché sekvence (např. 12345678, 11111111)' };
    }
  }

  // Kontrola opakujících se znaků (např. aaaaaaaa)
  if (/(.)\1{5,}/.test(password)) {
    return { valid: false, error: 'Heslo nesmí obsahovat více než 5 opakujících se znaků' };
  }

  return { valid: true };
}

export default function RegistraceScreen() {
  const { register } = useFarmarAuth();

  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [farmNumber, setFarmNumber] = useState('');

  // KROK 1: Uživatelské jméno
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // KROK 2: Heslo
  const [heslo, setHeslo] = useState('');
  const [hesloPotvrdit, setHesloPotvrdit] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // KROK 3: Základní informace
  const [email, setEmail] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');

  // KROK 4: Souhlasy
  const [souhlasGDPR, setSouhlasGDPR] = useState(false);
  const [souhlasOdpovednost, setSouhlasOdpovednost] = useState(false);

  /**
   * Kontrola unikátnosti uživatelského jména
   */
  const checkUsernameAvailability = async (name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('pestitele')
        .select('id')
        .eq('username', name.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Chyba při kontrole uživatelského jména:', error);
        return false;
      }

      return data === null; // Dostupné pokud neexistuje
    } catch (error) {
      console.error('Chyba:', error);
      return false;
    }
  };

  /**
   * KROK 1: Validace uživatelského jména
   */
  const validovatUsername = async () => {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setUsernameError('Zadejte uživatelské jméno');
      return;
    }

    if (cleanUsername.length < 3) {
      setUsernameError('Uživatelské jméno musí mít alespoň 3 znaky');
      return;
    }

    if (cleanUsername.length > 20) {
      setUsernameError('Uživatelské jméno může mít maximálně 20 znaků');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setUsernameError('Uživatelské jméno může obsahovat pouze malá písmena, čísla a podtržítko');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');

    const isAvailable = await checkUsernameAvailability(cleanUsername);

    setCheckingUsername(false);

    if (!isAvailable) {
      setUsernameError('Toto uživatelské jméno je již obsazeno');
      return;
    }

    setUsername(cleanUsername);
    setKrok(2);
  };

  /**
   * KROK 2: Validace hesla
   */
  const validovatHeslo = () => {
    const passwordValidation = validatePassword(heslo);

    if (!passwordValidation.valid) {
      if (Platform.OS === 'web') {
        alert(passwordValidation.error);
      } else {
        Alert.alert('Chyba', passwordValidation.error || 'Neplatné heslo');
      }
      return;
    }

    if (heslo !== hesloPotvrdit) {
      if (Platform.OS === 'web') {
        alert('Hesla se neshodují');
      } else {
        Alert.alert('Chyba', 'Hesla se neshodují');
      }
      return;
    }

    setKrok(3);
  };

  /**
   * KROK 3: Validace základních informací
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
    setKrok(4);
  };

  /**
   * KROK 4: Dokončení registrace
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
      const result = await register({
        telefon: '+420000000000', // Dummy - nebude se používat
        nazev_farmy: nazevFarmy,
        jmeno,
        email: email,
        pin: heslo, // Nyní je to heslo, ne PIN
        username: username,
      });

      if (result.success && result.farmNumber) {
        setFarmNumber(result.farmNumber);
        setRegistrationSuccess(true);
        setKrok(5);
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
      {krok < 5 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, krok >= 1 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 2 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 3 && styles.progressStepActive]} />
          <View style={[styles.progressStep, krok >= 4 && styles.progressStepActive]} />
        </View>
      )}

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* KROK 1: Uživatelské jméno */}
        {krok === 1 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <Text style={styles.stepTitle}>Uživatelské jméno</Text>
            <Text style={styles.stepSubtitle}>Krok 1 ze 4</Text>
            <Text style={styles.infoText}>
              Vyberte si unikátní uživatelské jméno pro přihlášení.
            </Text>

            <Text style={styles.label}>Uživatelské jméno *</Text>
            <TextInput
              style={[styles.input, usernameError ? styles.inputError : null]}
              placeholder="např. jan_novak"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setUsernameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.hintText}>
                Pouze malá písmena, čísla a podtržítko. 3-20 znaků.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, checkingUsername && styles.primaryButtonDisabled]}
              onPress={validovatUsername}
              disabled={checkingUsername}
            >
              <Text style={styles.primaryButtonText}>
                {checkingUsername ? 'Kontroluji...' : 'Pokračovat →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Heslo */}
        {krok === 2 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.stepTitle}>Vytvořte heslo</Text>
            <Text style={styles.stepSubtitle}>Krok 2 ze 4</Text>
            <Text style={styles.infoText}>
              Heslo musí být bezpečné pro ochranu vašeho účtu.
            </Text>

            <Text style={styles.label}>Heslo *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Zadejte heslo"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={heslo}
                onChangeText={setHeslo}
                secureTextEntry={!showPassword}
                autoFocus
              />
              <TouchableOpacity
                style={styles.showPasswordBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordRules}>
              <Text style={[styles.ruleText, heslo.length >= 8 && styles.ruleTextValid]}>
                {heslo.length >= 8 ? '✓' : '○'} Minimálně 8 znaků
              </Text>
              <Text style={[styles.ruleText, /[A-Z]/.test(heslo) && styles.ruleTextValid]}>
                {/[A-Z]/.test(heslo) ? '✓' : '○'} Alespoň jedno velké písmeno
              </Text>
              <Text style={[styles.ruleText, /[0-9]/.test(heslo) && styles.ruleTextValid]}>
                {/[0-9]/.test(heslo) ? '✓' : '○'} Alespoň jedno číslo
              </Text>
            </View>

            <Text style={styles.label}>Potvrďte heslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Zadejte heslo znovu"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={hesloPotvrdit}
              onChangeText={setHesloPotvrdit}
              secureTextEntry={!showPassword}
            />
            {hesloPotvrdit && heslo !== hesloPotvrdit && (
              <Text style={styles.errorText}>Hesla se neshodují</Text>
            )}

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

        {/* KROK 3: Základní informace */}
        {krok === 3 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🌾</Text>
            </View>
            <Text style={styles.stepTitle}>O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok 3 ze 4</Text>
            <Text style={styles.infoText}>
              Základní informace, aby vás zákazníci mohli najít.
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
            <Text style={styles.hintText}>
              Pro obnovu zapomenutého hesla
            </Text>

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

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setKrok(2)}
              >
                <Text style={styles.secondaryButtonText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                onPress={validovatInfo}
              >
                <Text style={styles.primaryButtonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 4: Shrnutí a souhlas */}
        {krok === 4 && (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <Text style={styles.stepTitle}>Dokončení</Text>
            <Text style={styles.stepSubtitle}>Krok 4 ze 4</Text>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Shrnutí:</Text>
              <Text style={styles.summaryItem}>👤 {username}</Text>
              <Text style={styles.summaryItem}>📧 {email}</Text>
              <Text style={styles.summaryItem}>🧑 {jmeno}</Text>
              <Text style={styles.summaryItem}>🌾 {nazevFarmy}</Text>
              <Text style={styles.summaryItem}>🔐 Heslo: {'•'.repeat(8)}</Text>
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
                Souhlasím se zpracováním osobních údajů v souladu s GDPR.{' '}
                <Text
                  style={styles.checkboxLink}
                  onPress={() => router.push('/podminky')}
                >
                  Zásady ochrany osobních údajů
                </Text>
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
                Prohlašuji, že nesu odpovědnost za nabízené produkty.{' '}
                <Text
                  style={styles.checkboxLink}
                  onPress={() => router.push('/podminky')}
                >
                  Obchodní podmínky
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setKrok(3)}
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

        {/* KROK 5: Úspěšná registrace */}
        {krok === 5 && registrationSuccess && (
          <View style={styles.card}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconText}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Registrace úspěšná!</Text>
            <Text style={styles.successSubtitle}>
              Váš účet byl vytvořen. Uložte si přihlašovací údaje:
            </Text>

            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Vaše přihlašovací údaje:</Text>

              <View style={styles.credentialItem}>
                <Text style={styles.credentialLabel}>Uživatelské jméno:</Text>
                <View style={styles.credentialValue}>
                  <Text style={styles.credentialValueText}>{username}</Text>
                </View>
              </View>

              <View style={styles.credentialItem}>
                <Text style={styles.credentialLabel}>Kód farmy:</Text>
                <View style={styles.credentialValue}>
                  <Text style={styles.credentialValueText}>{farmNumber}</Text>
                </View>
              </View>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Důležité</Text>
              <Text style={styles.warningText}>
                • Pro přihlášení použijte uživatelské jméno a heslo{'\n'}
                • Kód farmy je váš unikátní identifikátor{'\n'}
                • Zapomenuté heslo obnovíte přes email
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/prihlaseni')}
            >
              <Text style={styles.primaryButtonText}>Přihlásit se →</Text>
            </TouchableOpacity>
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
  inputError: {
    borderColor: '#ef5350',
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef5350',
    marginTop: 6,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  showPasswordBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  showPasswordText: {
    fontSize: 20,
  },
  passwordRules: {
    marginTop: 12,
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  ruleTextValid: {
    color: '#a5d6a7',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
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
