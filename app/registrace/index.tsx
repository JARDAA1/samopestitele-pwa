import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function RegistraceScreen() {
  const { register, sendSMSCode } = useFarmarAuth();

  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);

  // KROK 1: Telefon
  const [telefon, setTelefon] = useState('');

  // KROK 2: SMS Kód (pouze pro native)
  const [smsKod, setSmsKod] = useState('');

  // KROK 3: Základní informace
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');
  const [mesto, setMesto] = useState('');
  const [email, setEmail] = useState('');

  // KROK 4: PIN
  const [pin, setPin] = useState('');
  const [pinPotvrdit, setPinPotvrdit] = useState('');

  // KROK 5: Souhlas
  const [souhlas, setSouhlas] = useState(false);

  /**
   * KROK 1: Odeslat SMS kód / Pokračovat na web
   */
  const odeslatKod = async () => {
    // Validace a normalizace telefonu
    let cleanPhone = telefon.trim().replace(/\s/g, ''); // Odstranit mezery

    // Pokud nezačíná +420, přidáme předvolbu
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+420' + cleanPhone;
    }

    // Validace formátu
    if (!cleanPhone.match(/^\+420\d{9}$/)) {
      Alert.alert('Chyba', 'Zadejte platné české telefonní číslo (9 číslic)');
      return;
    }

    // Uložíme normalizované číslo zpět do state
    setTelefon(cleanPhone);

    // Na webu přeskočíme SMS ověření
    if (Platform.OS === 'web') {
      setKrok(3); // Přeskočíme přímo na základní informace (krok 3)
      return;
    }

    // Na native zařízení odešleme SMS
    setLoading(true);
    const success = await sendSMSCode(cleanPhone);
    setLoading(false);

    if (success) {
      Alert.alert(
        'SMS odeslána ✓',
        'Zadejte kód z SMS zprávy (pro testování použijte libovolných 6 číslic)',
        [{ text: 'OK', onPress: () => setKrok(2) }]
      );
    } else {
      Alert.alert('Chyba', 'Nepodařilo se odeslat SMS kód');
    }
  };

  /**
   * KROK 2: Ověřit SMS kód (pouze pro native, na webu přeskočeno)
   */
  const overitKod = async () => {
    if (smsKod.length !== 6) {
      Alert.alert('Chyba', 'Zadejte 6-místný kód');
      return;
    }

    // Prozatím přijmeme jakýkoliv 6-místný kód (mock pro testování)
    // V produkci by tady bylo: await verifyPhone(telefon, smsKod)
    setKrok(3);
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
    // Email je nepovinný, ale pokud je zadán, validujeme
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Chyba', 'Zadejte platný email nebo pole nechte prázdné');
      return;
    }

    setKrok(4);
  };

  /**
   * KROK 4: Vytvoření PIN kódu
   */
  const validovatPin = () => {
    if (pin.length < 4 || pin.length > 6) {
      Alert.alert('Chyba', 'PIN musí mít 4-6 číslic');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      Alert.alert('Chyba', 'PIN musí obsahovat pouze číslice');
      return;
    }

    if (pin !== pinPotvrdit) {
      Alert.alert('Chyba', 'PIN kódy se neshodují');
      return;
    }

    setKrok(5);
  };

  /**
   * KROK 5: Dokončení registrace
   */
  const registrovat = async () => {
    if (!souhlas) {
      Alert.alert('Chyba', 'Musíte souhlasit se zpracováním údajů');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        telefon,
        nazev_farmy: nazevFarmy,
        jmeno,
        email: email || undefined,
        pin,
      });

      if (result.success) {
        Alert.alert(
          'Úspěch! 🎉',
          'Váš účet byl vytvořen. Nyní můžete spravovat svou farmu.',
          [{
            text: 'Pokračovat',
            onPress: () => router.replace('/(tabs)/moje-farma')
          }]
        );
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se vytvořit účet');
      }
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se vytvořit účet');
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
        {Platform.OS !== 'web' && <View style={[styles.progressStep, krok >= 2 && styles.progressStepActive]} />}
        <View style={[styles.progressStep, krok >= 3 && styles.progressStepActive]} />
        <View style={[styles.progressStep, krok >= 4 && styles.progressStepActive]} />
        <View style={[styles.progressStep, krok >= 5 && styles.progressStepActive]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* KROK 1: Zadání telefonu */}
        {krok === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>📱 Váš telefon</Text>
            <Text style={styles.stepSubtitle}>Krok 1 z {Platform.OS === 'web' ? '4' : '5'}</Text>
            <Text style={styles.infoText}>
              {Platform.OS === 'web'
                ? 'Zadejte telefonní číslo. Budete moci spravovat svou farmu.'
                : 'Zadejte telefonní číslo. Pošleme vám SMS s ověřovacím kódem.'}
            </Text>

            <Text style={styles.label}>Telefonní číslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="777123456 nebo +420777123456"
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
                {loading ? 'Odesílám SMS...' : (Platform.OS === 'web' ? 'Pokračovat →' : 'Odeslat SMS kód →')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Ověření SMS kódu (pouze na native) */}
        {krok === 2 && Platform.OS !== 'web' && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🔐 Ověřovací kód</Text>
            <Text style={styles.stepSubtitle}>Krok 2 z 5</Text>
            <Text style={styles.infoText}>
              Zadejte 6-místný kód, který jsme vám poslali na číslo {telefon}
            </Text>

            <Text style={styles.infoText} style={{ color: '#FF6F00', marginTop: 10 }}>
              🧪 Pro testování použijte libovolných 6 číslic
            </Text>

            <Text style={styles.label}>SMS kód *</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              placeholder="123456"
              value={smsKod}
              onChangeText={setSmsKod}
              keyboardType="number-pad"
              maxLength={6}
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

        {/* KROK 3: Základní informace (krok 2 na webu, krok 3 na native) */}
        {krok === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🌾 O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok {Platform.OS === 'web' ? '2' : '3'} z {Platform.OS === 'web' ? '4' : '5'}</Text>
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
                onPress={() => setKrok(Platform.OS === 'web' ? 1 : 2)}
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

        {/* KROK 4: Vytvoření PIN kódu */}
        {krok === 4 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🔐 Vytvořte PIN kód</Text>
            <Text style={styles.stepSubtitle}>Krok {Platform.OS === 'web' ? '3' : '4'} z {Platform.OS === 'web' ? '4' : '5'}</Text>
            <Text style={styles.infoText}>
              PIN slouží pro rychlé přihlášení do sekce Moje Prodejna a Moje Stánky.
            </Text>

            <Text style={styles.label}>PIN kód (4-6 číslic) *</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              placeholder="••••"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
            />

            <Text style={styles.label}>Potvrďte PIN *</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              placeholder="••••"
              value={pinPotvrdit}
              onChangeText={setPinPotvrdit}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(3)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }]}
                onPress={validovatPin}
              >
                <Text style={styles.buttonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 5: Shrnutí a souhlas */}
        {krok === 5 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>✓ Dokončení</Text>
            <Text style={styles.stepSubtitle}>Krok {Platform.OS === 'web' ? '4' : '5'} z {Platform.OS === 'web' ? '4' : '5'}</Text>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Shrnutí:</Text>
              <Text style={styles.summaryItem}>👤 {jmeno}</Text>
              <Text style={styles.summaryItem}>📱 {telefon}</Text>
              <Text style={styles.summaryItem}>🌾 {nazevFarmy}</Text>
              {email && <Text style={styles.summaryItem}>📧 {email}</Text>}
              <Text style={styles.summaryItem}>🔐 PIN: ••••••</Text>
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
                onPress={() => setKrok(4)}
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
});
