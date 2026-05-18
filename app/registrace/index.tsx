import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { checkUsernameExists } from '@/features/profil/services/profilService';
import { geocodeAddress } from '@/features/mapa/services/geocodingService';

async function reverseGeocode(lat: number, lng: number): Promise<{ mesto: string | null; display: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Samopestitele-App/1.0' } });
    if (!res.ok) return { mesto: null, display: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    const data = await res.json();
    const addr = data?.address;
    const mesto = addr?.city || addr?.town || addr?.village || addr?.municipality || null;
    const display = [mesto, addr?.county, addr?.state].filter(Boolean).join(', ') || data?.display_name?.split(',').slice(0, 2).join(', ') || '';
    return { mesto, display };
  } catch {
    return { mesto: null, display: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

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

  // KROK 3: Poloha (volitelné)
  const [adresaInput, setAdresaInput] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [lokaceMesto, setLokaceMesto] = useState<string | null>(null);
  const [lokaceDisplay, setLokaceDisplay] = useState<string | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // KROK 4: Souhlasy
  const [souhlasGDPR, setSouhlasGDPR] = useState(false);
  const [souhlasOdpovednost, setSouhlasOdpovednost] = useState(false);

  // KROK 5: Znovu odeslat email
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  /**
   * Kontrola unikátnosti uživatelského jména
   */
  const checkUsernameAvailability = async (name: string): Promise<boolean> => {
    try {
      const exists = await checkUsernameExists(name.toLowerCase());
      return !exists; // Dostupné pokud neexistuje
    } catch (error) {
      console.error('Chyba při kontrole uživatelského jména:', error);
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
   * KROK 3: Najít polohu podle zadané adresy
   */
  const najitPolohuPodleAdresy = async () => {
    const text = adresaInput.trim();
    if (!text) return;

    setGeocodingLoading(true);
    setLokaceDisplay(null);
    setGpsLat(null);
    setGpsLng(null);

    // Pokus o geocoding — text může být "Město", "Ulice, Město" nebo "Název farmy, PSČ Město"
    const parts = text.split(',').map(s => s.trim());
    const ulice = parts.length > 1 ? parts.slice(0, -1).join(', ') : '';
    const mesto = parts[parts.length - 1];

    const result = await geocodeAddress(ulice, mesto);
    setGeocodingLoading(false);

    if (result) {
      setGpsLat(result.lat);
      setGpsLng(result.lng);
      // Extrahovat město z display_name
      const prvniCast = result.display_name.split(',').slice(0, 2).join(',').trim();
      setLokaceMesto(mesto);
      setLokaceDisplay(prvniCast);
    } else {
      if (Platform.OS === 'web') {
        alert('Adresu se nepodařilo najít. Zkuste jiný formát, např. "Praha" nebo "Náměstí, Brno".');
      } else {
        Alert.alert('Nenalezeno', 'Adresu se nepodařilo najít. Zkuste jiný formát.');
      }
    }
  };

  /**
   * KROK 3: Použít GPS polohu zařízení
   */
  const pouzitMojuPolohu = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('GPS poloha není v tomto prohlížeči dostupná.');
      return;
    }
    setGpsLoading(true);
    setLokaceDisplay(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { mesto, display } = await reverseGeocode(latitude, longitude);
        setGpsLat(latitude);
        setGpsLng(longitude);
        setLokaceMesto(mesto);
        setLokaceDisplay(display || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        alert('Nepodařilo se získat polohu. Zkontrolujte oprávnění v prohlížeči.');
      },
      { timeout: 10000 }
    );
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
        pin: heslo,
        username: username,
        gps_lat: gpsLat ?? undefined,
        gps_lng: gpsLng ?? undefined,
        mesto: lokaceMesto ?? undefined,
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

  const znoveOdeslatEmail = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    setResendSent(false);
    try {
      const { supabase } = require('@/lib/supabaseClient');
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://samopestitele.cz'}/auth/callback?mode=verify`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl, shouldCreateUser: true },
      });
      if (error) {
        console.error('Resend email error:', error);
        alert(`Nepodařilo se odeslat email: ${error.message}`);
        return;
      }
      setResendSent(true);
    } catch (err: any) {
      console.error('Resend email exception:', err);
      alert('Nepodařilo se odeslat email. Zkuste to za chvíli.');
    } finally {
      setResendLoading(false);
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
              <Text style={styles.iconText}>🧺</Text>
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

            {/* Poloha farmy */}
            <Text style={[styles.label, { marginTop: 20 }]}>Poloha farmy</Text>
            <Text style={styles.hintText}>Nepovinné — zákazníci vás snáze najdou na mapě</Text>

            <View style={styles.lokaceRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginTop: 8 }]}
                placeholder="Město nebo adresa"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={adresaInput}
                onChangeText={(t) => { setAdresaInput(t); setLokaceDisplay(null); setGpsLat(null); setGpsLng(null); }}
                onSubmitEditing={najitPolohuPodleAdresy}
                returnKeyType="search"
              />
            </View>

            <View style={styles.lokaceBtnRow}>
              <TouchableOpacity
                style={[styles.lokaceBtn, geocodingLoading && styles.lokaceBtnDisabled]}
                onPress={najitPolohuPodleAdresy}
                disabled={geocodingLoading || !adresaInput.trim()}
              >
                {geocodingLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.lokaceBtnText}>🔍 Najít adresu</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.lokaceBtn, gpsLoading && styles.lokaceBtnDisabled]}
                onPress={pouzitMojuPolohu}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.lokaceBtnText}>📍 Moje poloha</Text>
                }
              </TouchableOpacity>
            </View>

            {lokaceDisplay && (
              <View style={styles.lokaceNalezena}>
                <Text style={styles.lokaceNalezenaText}>✓ {lokaceDisplay}</Text>
                <TouchableOpacity onPress={() => { setLokaceDisplay(null); setGpsLat(null); setGpsLng(null); }}>
                  <Text style={styles.lokaceZrusit}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

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
              <Text style={styles.summaryItem}>🧺 {nazevFarmy}</Text>
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

        {/* KROK 5: Úspěšná registrace — výzva k ověření emailu */}
        {krok === 5 && registrationSuccess && (
          <View style={styles.card}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIconText}>✉️</Text>
            </View>
            <Text style={styles.successTitle}>Zkontrolujte email!</Text>
            <Text style={styles.successSubtitle}>
              Poslali jsme uvítací email na{'\n'}
              <Text style={{ color: '#FF9800', fontWeight: '700' }}>{email}</Text>
            </Text>

            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Co teď?</Text>
              <Text style={styles.stepItem}>1️⃣  Otevřete svůj email</Text>
              <Text style={styles.stepItem}>2️⃣  Klikněte na odkaz „Ověřit email"</Text>
              <Text style={styles.stepItem}>3️⃣  Přihlaste se a vyplňte profil farmy</Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Vaše přihlašovací údaje</Text>
              <Text style={styles.warningText}>
                • Uživatelské jméno: <Text style={{ fontWeight: '700', color: '#fff' }}>{username}</Text>{'\n'}
                • Heslo: které jste zadali při registraci{'\n'}
                • Email není ověřen → přihlášení nebude fungovat
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/prihlaseni')}
            >
              <Text style={styles.primaryButtonText}>Mám ověřeno → Přihlásit se</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendButton, (resendLoading || resendSent) && styles.lokaceBtnDisabled]}
              onPress={znoveOdeslatEmail}
              disabled={resendLoading || resendSent}
            >
              {resendLoading
                ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                : <Text style={styles.resendButtonText}>
                    {resendSent ? '✓ Email odeslán' : 'Nedorazil email? Odeslat znovu'}
                  </Text>
              }
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
    backgroundColor: '#1a3a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a3a1a',
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
    fontSize: 10,
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
    fontSize: 10,
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
  stepItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
    lineHeight: 20,
  },
  lokaceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lokaceBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  lokaceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: 40,
    justifyContent: 'center',
  },
  lokaceBtnDisabled: {
    opacity: 0.5,
  },
  lokaceBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  lokaceNalezena: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.5)',
  },
  lokaceNalezenaText: {
    color: '#a5d6a7',
    fontSize: 13,
    flex: 1,
  },
  lokaceZrusit: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    paddingLeft: 8,
  },
  resendButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textDecorationLine: 'underline',
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
