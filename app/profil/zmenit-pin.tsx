import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { validatePin, showAlert } from '../_utils/pinValidation';
import bcrypt from 'bcryptjs';

export default function ZmenitPinScreen() {
  const { createPin, farmar } = useFarmarAuth();

  const [starycPin, setStarycPin] = useState('');
  const [novyPin, setNovyPin] = useState('');
  const [novyPinPotvrzeni, setNovyPinPotvrzeni] = useState('');
  const [loading, setLoading] = useState(false);

  const handleZmenitPin = async () => {
    if (starycPin.length < 4) {
      showAlert('Chyba', 'Starý PIN musí mít minimálně 4 číslice');
      return;
    }

    // Bezpečné ověření starého PINu přes bcrypt
    if (!farmar?.heslo_hash) {
      showAlert('Chyba', 'Nelze ověřit starý PIN');
      return;
    }
    const isValid = await bcrypt.compare(starycPin, farmar.heslo_hash);
    if (!isValid) {
      showAlert('Chyba', 'Starý PIN není správný');
      return;
    }

    const pinError = validatePin(novyPin);
    if (pinError) {
      showAlert('Chyba', pinError);
      return;
    }

    if (novyPin !== novyPinPotvrzeni) {
      showAlert('Chyba', 'Nové PINy se neshodují');
      return;
    }

    if (novyPin === starycPin) {
      showAlert('Chyba', 'Nový PIN musí být jiný než starý PIN');
      return;
    }

    setLoading(true);
    const result = await createPin(novyPin);
    setLoading(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        alert('PIN byl úspěšně změněn!');
        router.back();
      } else {
        Alert.alert('Hotovo!', 'PIN byl úspěšně změněn!', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } else {
      showAlert('Chyba', result.error || 'Nepodařilo se změnit PIN');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Změnit PIN</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>Změna PIN kódu</Text>
          <Text style={styles.subtitle}>
            Změňte svůj PIN kód pro přihlášení do Prodejny
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📱 Váš účet</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Číslo farmy:</Text> {farmar?.farm_number || 'Nenačteno'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Jméno:</Text> {farmar?.jmeno}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Farma:</Text> {farmar?.nazev_farmy}
            </Text>
          </View>

          <Text style={styles.label}>Starý PIN (min. 4 číslice)</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={starycPin}
            onChangeText={setStarycPin}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
            autoFocus
          />

          <Text style={styles.label}>Nový PIN (min. 4 číslice)</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={novyPin}
            onChangeText={setNovyPin}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
          />

          <Text style={styles.label}>Potvrďte nový PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={novyPinPotvrzeni}
            onChangeText={setNovyPinPotvrzeni}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
            onSubmitEditing={handleZmenitPin}
          />

          <TouchableOpacity
            style={[styles.changeButton, loading && styles.changeButtonDisabled]}
            onPress={handleZmenitPin}
            disabled={loading}
          >
            <Text style={styles.changeButtonText}>
              {loading ? 'Měním...' : 'Změnit PIN'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 Pravidla pro PIN</Text>
            <Text style={styles.helpText}>
              • Minimálně 4 číslice{'\n'}
              • Nesmí být jednoduché postupnosti{'\n'}
              • Nesmí obsahovat pouze stejné číslice{'\n'}
              • Používá se společně s číslem farmy pro přihlášení
            </Text>
          </View>

          <View style={styles.securityBox}>
            <Text style={styles.securityText}>
              🔒 Pro přihlášení do Prodejny použijte číslo farmy ({farmar?.farm_number}) + PIN kód. Pro plný přístup k Profilu použijte email.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 44, paddingBottom: 8, paddingHorizontal: 12,
    backgroundColor: '#1a3a1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 6 },
  backIcon: { fontSize: 22, color: '#ffffff', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 40 },
  content: { flex: 1, padding: 12, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    alignSelf: 'center', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.3)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 10,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#FF9800', marginBottom: 8 },
  infoText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4, lineHeight: 18 },
  infoLabel: { fontWeight: '600', color: '#ffffff' },
  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginTop: 8 },
  pinInput: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14,
    fontSize: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12, textAlign: 'center', letterSpacing: 8, fontWeight: '700', color: '#ffffff',
  },
  changeButton: { backgroundColor: '#FF9800', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  changeButtonDisabled: { opacity: 0.6 },
  changeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  helpBox: {
    backgroundColor: 'rgba(255,152,0,0.2)', padding: 14, borderRadius: 10,
    marginTop: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  helpTitle: { fontSize: 13, fontWeight: '600', color: '#FF9800', marginBottom: 6 },
  helpText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  securityBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, marginTop: 16 },
  securityText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 16, textAlign: 'center' },
});
