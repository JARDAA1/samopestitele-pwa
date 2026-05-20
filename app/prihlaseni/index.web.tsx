import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

export default function PrihlaseniWebScreen() {
  const { loginWithPin, isAuthenticated, authLevel } = useFarmarAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && authLevel === 'pin') {
      router.replace('/(tabs)/moje-prodejna');
    }
  }, [isAuthenticated, authLevel]);

  const handleLogin = async () => {
    setError('');
    if (!username.trim()) { setError('Zadejte uživatelské jméno'); return; }
    if (!password || password.length < 8) { setError('Heslo musí mít minimálně 8 znaků'); return; }

    setLoading(true);
    const result = await loginWithPin(username.trim(), password);
    setLoading(false);

    if (result.success) {
      setRemainingAttempts(null);
      router.replace('/(tabs)/moje-prodejna');
    } else {
      if (result.remainingAttempts !== undefined) setRemainingAttempts(result.remainingAttempts);
      setError(result.error || 'Nesprávné přihlašovací údaje');
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.card}>

        {/* Logo */}
        <Text style={s.logo}>🌿 Samopěstitelé</Text>
        <Text style={s.welcome}>Vítejte zpět</Text>

        {/* Varování pokusů */}
        {remainingAttempts !== null && remainingAttempts < 5 && (
          <View style={s.warningBox}>
            <Text style={s.warningTitle}>Zbývající pokusy: {remainingAttempts}</Text>
            <Text style={s.warningText}>Poté bude účet uzamčen na 15 minut.</Text>
          </View>
        )}

        {/* Chybová hláška */}
        {error ? <Text style={s.errorMsg}>{error}</Text> : null}

        {/* Pole: uživatelské jméno */}
        <Text style={s.label}>Uživatelské jméno</Text>
        <TextInput
          style={s.input}
          placeholder="vaše_jméno"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={(v) => { setUsername(v); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />

        {/* Pole: heslo */}
        <View style={s.labelRow}>
          <Text style={s.label}>Heslo</Text>
          <TouchableOpacity onPress={() => router.push('/zapomenute-udaje')}>
            <Text style={s.forgotLink}>Zapomenuté heslo?</Text>
          </TouchableOpacity>
        </View>
        <View style={s.passwordWrap}>
          <TextInput
            style={[s.input, s.passwordInput]}
            placeholder="Vaše heslo"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPassword}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(p => !p)}>
            <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tlačítko přihlásit */}
        <TouchableOpacity
          style={[s.btnPrimary, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Text style={s.btnPrimaryText}>Přihlásit se</Text>
          }
        </TouchableOpacity>

        {/* Oddělovač */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>nebo</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Odkaz registrace */}
        <TouchableOpacity onPress={() => router.push('/registrace')}>
          <Text style={s.registerLink}>
            Nemáte účet? <Text style={s.registerLinkBold}>Registrovat se</Text>
          </Text>
        </TouchableOpacity>

        {/* Odkaz pro zákazníky */}
        <TouchableOpacity style={s.customerLink} onPress={() => router.push('/mapa')}>
          <Text style={s.customerLinkText}>Hledáte čerstvé produkty? → Mapa farmářů</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 48 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 48,
    width: '100%' as any,
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  welcome: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32 },

  warningBox: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#f87171',
  },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#6b7280', lineHeight: 16 },

  errorMsg: { fontSize: 14, color: '#dc2626', marginBottom: 12, textAlign: 'center' },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 6 },
  forgotLink: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#1a1a1a',
    backgroundColor: '#ffffff', marginBottom: 0,
    outlineStyle: 'none' as any,
  },
  passwordWrap: { position: 'relative' as any, marginTop: 0, marginBottom: 0 },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute' as any, right: 14, top: 14 },
  eyeIcon: { fontSize: 18 },

  btnPrimary: {
    backgroundColor: '#4caf50', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  registerLink: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  registerLinkBold: { color: '#1a1a1a', fontWeight: '700' },

  customerLink: { marginTop: 16, alignItems: 'center' },
  customerLinkText: { fontSize: 13, color: '#4caf50', fontWeight: '500' },
});
