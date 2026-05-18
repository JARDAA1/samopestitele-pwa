import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { validatePin, showAlert } from '../_utils/pinValidation';

export default function VytvoritPinScreen() {
  const { createPin, farmar } = useFarmarAuth();

  const [pin, setPin] = useState('');
  const [pinPotvrzeni, setPinPotvrzeni] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVytvoritPin = async () => {
    const pinError = validatePin(pin);
    if (pinError) {
      showAlert('Chyba', pinError);
      return;
    }

    if (pin !== pinPotvrzeni) {
      showAlert('Chyba', 'PINy se neshodují');
      return;
    }

    setLoading(true);
    const result = await createPin(pin);
    setLoading(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        alert('PIN byl úspěšně vytvořen! Nyní se můžete přihlašovat do Prodejny pomocí PINu.');
        router.replace('/muj-profil');
      } else {
        Alert.alert(
          'Hotovo!',
          'PIN byl úspěšně vytvořen! Nyní se můžete přihlašovat do Prodejny pomocí PINu.',
          [{ text: 'OK', onPress: () => router.replace('/muj-profil') }]
        );
      }
    } else {
      showAlert('Chyba', result.error || 'Nepodařilo se vytvořit PIN');
    }
  };

  const handlePreskocit = () => {
    if (Platform.OS === 'web') {
      const confirmed = confirm('Opravdu chcete přeskočit vytvoření PINu? Budete se muset vždy přihlašovat emailem.');
      if (confirmed) router.replace('/muj-profil');
    } else {
      Alert.alert(
        'Přeskočit vytvoření PINu?',
        'Opravdu chcete přeskočit vytvoření PINu? Budete se muset vždy přihlašovat emailem.',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Přeskočit', onPress: () => router.replace('/muj-profil') }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Vytvořit PIN</Text>
        <TouchableOpacity onPress={handlePreskocit} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Přeskočit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>Vytvořte si PIN pro rychlý přístup</Text>
          <Text style={styles.subtitle}>
            PIN vám umožní rychle se přihlásit do Prodejny bez nutnosti zadávat email
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📱 Vaše údaje</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Číslo farmy:</Text> {farmar?.farm_number || 'Nenačteno'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Jméno:</Text> {farmar?.jmeno}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Farma:</Text> {farmar?.nazev_farmy}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Telefon:</Text> {farmar?.telefon}
            </Text>
          </View>

          <Text style={styles.label}>Zadejte PIN (min. 4 číslice)</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
            autoFocus
          />

          <Text style={styles.label}>Potvrďte PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={pinPotvrzeni}
            onChangeText={setPinPotvrzeni}
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
            onSubmitEditing={handleVytvoritPin}
          />

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleVytvoritPin}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Vytvářím...' : 'Vytvořit PIN'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 K čemu slouží PIN?</Text>
            <Text style={styles.helpText}>
              • Rychlé přihlášení do Prodejny pomocí čísla farmy + PIN{'\n'}
              • Vaše číslo farmy: <Text style={styles.farmNumberHighlight}>{farmar?.farm_number || 'Načítá se...'}</Text>{'\n'}
              • Zůstanete přihlášeni do manuálního odhlášení{'\n'}
              • Umožňuje spravovat produkty, objednávky a zákazníky{'\n'}
              • PIN nesmí být jednoduché postupnosti nebo opakující se číslice
            </Text>
          </View>

          <View style={styles.securityBox}>
            <Text style={styles.securityText}>
              🔒 PIN používejte společně s číslem farmy ({farmar?.farm_number}) pro přihlášení. Pro plný přístup k Profilu použijte email.
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
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 15,
    backgroundColor: '#1a3a1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 80 },
  skipButton: { padding: 8 },
  skipButtonText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
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
  createButton: { backgroundColor: '#FF9800', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  helpBox: {
    backgroundColor: 'rgba(255,152,0,0.2)', padding: 14, borderRadius: 10,
    marginTop: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  helpTitle: { fontSize: 13, fontWeight: '600', color: '#FF9800', marginBottom: 6 },
  helpText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  farmNumberHighlight: { fontWeight: '700', color: '#FF9800', fontSize: 12 },
  securityBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, marginTop: 16 },
  securityText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 16, textAlign: 'center' },
});
