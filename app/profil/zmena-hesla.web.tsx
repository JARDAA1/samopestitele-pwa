import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { fetchHesloHash, updateHesloHash } from '@/features/profil/services/profilService';
import * as bcrypt from 'bcryptjs';

function validatePassword(p: string): string | null {
  if (p.length < 8) return 'Heslo musí mít alespoň 8 znaků';
  if (!/[A-Z]/.test(p)) return 'Heslo musí obsahovat alespoň jedno velké písmeno';
  if (!/[0-9]/.test(p)) return 'Heslo musí obsahovat alespoň jednu číslici';
  return null;
}

function ZmenaHeslaContent() {
  const { farmar } = useFarmarAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!farmar?.id) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Vyplňte všechna pole');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Nová hesla se neshodují');
      return;
    }
    const validationError = validatePassword(newPassword);
    if (validationError) { setErrorMsg(validationError); return; }

    setLoading(true);
    try {
      const currentHash = await fetchHesloHash(farmar.id);
      if (!currentHash) { setErrorMsg('Nepodařilo se ověřit heslo'); setLoading(false); return; }

      const isValid = await bcrypt.compare(currentPassword, currentHash);
      if (!isValid) { setErrorMsg('Současné heslo je nesprávné'); setLoading(false); return; }

      const newHash = await bcrypt.hash(newPassword, 12);
      await updateHesloHash(farmar.id, newHash);

      setSuccessMsg('Heslo bylo úspěšně změněno');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch {
      setErrorMsg('Nepodařilo se změnit heslo. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.push('/profil')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Změna hesla</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {successMsg ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓ {successMsg}</Text>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.iconCircle}><Text style={s.iconText}>🔐</Text></View>
            <View>
              <Text style={s.cardTitle}>Aktualizace hesla</Text>
              <Text style={s.cardSubtitle}>Pro přihlášení do Prodejny a Profilu</Text>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Současné heslo *</Text>
            <TextInput
              style={s.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Vaše současné heslo"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Nové heslo *</Text>
            <TextInput
              style={s.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Alespoň 8 znaků, velké písmeno a číslice"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Potvrzení nového hesla *</Text>
            <TextInput
              style={s.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Znovu zadejte nové heslo"
            />
          </View>

          <View style={s.requirementsBox}>
            <Text style={s.requirementsTitle}>Požadavky na heslo:</Text>
            <Text style={[s.req, newPassword.length >= 8 && s.reqOk]}>
              {newPassword.length >= 8 ? '✓' : '•'} Alespoň 8 znaků
            </Text>
            <Text style={[s.req, /[A-Z]/.test(newPassword) && s.reqOk]}>
              {/[A-Z]/.test(newPassword) ? '✓' : '•'} Jedno velké písmeno
            </Text>
            <Text style={[s.req, /[0-9]/.test(newPassword) && s.reqOk]}>
              {/[0-9]/.test(newPassword) ? '✓' : '•'} Jedna číslice
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, loading && s.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={s.saveBtnText}>Změnit heslo</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function ZmenaHeslaScreen() {
  return <ProtectedRoute><ZmenaHeslaContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 560 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 20, paddingBottom: 48,
  },

  successBanner: {
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#4caf50',
  },
  successText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
  },

  requirementsBox: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb', gap: 6,
  },
  requirementsTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  req: { fontSize: 13, color: '#9ca3af' },
  reqOk: { color: '#4caf50' },

  saveBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
