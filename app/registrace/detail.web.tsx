import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { checkUsernameExists } from '@/features/profil/services/profilService';
import { geocodeAddress } from '@/features/mapa/services/geocodingService';

// ── Helpers ──────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<{ mesto: string | null; display: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'Samopestitele-App/1.0' } }
    );
    if (!res.ok) return { mesto: null, display: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    const data = await res.json();
    const addr = data?.address;
    const mesto = addr?.city || addr?.town || addr?.village || addr?.municipality || null;
    const display = [mesto, addr?.county, addr?.state].filter(Boolean).join(', ')
      || data?.display_name?.split(',').slice(0, 2).join(', ') || '';
    return { mesto, display };
  } catch {
    return { mesto: null, display: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

const FORBIDDEN_PASSWORDS = [
  '12345678', '123456789', '1234567890',
  '11111111', '22222222', '33333333', '44444444', '55555555',
  '66666666', '77777777', '88888888', '99999999', '00000000',
  'abcdefgh', 'qwertyui', 'asdfghjk', 'password', 'heslo123',
];

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: 'Heslo musí mít alespoň 8 znaků' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Heslo musí obsahovat alespoň jedno velké písmeno' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Heslo musí obsahovat alespoň jedno číslo' };
  const lower = password.toLowerCase();
  for (const f of FORBIDDEN_PASSWORDS) {
    if (lower.includes(f)) return { valid: false, error: 'Heslo nesmí obsahovat jednoduché sekvence' };
  }
  if (/(.)\1{5,}/.test(password)) return { valid: false, error: 'Heslo nesmí obsahovat více než 5 opakujících se znaků' };
  return { valid: true };
}

// ── Komponenta ───────────────────────────────────────────────────
export default function RegistraceDetailWebScreen() {
  const { register } = useFarmarAuth();

  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [farmNumber, setFarmNumber] = useState('');

  // Krok 1
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Krok 2
  const [heslo, setHeslo] = useState('');
  const [hesloPotvrdit, setHesloPotvrdit] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hesloError, setHesloError] = useState('');

  // Krok 3
  const [email, setEmail] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');
  const [adresaInput, setAdresaInput] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [lokaceMesto, setLokaceMesto] = useState<string | null>(null);
  const [lokaceDisplay, setLokaceDisplay] = useState<string | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Krok 4
  const [souhlasGDPR, setSouhlasGDPR] = useState(false);
  const [souhlasOdpovednost, setSouhlasOdpovednost] = useState(false);

  // Krok 5 (úspěch)
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // ── Krok 1: validace uživatelského jména ─────────────────────
  const validovatUsername = async () => {
    const clean = username.trim().toLowerCase();
    if (!clean) { setUsernameError('Zadejte uživatelské jméno'); return; }
    if (clean.length < 3) { setUsernameError('Minimálně 3 znaky'); return; }
    if (clean.length > 20) { setUsernameError('Maximálně 20 znaků'); return; }
    if (!/^[a-z0-9_]+$/.test(clean)) { setUsernameError('Pouze malá písmena, čísla a podtržítko'); return; }
    setCheckingUsername(true);
    setUsernameError('');
    try {
      const exists = await checkUsernameExists(clean);
      if (exists) { setUsernameError('Toto jméno je již obsazeno'); return; }
      setUsername(clean);
      setKrok(2);
    } catch {
      setUsernameError('Chyba při ověřování jména');
    } finally {
      setCheckingUsername(false);
    }
  };

  // ── Krok 2: validace hesla ────────────────────────────────────
  const validovatHeslo = () => {
    setHesloError('');
    const result = validatePassword(heslo);
    if (!result.valid) { setHesloError(result.error || 'Neplatné heslo'); return; }
    if (heslo !== hesloPotvrdit) { setHesloError('Hesla se neshodují'); return; }
    setKrok(3);
  };

  // ── Krok 3: poloha ───────────────────────────────────────────
  const najitPolohu = async () => {
    const text = adresaInput.trim();
    if (!text) return;
    setGeocodingLoading(true);
    setLokaceDisplay(null); setGpsLat(null); setGpsLng(null);
    const parts = text.split(',').map(s => s.trim());
    const ulice = parts.length > 1 ? parts.slice(0, -1).join(', ') : '';
    const mesto = parts[parts.length - 1];
    const result = await geocodeAddress(ulice, mesto);
    setGeocodingLoading(false);
    if (result) {
      setGpsLat(result.lat); setGpsLng(result.lng);
      setLokaceMesto(mesto);
      setLokaceDisplay(result.display_name.split(',').slice(0, 2).join(',').trim());
    } else {
      alert('Adresu se nepodařilo najít. Zkuste jiný formát.');
    }
  };

  const pouzitGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('GPS poloha není v tomto prohlížeči dostupná.'); return;
    }
    setGpsLoading(true); setLokaceDisplay(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { mesto, display } = await reverseGeocode(latitude, longitude);
        setGpsLat(latitude); setGpsLng(longitude);
        setLokaceMesto(mesto);
        setLokaceDisplay(display || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); alert('Nepodařilo se získat polohu.'); },
      { timeout: 10000 }
    );
  };

  const validovatInfo = () => {
    setInfoError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setInfoError('Zadejte emailovou adresu'); return; }
    if (!cleanEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setInfoError('Zadejte platný email'); return; }
    if (!jmeno.trim()) { setInfoError('Zadejte vaše jméno'); return; }
    if (!nazevFarmy.trim()) { setInfoError('Zadejte název farmy'); return; }
    setEmail(cleanEmail);
    setKrok(4);
  };

  // ── Krok 4: registrace ───────────────────────────────────────
  const registrovat = async () => {
    if (!souhlasGDPR) { alert('Musíte souhlasit se zpracováním osobních údajů'); return; }
    if (!souhlasOdpovednost) { alert('Musíte potvrdit odpovědnost za nabízené produkty'); return; }
    setLoading(true);
    try {
      const result = await register({
        telefon: '+420000000000',
        nazev_farmy: nazevFarmy,
        jmeno,
        email,
        pin: heslo,
        username,
        gps_lat: gpsLat ?? undefined,
        gps_lng: gpsLng ?? undefined,
        mesto: lokaceMesto ?? undefined,
      });
      if (result.success && result.farmNumber) {
        setFarmNumber(result.farmNumber);
        setRegistrationSuccess(true);
        setKrok(5);
      } else {
        alert(result.error || 'Nepodařilo se vytvořit účet');
      }
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se vytvořit účet');
    } finally {
      setLoading(false);
    }
  };

  const znoveOdeslatEmail = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      const { supabase } = require('@/lib/supabaseClient');
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://samopestitele.cz'}/auth/callback?mode=verify`;
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { emailRedirectTo: redirectUrl, shouldCreateUser: true },
      });
      if (error) { alert(`Nepodařilo se odeslat email: ${error.message}`); return; }
      setResendSent(true);
    } catch { alert('Nepodařilo se odeslat email.'); }
    finally { setResendLoading(false); }
  };

  // ── Progress bar ─────────────────────────────────────────────
  const ProgressBar = () => krok < 5 ? (
    <View style={s.progressBar}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[s.progressStep, krok >= i && s.progressStepActive]} />
      ))}
    </View>
  ) : null;

  // ── Render ────────────────────────────────────────────────────
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.card}>

        {/* Logo */}
        <Text style={s.logo}>🌿 Samopěstitelé</Text>
        <Text style={s.subtitle}>Registrace pěstitele</Text>

        <ProgressBar />

        {/* ═══ KROK 1: Uživatelské jméno ══════════════════════ */}
        {krok === 1 && (
          <View>
            <View style={s.stepIcon}><Text style={s.stepIconText}>👤</Text></View>
            <Text style={s.stepTitle}>Uživatelské jméno</Text>
            <Text style={s.stepInfo}>Krok 1 ze 4 · Vyberte si unikátní jméno pro přihlášení.</Text>

            <Text style={s.label}>Uživatelské jméno *</Text>
            <TextInput
              style={[s.input, usernameError ? s.inputError : null]}
              placeholder="např. jan_novak"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={(t) => { setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {usernameError
              ? <Text style={s.error}>{usernameError}</Text>
              : <Text style={s.hint}>Pouze malá písmena, čísla a podtržítko. 3–20 znaků.</Text>
            }

            <TouchableOpacity
              style={[s.btnPrimary, checkingUsername && s.btnDisabled]}
              onPress={validovatUsername}
              disabled={checkingUsername}
            >
              {checkingUsername
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Text style={s.btnPrimaryText}>Pokračovat →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.loginLink} onPress={() => router.push('/prihlaseni')}>
              <Text style={s.loginLinkText}>Máte účet? <Text style={s.loginLinkBold}>Přihlásit se</Text></Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ KROK 2: Heslo ══════════════════════════════════ */}
        {krok === 2 && (
          <View>
            <View style={s.stepIcon}><Text style={s.stepIconText}>🔐</Text></View>
            <Text style={s.stepTitle}>Vytvořte heslo</Text>
            <Text style={s.stepInfo}>Krok 2 ze 4 · Heslo musí být bezpečné.</Text>

            <Text style={s.label}>Heslo *</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={[s.input, s.passwordInput]}
                placeholder="Zadejte heslo"
                placeholderTextColor="#9ca3af"
                value={heslo}
                onChangeText={(v) => { setHeslo(v); setHesloError(''); }}
                secureTextEntry={!showPassword}
                autoFocus
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                <Text>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.rulesBox}>
              <Text style={[s.rule, heslo.length >= 8 && s.ruleOk]}>{heslo.length >= 8 ? '✓' : '○'} Minimálně 8 znaků</Text>
              <Text style={[s.rule, /[A-Z]/.test(heslo) && s.ruleOk]}>{/[A-Z]/.test(heslo) ? '✓' : '○'} Alespoň jedno velké písmeno</Text>
              <Text style={[s.rule, /[0-9]/.test(heslo) && s.ruleOk]}>{/[0-9]/.test(heslo) ? '✓' : '○'} Alespoň jedno číslo</Text>
            </View>

            <Text style={s.label}>Potvrďte heslo *</Text>
            <TextInput
              style={s.input}
              placeholder="Zadejte heslo znovu"
              placeholderTextColor="#9ca3af"
              value={hesloPotvrdit}
              onChangeText={(v) => { setHesloPotvrdit(v); setHesloError(''); }}
              secureTextEntry={!showPassword}
            />
            {hesloError ? <Text style={s.error}>{hesloError}</Text> : null}

            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => setKrok(1)}>
                <Text style={s.btnSecondaryText}>← Zpět</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, s.btnFlex]} onPress={validovatHeslo}>
                <Text style={s.btnPrimaryText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══ KROK 3: Informace ══════════════════════════════ */}
        {krok === 3 && (
          <View>
            <View style={s.stepIcon}><Text style={s.stepIconText}>🧺</Text></View>
            <Text style={s.stepTitle}>O vás a vaší farmě</Text>
            <Text style={s.stepInfo}>Krok 3 ze 4 · Zákazníci vás budou moct najít.</Text>

            {infoError ? <Text style={s.error}>{infoError}</Text> : null}

            <Text style={s.label}>Email *</Text>
            <TextInput
              style={s.input}
              placeholder="vas@email.cz"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(v) => { setEmail(v); setInfoError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Text style={s.hint}>Pro obnovu zapomenutého hesla</Text>

            <Text style={s.label}>Vaše jméno *</Text>
            <TextInput
              style={s.input}
              placeholder="např. Jan Novák"
              placeholderTextColor="#9ca3af"
              value={jmeno}
              onChangeText={(v) => { setJmeno(v); setInfoError(''); }}
            />

            <Text style={s.label}>Název farmy *</Text>
            <TextInput
              style={s.input}
              placeholder="např. Farma U Nováků"
              placeholderTextColor="#9ca3af"
              value={nazevFarmy}
              onChangeText={(v) => { setNazevFarmy(v); setInfoError(''); }}
            />

            <Text style={[s.label, { marginTop: 20 }]}>Poloha farmy</Text>
            <Text style={s.hint}>Nepovinné — zákazníci vás snáze najdou na mapě</Text>

            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Město nebo adresa"
              placeholderTextColor="#9ca3af"
              value={adresaInput}
              onChangeText={(t) => { setAdresaInput(t); setLokaceDisplay(null); setGpsLat(null); setGpsLng(null); }}
              onSubmitEditing={najitPolohu}
              returnKeyType="search"
            />
            <View style={s.lokaceBtns}>
              <TouchableOpacity
                style={[s.lokaceBtn, (geocodingLoading || !adresaInput.trim()) && s.btnDisabled]}
                onPress={najitPolohu}
                disabled={geocodingLoading || !adresaInput.trim()}
              >
                {geocodingLoading
                  ? <ActivityIndicator size="small" color="#4caf50" />
                  : <Text style={s.lokaceBtnText}>🔍 Najít adresu</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.lokaceBtn, gpsLoading && s.btnDisabled]}
                onPress={pouzitGPS}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? <ActivityIndicator size="small" color="#4caf50" />
                  : <Text style={s.lokaceBtnText}>📍 Moje poloha</Text>
                }
              </TouchableOpacity>
            </View>
            {lokaceDisplay && (
              <View style={s.lokaceFound}>
                <Text style={s.lokaceFoundText}>✓ {lokaceDisplay}</Text>
                <TouchableOpacity onPress={() => { setLokaceDisplay(null); setGpsLat(null); setGpsLng(null); }}>
                  <Text style={s.lokaceFoundClose}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => setKrok(2)}>
                <Text style={s.btnSecondaryText}>← Zpět</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, s.btnFlex]} onPress={validovatInfo}>
                <Text style={s.btnPrimaryText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══ KROK 4: Souhlasy ═══════════════════════════════ */}
        {krok === 4 && (
          <View>
            <View style={s.stepIcon}><Text style={s.stepIconText}>✓</Text></View>
            <Text style={s.stepTitle}>Dokončení</Text>
            <Text style={s.stepInfo}>Krok 4 ze 4 · Zkontrolujte údaje a potvrďte souhlasy.</Text>

            <View style={s.summary}>
              <Text style={s.summaryTitle}>Shrnutí</Text>
              <Text style={s.summaryItem}>👤 {username}</Text>
              <Text style={s.summaryItem}>📧 {email}</Text>
              <Text style={s.summaryItem}>🧑 {jmeno}</Text>
              <Text style={s.summaryItem}>🧺 {nazevFarmy}</Text>
              {lokaceDisplay && <Text style={s.summaryItem}>📍 {lokaceDisplay}</Text>}
            </View>

            <TouchableOpacity style={s.checkboxRow} onPress={() => setSouhlasGDPR(p => !p)}>
              <View style={[s.checkbox, souhlasGDPR && s.checkboxChecked]}>
                {souhlasGDPR && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkboxText}>
                Souhlasím se zpracováním osobních údajů v souladu s GDPR.{' '}
                <Text style={s.checkboxLink} onPress={() => router.push('/podminky')}>Zásady ochrany</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.checkboxRow} onPress={() => setSouhlasOdpovednost(p => !p)}>
              <View style={[s.checkbox, souhlasOdpovednost && s.checkboxChecked]}>
                {souhlasOdpovednost && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkboxText}>
                Prohlašuji, že nesu odpovědnost za nabízené produkty.{' '}
                <Text style={s.checkboxLink} onPress={() => router.push('/podminky')}>Obchodní podmínky</Text>
              </Text>
            </TouchableOpacity>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => setKrok(3)}>
                <Text style={s.btnSecondaryText}>← Zpět</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, s.btnFlex, loading && s.btnDisabled]}
                onPress={registrovat}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Text style={s.btnPrimaryText}>Zaregistrovat se ✓</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══ KROK 5: Úspěch ═════════════════════════════════ */}
        {krok === 5 && registrationSuccess && (
          <View style={{ alignItems: 'center' }}>
            <View style={s.successIcon}><Text style={{ fontSize: 40 }}>✉️</Text></View>
            <Text style={s.successTitle}>Zkontrolujte email!</Text>
            <Text style={s.successSubtitle}>
              Poslali jsme uvítací email na{'\n'}
              <Text style={{ color: '#4caf50', fontWeight: '700' }}>{email}</Text>
            </Text>

            <View style={s.stepsBox}>
              <Text style={s.stepsTitle}>Co teď?</Text>
              <Text style={s.stepItem}>1️⃣  Otevřete svůj email</Text>
              <Text style={s.stepItem}>2️⃣  Klikněte na odkaz „Ověřit email"</Text>
              <Text style={s.stepItem}>3️⃣  Přihlaste se a vyplňte profil farmy</Text>
            </View>

            <View style={s.credBox}>
              <Text style={s.credTitle}>Vaše přihlašovací údaje</Text>
              <Text style={s.credText}>
                Uživatelské jméno: <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{username}</Text>{'\n'}
                Heslo: které jste zadali při registraci
              </Text>
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={() => router.replace('/prihlaseni')}>
              <Text style={s.btnPrimaryText}>Mám ověřeno → Přihlásit se</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.resendBtn, (resendLoading || resendSent) && s.btnDisabled]}
              onPress={znoveOdeslatEmail}
              disabled={resendLoading || resendSent}
            >
              {resendLoading
                ? <ActivityIndicator size="small" color="#9ca3af" />
                : <Text style={s.resendText}>{resendSent ? '✓ Email odeslán' : 'Nedorazil email? Odeslat znovu'}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 48 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 48,
    width: '100%' as any, maxWidth: 440,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },

  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 20 },

  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  progressStep: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
  progressStepActive: { backgroundColor: '#4caf50' },

  stepIcon: {
    alignSelf: 'center', width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepIconText: { fontSize: 26 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  stepInfo: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  error: { fontSize: 12, color: '#dc2626', marginTop: 6 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#1a1a1a', backgroundColor: '#ffffff',
    outlineStyle: 'none' as any,
  },
  inputError: { borderColor: '#f87171' },

  passwordWrap: { position: 'relative' as any },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute' as any, right: 14, top: 14 },

  rulesBox: { marginTop: 10, marginBottom: 4, gap: 4 },
  rule: { fontSize: 12, color: '#9ca3af' },
  ruleOk: { color: '#4caf50', fontWeight: '600' },

  btnPrimary: {
    backgroundColor: '#4caf50', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
    width: '100%' as any,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, alignItems: 'center', minWidth: 100, backgroundColor: '#f9fafb',
  },
  btnSecondaryText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnFlex: { flex: 1, marginTop: 0 },

  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  loginLinkBold: { color: '#1a1a1a', fontWeight: '700' },

  summary: {
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, marginBottom: 20, gap: 6,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  summaryItem: { fontSize: 14, color: '#6b7280' },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: '#4caf50',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#4caf50' },
  checkMark: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  checkboxText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 20 },
  checkboxLink: { color: '#4caf50', fontWeight: '600', textDecorationLine: 'underline' },

  lokaceBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  lokaceBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9fafb',
  },
  lokaceBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  lokaceFound: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  lokaceFoundText: { color: '#166534', fontSize: 13, flex: 1 },
  lokaceFoundClose: { color: '#9ca3af', fontSize: 16, paddingLeft: 8 },

  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#166534', marginBottom: 8, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, textAlign: 'center', lineHeight: 22 },

  stepsBox: {
    backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 20, marginBottom: 16, width: '100%' as any, gap: 8,
  },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  stepItem: { fontSize: 14, color: '#6b7280', lineHeight: 22 },

  credBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0',
    padding: 16, marginBottom: 20, width: '100%' as any,
  },
  credTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 8 },
  credText: { fontSize: 13, color: '#374151', lineHeight: 20 },

  resendBtn: { marginTop: 14, padding: 12, alignItems: 'center' },
  resendText: { color: '#9ca3af', fontSize: 13, textDecorationLine: 'underline' },
});
