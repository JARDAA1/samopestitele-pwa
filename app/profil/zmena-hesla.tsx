import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { fetchHesloHash, updateHesloHash } from '@/features/profil/services/profilService';
import { validatePassword } from '../_utils/passwordValidation';
import { showAlert } from '../_utils/pinValidation';
import bcrypt from 'bcryptjs';

export default function ZmenaHeslaScreen() {
  const { farmar } = useFarmarAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword) { setError('Zadejte současné heslo'); return; }
    if (!newPassword) { setError('Zadejte nové heslo'); return; }

    const validationError = validatePassword(newPassword);
    if (validationError) { setError(validationError); return; }

    if (newPassword !== confirmPassword) { setError('Hesla se neshodují'); return; }
    if (currentPassword === newPassword) { setError('Nové heslo musí být odlišné od současného'); return; }

    setLoading(true);

    try {
      const hesloHash = await fetchHesloHash(farmar?.id!);
      if (!hesloHash) { setError('Nepodařilo se ověřit současné heslo'); return; }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, hesloHash);
      if (!isCurrentPasswordValid) { setError('Současné heslo není správné'); return; }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      try {
        await updateHesloHash(farmar?.id!, newHash);
      } catch {
        setError('Nepodařilo se změnit heslo');
        return;
      }

      showAlert('Heslo změněno', 'Vaše heslo bylo úspěšně změněno.');
      router.back();
    } catch (err: any) {
      console.error('Chyba při změně hesla:', err);
      setError('Nastala neočekávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Změna hesla</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          <Text style={styles.title}>Změna hesla</Text>
          <Text style={styles.subtitle}>
            Pro změnu hesla zadejte současné heslo a poté nové heslo.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Současné heslo</Text>
          <TextInput
            style={styles.input}
            placeholder="Zadejte současné heslo"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Nové heslo</Text>
          <TextInput
            style={styles.input}
            placeholder="Zadejte nové heslo"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Potvrzení nového hesla</Text>
          <TextInput
            style={styles.input}
            placeholder="Zadejte nové heslo znovu"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Požadavky na heslo:</Text>
            <Text style={styles.requirementsText}>• Minimálně 8 znaků</Text>
            <Text style={styles.requirementsText}>• Alespoň jedno velké písmeno</Text>
            <Text style={styles.requirementsText}>• Alespoň jedna číslice</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Ukládám...' : 'Změnit heslo'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 44, paddingBottom: 8, paddingHorizontal: 12,
    backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 6 },
  backIcon: { fontSize: 22, color: '#ffffff', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 40 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    alignSelf: 'center', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.3)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  iconText: { fontSize: 28 },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  errorBox: {
    backgroundColor: 'rgba(244,67,54,0.2)', padding: 12, borderRadius: 8,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#ef9a9a',
  },
  errorText: { fontSize: 13, color: '#ef9a9a' },
  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12, color: '#ffffff',
  },
  requirementsBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8,
    marginTop: 8, marginBottom: 20,
  },
  requirementsTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  requirementsText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  primaryButton: { backgroundColor: '#FF9800', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
