import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

export default function StankyLoginScreen() {
  const { loginWithPin, isAuthenticated, authLevel } = useFarmarAuth();

  const [farmNumber, setFarmNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && authLevel === 'pin') {
      router.replace('/(tabs)/moje-stanky');
    }
  }, [isAuthenticated, authLevel]);

  const handlePinLogin = async () => {
    if (!farmNumber.trim()) {
      alert('Zadejte číslo farmy');
      return;
    }

    if (pin.length < 4 || !/^\d+$/.test(pin)) {
      alert('Zadejte platný PIN (min. 4 číslice)');
      return;
    }

    setLoading(true);
    const result = await loginWithPin(farmNumber, pin);
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)/moje-stanky');
    } else {
      alert(result.error || 'Nesprávné číslo farmy nebo PIN');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje stánky - Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/images/stanek-icon.png')}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Přihlášení PIN kódem</Text>
          <Text style={styles.subtitle}>
            Spravujte své stánky na trzích - flexibilně, dnes tady, zítra jinde
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Bezpečný přístup</Text>
            <Text style={styles.infoText}>
              Číslo farmy + PIN kód. Správa stánků, fotografie a lokace.
            </Text>
          </View>

          <Text style={styles.label}>Číslo farmy</Text>
          <TextInput
            style={styles.input}
            placeholder="Vaše číslo farmy"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={farmNumber}
            onChangeText={(text) => setFarmNumber(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={4}
            autoFocus
          />

          <Text style={styles.label}>PIN kód (min. 4 číslice)</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={12}
            onSubmitEditing={handlePinLogin}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handlePinLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Přihlásit se</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/zapomenute-udaje')}
          >
            <Text style={styles.forgotLinkText}>Zapomenuté údaje?</Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Co jsou Moje stánky?</Text>
            <Text style={styles.helpText}>
              Evidujte své stánky na farmářských trzích:{'\n'}
              • Název a popis stánku{'\n'}
              • Umístění (město, ulice){'\n'}
              • Fotografie stánku{'\n'}
              • Časy otevření (dny a hodiny)
            </Text>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Používáte stejné číslo farmy a PIN jako pro Prodejnu.{'\n\n'}
              Číslo farmy najdete ve svém Profilu po přihlášení emailem.
            </Text>
          </View>
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
  iconImage: { width: 160, height: 160 },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)', padding: 14, borderRadius: 10,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#FF9800', marginBottom: 4 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12, color: '#ffffff',
  },
  pinInput: { fontSize: 20, textAlign: 'center', letterSpacing: 6, fontWeight: '700' },
  primaryButton: { backgroundColor: '#FF9800', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  forgotLink: { padding: 12, alignItems: 'center' },
  forgotLinkText: { color: '#FF9800', fontSize: 14, fontWeight: '600' },
  helpBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 10, marginTop: 16 },
  helpTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  helpText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  noteBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, marginTop: 12 },
  noteText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 16 },
});
