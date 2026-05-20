import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

export default function ZapomenuteUdajeScreen() {
  const { sendMagicLink } = useFarmarAuth() as any;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setErrorMsg('Zadejte e-mailovou adresu'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Zadejte platnou e-mailovou adresu');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await sendMagicLink(email.trim(), 'recovery');
      setEmailSent(true);
    } catch (e: any) {
      setErrorMsg('Nepodařilo se odeslat e-mail. Zkontrolujte adresu a zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      {/* Minimální header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.push('/prihlaseni')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět na přihlášení</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {emailSent ? (
            <>
              <View style={s.successIcon}><Text style={s.successIconText}>✉️</Text></View>
              <Text style={s.cardTitle}>E-mail odeslán!</Text>
              <Text style={s.cardSubtitle}>
                Zaslali jsme vám odkaz pro obnovení přístupu na adresu:
              </Text>
              <Text style={s.emailHighlight}>{email}</Text>
              <Text style={s.hint}>
                Zkontrolujte schránku a složku nevyžádané pošty. Odkaz je platný 24 hodin.
              </Text>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setEmailSent(false)}>
                <Text style={s.secondaryBtnText}>Odeslat znovu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/prihlaseni')}>
                <Text style={s.linkBtnText}>← Zpět na přihlášení</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.headerRow}>
                <Text style={s.logo}>🌿</Text>
                <Text style={s.logoText}>Samopestitele</Text>
              </View>
              <Text style={s.cardTitle}>Zapomenuté přihlašovací údaje</Text>
              <Text style={s.cardSubtitle}>
                Zadejte e-mailovou adresu spojenou s vaším účtem. Zašleme vám odkaz pro obnovení přístupu.
              </Text>

              {errorMsg ? (
                <View style={s.errorBanner}>
                  <Text style={s.errorText}>⚠️ {errorMsg}</Text>
                </View>
              ) : null}

              <View style={s.inputGroup}>
                <Text style={s.label}>E-mailová adresa</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vas@email.cz"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[s.sendBtn, loading && s.btnDisabled]}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#ffffff" /> : (
                  <Text style={s.sendBtnText}>Odeslat odkaz pro obnovení</Text>
                )}
              </TouchableOpacity>

              <View style={s.divider} />

              <View style={s.infoBox}>
                <Text style={s.infoTitle}>Co bude obsahovat e-mail?</Text>
                <Text style={s.infoItem}>• Odkaz pro nastavení nového hesla</Text>
                <Text style={s.infoItem}>• Informace o vašem kódu farmy</Text>
                <Text style={s.infoItem}>• Odkaz vyprší po 24 hodinách</Text>
              </View>

              <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/prihlaseni')}>
                <Text style={s.linkBtnText}>← Zpět na přihlášení</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: {
    backgroundColor: '#ffffff', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: {},
  backBtnText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  container: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, paddingVertical: 48,
  },

  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 40,
    width: '100%' as any, maxWidth: 460 as any,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    alignItems: 'center',
  },

  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: { fontSize: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logo: { fontSize: 32 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },

  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 10 },
  cardSubtitle: {
    fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22,
    marginBottom: 24, width: '100%' as any,
  },
  emailHighlight: {
    fontSize: 16, fontWeight: '700', color: '#4caf50', marginBottom: 12, textAlign: 'center',
  },
  hint: {
    fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },

  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 16,
    width: '100%' as any, borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  inputGroup: { width: '100%' as any, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
    width: '100%' as any,
  },

  sendBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', width: '100%' as any,
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 20,
  },
  sendBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  divider: { height: 1, backgroundColor: '#e5e7eb', width: '100%' as any, marginBottom: 20 },

  infoBox: { width: '100%' as any, marginBottom: 20 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  infoItem: { fontSize: 13, color: '#6b7280', lineHeight: 22 },

  secondaryBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24,
    alignItems: 'center', marginBottom: 16, width: '100%' as any,
  },
  secondaryBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  linkBtn: { paddingVertical: 8 },
  linkBtnText: { color: '#4caf50', fontSize: 14, fontWeight: '600' },
});
