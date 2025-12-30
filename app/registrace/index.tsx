import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { odeslatOverovaciKod, overitSMSKod, existujeFarmar } from '../utils/smsAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegistraceScreen() {
  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);

  // KROK 1: Telefon
  const [telefon, setTelefon] = useState('');

  // KROK 2: SMS Kód
  const [smsKod, setSmsKod] = useState('');
  const [odeslanyKod, setOdeslanyKod] = useState(''); // Pro testování

  // KROK 3: Základní informace
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');
  const [mesto, setMesto] = useState('');
  const [email, setEmail] = useState('');

  // KROK 4: Souhlas
  const [souhlas, setSouhlas] = useState(false);

  /**
   * KROK 1: Odeslat SMS kód
   */
  const odeslatKod = async () => {
    // Validace telefonu
    const cleanPhone = telefon.trim();
    if (!cleanPhone.match(/^\+420\d{9}$/)) {
      Alert.alert('Chyba', 'Zadejte platný telefon ve formátu +420xxxxxxxxx');
      return;
    }

    setLoading(true);
    try {
      // Zkontroluj, jestli farmář už neexistuje
      const existuje = await existujeFarmar(cleanPhone);
      if (existuje) {
        Alert.alert(
          'Účet již existuje',
          'Tento telefon je již zaregistrován. Chcete se přihlásit?',
          [
            { text: 'Zrušit', style: 'cancel' },
            { text: 'Přihlásit se', onPress: () => router.replace('/moje-farma') }
          ]
        );
        setLoading(false);
        return;
      }

      // Odešli SMS kód
      const result = await odeslatOverovaciKod(cleanPhone, 'registrace');

      if (!result.success) {
        Alert.alert('Chyba', result.error || 'Nepodařilo se odeslat SMS');
        setLoading(false);
        return;
      }

      // PRO TESTOVÁNÍ: Ukážeme kód v alertu (v produkci SMAZAT!)
      if (result.kod) {
        setOdeslanyKod(result.kod);
        Alert.alert(
          'SMS odeslána ✓',
          `Testovací režim: Váš kód je ${result.kod}\n\nV produkci dostanete SMS.`,
          [{ text: 'OK', onPress: () => setKrok(2) }]
        );
      } else {
        Alert.alert('SMS odeslána ✓', 'Zadejte kód z SMS zprávy', [
          { text: 'OK', onPress: () => setKrok(2) }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se odeslat SMS');
    } finally {
      setLoading(false);
    }
  };

  /**
   * KROK 2: Ověřit SMS kód
   */
  const overitKod = async () => {
    if (smsKod.length !== 4) {
      Alert.alert('Chyba', 'Zadejte 4-místný kód');
      return;
    }

    setLoading(true);
    try {
      const result = await overitSMSKod(telefon, smsKod);

      if (!result.valid) {
        Alert.alert('Chyba', result.error || 'Neplatný kód');
        setLoading(false);
        return;
      }

      // Kód je validní, pokračujeme na další krok
      setKrok(3);
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se ověřit kód');
    } finally {
      setLoading(false);
    }
  };

  /**
   * KROK 3: Validace základních informací
   */
  const validovatInfo = () => {
    if (!jmeno.trim()) {
      Alert.alert('Chyba', 'Zadejte vaše jméno');
      return;
    }
    if (!nazevFarmy.trim()) {
      Alert.alert('Chyba', 'Zadejte název farmy');
      return;
    }
    if (!mesto.trim()) {
      Alert.alert('Chyba', 'Zadejte město nebo obec');
      return;
    }

    setKrok(4);
  };

  /**
   * KROK 4: Dokončení registrace
   */
  const registrovat = async () => {
    if (!souhlas) {
      Alert.alert('Chyba', 'Musíte souhlasit se zpracováním údajů');
      return;
    }

    setLoading(true);
    try {
      // Vložit do Supabase (БEZ hesla!)
      const { data, error } = await supabase
        .from('pestitele')
        .insert({
          telefon: telefon,
          jmeno: jmeno,
          nazev: nazevFarmy, // Název farmáře/farmy
          nazev_farmy: nazevFarmy, // Stejné jako nazev (pro kompatibilitu)
          mesto: mesto,
          email: email || null,
          gps_lat: 0, // Doplníme později
          gps_lng: 0, // Doplníme později
          // ŽÁDNÉ heslo_hash! 🎉
        })
        .select()
        .single();

      if (error) throw error;

      // Uložit telefon do AsyncStorage pro automatické přihlášení
      await AsyncStorage.setItem('pestitel_telefon', telefon);
      if (data?.id) {
        await AsyncStorage.setItem('pestitel_id', data.id.toString());
      }

      Alert.alert(
        'Úspěch! 🎉',
        'Váš účet byl vytvořen. Nyní můžete spravovat svou farmu.',
        [{
          text: 'Pokračovat',
          onPress: () => router.replace('/(tabs)/moje-farma')
        }]
      );
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Chyba', 'Tento telefon je již zaregistrován');
      } else {
        Alert.alert('Chyba', error.message || 'Nepodařilo se vytvořit účet');
      }
      console.error('Registrace error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => krok > 1 ? setKrok(krok - 1) : router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrace pěstitele</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, krok >= 1 && styles.progressStepActive]} />
        <View style={[styles.progressStep, krok >= 2 && styles.progressStepActive]} />
        <View style={[styles.progressStep, krok >= 3 && styles.progressStepActive]} />
        <View style={[styles.progressStep, krok >= 4 && styles.progressStepActive]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* KROK 1: Zadání telefonu */}
        {krok === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>📱 Váš telefon</Text>
            <Text style={styles.stepSubtitle}>Krok 1 ze 4</Text>
            <Text style={styles.infoText}>
              Zadejte telefonní číslo. Pošleme vám SMS s ověřovacím kódem.
            </Text>

            <Text style={styles.label}>Telefonní číslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="+420777123456"
              value={telefon}
              onChangeText={setTelefon}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={odeslatKod}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Odesílám SMS...' : 'Odeslat SMS kód →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Ověření SMS kódu */}
        {krok === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🔐 Ověřovací kód</Text>
            <Text style={styles.stepSubtitle}>Krok 2 ze 4</Text>
            <Text style={styles.infoText}>
              Zadejte 4-místný kód, který jsme vám poslali na číslo {telefon}
            </Text>

            {/* PRO TESTOVÁNÍ - v produkci SMAZAT */}
            {odeslanyKod && (
              <View style={styles.testBox}>
                <Text style={styles.testText}>🧪 TESTOVACÍ REŽIM</Text>
                <Text style={styles.testCode}>Váš kód: {odeslanyKod}</Text>
              </View>
            )}

            <Text style={styles.label}>SMS kód *</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              placeholder="1234"
              value={smsKod}
              onChangeText={setSmsKod}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(1)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={overitKod}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Ověřuji...' : 'Ověřit kód →'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={odeslatKod} style={styles.resendButton}>
              <Text style={styles.resendText}>Odeslat kód znovu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 3: Základní informace */}
        {krok === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🌾 O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok 3 ze 4</Text>
            <Text style={styles.infoText}>
              Pár základních informací, aby vás zákazníci mohli najít.
            </Text>

            <Text style={styles.label}>Vaše jméno *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Jan Novák"
              value={jmeno}
              onChangeText={setJmeno}
              autoFocus
            />

            <Text style={styles.label}>Název farmy *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Farma U Nováků"
              value={nazevFarmy}
              onChangeText={setNazevFarmy}
            />

            <Text style={styles.label}>Město/Obec *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Ostrava"
              value={mesto}
              onChangeText={setMesto}
            />

            <Text style={styles.label}>Email (nepovinné)</Text>
            <TextInput
              style={styles.input}
              placeholder="vase@email.cz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(2)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }]}
                onPress={validovatInfo}
              >
                <Text style={styles.buttonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 4: Shrnutí a souhlas */}
        {krok === 4 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>✓ Dokončení</Text>
            <Text style={styles.stepSubtitle}>Krok 4 ze 4</Text>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Shrnutí:</Text>
              <Text style={styles.summaryItem}>👤 {jmeno}</Text>
              <Text style={styles.summaryItem}>📱 {telefon}</Text>
              <Text style={styles.summaryItem}>🌾 {nazevFarmy}</Text>
              <Text style={styles.summaryItem}>📍 {mesto}</Text>
              {email && <Text style={styles.summaryItem}>📧 {email}</Text>}
            </View>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setSouhlas(!souhlas)}
            >
              <View style={[styles.checkboxBox, souhlas && styles.checkboxBoxChecked]}>
                {souhlas && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Souhlasím se zpracováním osobních údajů pro účely této aplikace (jméno, telefon, email, adresa farmy)
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(3)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={registrovat}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Registruji...' : 'Zaregistrovat se ✓'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: { marginRight: 15 },
  backButtonText: { fontSize: 16, color: '#4CAF50', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20, gap: 10 },
  progressStep: { flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  progressStepActive: { backgroundColor: '#4CAF50' },
  content: { padding: 20 },
  step: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 5 },
  stepSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  infoText: { fontSize: 15, color: '#666', marginBottom: 25, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  inputCode: {
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 10,
    fontWeight: 'bold'
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 30 },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#666', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  resendButton: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  summary: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2E7D32' },
  summaryItem: { fontSize: 15, marginBottom: 5, color: '#333' },
  checkbox: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBoxChecked: { backgroundColor: '#4CAF50' },
  checkboxCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  checkboxText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 18 },
  testBox: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFA000',
    borderWidth: 2,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  testText: { fontSize: 12, fontWeight: 'bold', color: '#FF6F00', marginBottom: 5 },
  testCode: { fontSize: 24, fontWeight: 'bold', color: '#FF6F00' },
});
