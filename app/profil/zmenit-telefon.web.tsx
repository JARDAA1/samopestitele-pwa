import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import {
  checkTelefonExists,
  updateTelefon,
} from '@/features/profil/services/profilService';

function formatPhone(input: string): string {
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.startsWith('420')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+420${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `+420${cleaned}`;
  return cleaned.startsWith('+') ? input : `+${cleaned}`;
}

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, '');
  if (!cleaned) return 'Zadejte telefonní číslo';
  if (!/^\+420\d{9}$/.test(cleaned)) return 'Neplatný formát. Použijte 9 číslic nebo +420XXXXXXXXX';
  return null;
}

function ZmenitTelefonContent() {
  const { farmar, updateFarmarData } = useFarmarAuth() as any;
  const [telefon, setTelefon] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (farmar?.telefon) setTelefon(farmar.telefon);
  }, [farmar?.telefon]);

  const handleSave = async () => {
    if (!farmar?.id) return;
    setErrorMsg('');
    setSuccessMsg('');

    const formatted = formatPhone(telefon);
    const validErr = validatePhone(formatted);
    if (validErr) { setErrorMsg(validErr); return; }

    setLoading(true);
    try {
      const exists = await checkTelefonExists(formatted);
      if (exists) { setErrorMsg('Toto telefonní číslo je již registrováno'); setLoading(false); return; }

      await updateTelefon(farmar.id, formatted);
      if (updateFarmarData) await updateFarmarData({ telefon: formatted });

      setSuccessMsg('Telefonní číslo bylo úspěšně změněno');
      setTelefon(formatted);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch {
      setErrorMsg('Nepodařilo se změnit telefonní číslo');
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
        <Text style={s.pageTitle}>Změna telefonního čísla</Text>
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
            <View style={s.iconCircle}><Text style={s.iconText}>📱</Text></View>
            <View>
              <Text style={s.cardTitle}>Telefonní číslo</Text>
              <Text style={s.cardSubtitle}>Pro přihlášení do Prodejny a komunikaci se zákazníky</Text>
            </View>
          </View>

          {farmar?.telefon && (
            <View style={s.currentBox}>
              <Text style={s.currentLabel}>Současné číslo:</Text>
              <Text style={s.currentValue}>{farmar.telefon}</Text>
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Nové telefonní číslo *</Text>
            <TextInput
              style={s.input}
              value={telefon}
              onChangeText={setTelefon}
              placeholder="+420 123 456 789"
              keyboardType="phone-pad"
            />
            <Text style={s.inputHint}>Zadejte 9 číslic nebo ve formátu +420XXXXXXXXX</Text>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoTitle}>ℹ️ Informace</Text>
            <Text style={s.infoText}>
              Toto číslo budete používat pro přihlášení do Prodejny.
              Po změně použijte nové číslo při dalším přihlášení.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, loading && s.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : (
            <Text style={s.saveBtnText}>Změnit telefonní číslo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function ZmenitTelefonScreen() {
  return <ProtectedRoute><ZmenitTelefonContent /></ProtectedRoute>;
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  currentBox: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  currentLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  currentValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
  },
  inputHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },

  infoBox: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1d4ed8', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 20 },

  saveBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
