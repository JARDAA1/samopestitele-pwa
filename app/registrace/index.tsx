import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function RegistraceScreen() {
  const { register } = useFarmarAuth();

  const [krok, setKrok] = useState(1);
  const [loading, setLoading] = useState(false);

  // KROK 1: Email a základní informace
  const [email, setEmail] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [nazevFarmy, setNazevFarmy] = useState('');

  // KROK 2: Heslo (místo PIN použijeme heslo pro silnější bezpečnost)
  const [heslo, setHeslo] = useState('');
  const [hesloPotvrdit, setHesloPotvrdit] = useState('');

  // KROK 3: Souhlas
  const [souhlas, setSouhlas] = useState(false);

  /**
   * KROK 1: Validace základních informací
   */
  const validovatInfo = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      if (Platform.OS === 'web') {
        alert('Zadejte emailovou adresu');
      } else {
        Alert.alert('Chyba', 'Zadejte emailovou adresu');
      }
      return;
    }

    if (!cleanEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      if (Platform.OS === 'web') {
        alert('Zadejte platnou emailovou adresu');
      } else {
        Alert.alert('Chyba', 'Zadejte platnou emailovou adresu');
      }
      return;
    }

    if (!jmeno.trim()) {
      if (Platform.OS === 'web') {
        alert('Zadejte vaše jméno');
      } else {
        Alert.alert('Chyba', 'Zadejte vaše jméno');
      }
      return;
    }

    if (!nazevFarmy.trim()) {
      if (Platform.OS === 'web') {
        alert('Zadejte název farmy');
      } else {
        Alert.alert('Chyba', 'Zadejte název farmy');
      }
      return;
    }

    setEmail(cleanEmail);
    setKrok(2);
  };

  /**
   * KROK 2: Validace hesla
   */
  const validovatHeslo = () => {
    if (heslo.length < 6) {
      if (Platform.OS === 'web') {
        alert('Heslo musí mít alespoň 6 znaků');
      } else {
        Alert.alert('Chyba', 'Heslo musí mít alespoň 6 znaků');
      }
      return;
    }

    if (heslo !== hesloPotvrdit) {
      if (Platform.OS === 'web') {
        alert('Hesla se neshodují');
      } else {
        Alert.alert('Chyba', 'Hesla se neshodují');
      }
      return;
    }

    setKrok(3);
  };

  /**
   * KROK 3: Dokončení registrace
   */
  const registrovat = async () => {
    if (!souhlas) {
      if (Platform.OS === 'web') {
        alert('Musíte souhlasit se zpracováním údajů');
      } else {
        Alert.alert('Chyba', 'Musíte souhlasit se zpracováním údajů');
      }
      return;
    }

    setLoading(true);
    try {
      // Pro nyní použijeme dummy telefon, protože register() funkce ho vyžaduje
      // V budoucnu můžeme upravit register() funkci aby akceptovala email místo telefonu
      const result = await register({
        telefon: '+420000000000', // Dummy - nebude se používat
        nazev_farmy: nazevFarmy,
        jmeno,
        email: email,
        pin: heslo, // Použijeme heslo místo PIN
      });

      if (result.success) {
        if (Platform.OS === 'web') {
          alert('Registrace úspěšná! Nyní se prosím přihlaste pomocí magic linku, který vám zašleme na email.');
          router.replace('/prihlaseni');
        } else {
          Alert.alert(
            'Úspěch! 🎉',
            'Váš účet byl vytvořen. Nyní se prosím přihlaste pomocí magic linku, který vám zašleme na email.',
            [{
              text: 'Přihlásit se',
              onPress: () => router.replace('/prihlaseni')
            }]
          );
        }
      } else {
        if (Platform.OS === 'web') {
          alert(result.error || 'Nepodařilo se vytvořit účet');
        } else {
          Alert.alert('Chyba', result.error || 'Nepodařilo se vytvořit účet');
        }
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error.message || 'Nepodařilo se vytvořit účet');
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
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* KROK 1: Základní informace */}
        {krok === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🌾 O vás a vaší farmě</Text>
            <Text style={styles.stepSubtitle}>Krok 1 z 3</Text>
            <Text style={styles.infoText}>
              Pár základních informací, aby vás zákazníci mohli najít.
            </Text>

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="vas@email.cz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />

            <Text style={styles.label}>Vaše jméno *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Jan Novák"
              value={jmeno}
              onChangeText={setJmeno}
            />

            <Text style={styles.label}>Název farmy *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Farma U Nováků"
              value={nazevFarmy}
              onChangeText={setNazevFarmy}
            />

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={validovatInfo}
            >
              <Text style={styles.buttonText}>Pokračovat →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KROK 2: Vytvoření hesla */}
        {krok === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>🔐 Vytvořte heslo</Text>
            <Text style={styles.stepSubtitle}>Krok 2 z 3</Text>
            <Text style={styles.infoText}>
              Heslo použijeme pouze pro případ, že nebudete mít přístup k emailu.
            </Text>

            <Text style={styles.label}>Heslo (min. 6 znaků) *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••"
              value={heslo}
              onChangeText={setHeslo}
              secureTextEntry
              autoFocus
            />

            <Text style={styles.label}>Potvrďte heslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••"
              value={hesloPotvrdit}
              onChangeText={setHesloPotvrdit}
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(1)}
              >
                <Text style={styles.buttonSecondaryText}>← Zpět</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, { flex: 1 }]}
                onPress={validovatHeslo}
              >
                <Text style={styles.buttonText}>Pokračovat →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KROK 3: Shrnutí a souhlas */}
        {krok === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>✓ Dokončení</Text>
            <Text style={styles.stepSubtitle}>Krok 3 z 3</Text>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Shrnutí:</Text>
              <Text style={styles.summaryItem}>📧 {email}</Text>
              <Text style={styles.summaryItem}>👤 {jmeno}</Text>
              <Text style={styles.summaryItem}>🌾 {nazevFarmy}</Text>
              <Text style={styles.summaryItem}>🔐 Heslo: ••••••</Text>
            </View>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setSouhlas(!souhlas)}
            >
              <View style={[styles.checkboxBox, souhlas && styles.checkboxBoxChecked]}>
                {souhlas && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Souhlasím se zpracováním osobních údajů pro účely této aplikace (jméno, email, adresa farmy)
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setKrok(2)}
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
