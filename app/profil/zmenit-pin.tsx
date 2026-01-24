import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function ZmenitPinScreen() {
  const { createPin, farmar } = useFarmarAuth();

  const [starycPin, setStarycPin] = useState('');
  const [novyPin, setNovyPin] = useState('');
  const [novyPinPotvrzeni, setNovyPinPotvrzeni] = useState('');
  const [loading, setLoading] = useState(false);

  const handleZmenitPin = async () => {
    // Validace starého PINu
    if (starycPin.length < 4) {
      if (Platform.OS === 'web') {
        alert('Starý PIN musí mít minimálně 4 číslice');
      } else {
        Alert.alert('Chyba', 'Starý PIN musí mít minimálně 4 číslice');
      }
      return;
    }

    // Ověření starého PINu
    if (farmar?.heslo_hash !== starycPin) {
      if (Platform.OS === 'web') {
        alert('Starý PIN není správný');
      } else {
        Alert.alert('Chyba', 'Starý PIN není správný');
      }
      return;
    }

    // Validace délky nového PINu
    if (novyPin.length < 4) {
      if (Platform.OS === 'web') {
        alert('Nový PIN musí mít minimálně 4 číslice');
      } else {
        Alert.alert('Chyba', 'Nový PIN musí mít minimálně 4 číslice');
      }
      return;
    }

    // Validace že obsahuje pouze číslice
    if (!/^\d+$/.test(novyPin)) {
      if (Platform.OS === 'web') {
        alert('PIN může obsahovat pouze číslice');
      } else {
        Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      }
      return;
    }

    // Validace zakázaných PINů
    const forbiddenPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '12345678', '87654321'];
    if (forbiddenPins.includes(novyPin)) {
      if (Platform.OS === 'web') {
        alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      } else {
        Alert.alert('Chyba', 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      }
      return;
    }

    // Validace opakujících se číslic
    if (/^(.)\1+$/.test(novyPin)) {
      if (Platform.OS === 'web') {
        alert('PIN nesmí obsahovat pouze stejné číslice.');
      } else {
        Alert.alert('Chyba', 'PIN nesmí obsahovat pouze stejné číslice.');
      }
      return;
    }

    // Validace shody
    if (novyPin !== novyPinPotvrzeni) {
      if (Platform.OS === 'web') {
        alert('Nové PINy se neshodují');
      } else {
        Alert.alert('Chyba', 'Nové PINy se neshodují');
      }
      return;
    }

    // Validace že nový PIN je jiný než starý
    if (novyPin === starycPin) {
      if (Platform.OS === 'web') {
        alert('Nový PIN musí být jiný než starý PIN');
      } else {
        Alert.alert('Chyba', 'Nový PIN musí být jiný než starý PIN');
      }
      return;
    }

    setLoading(true);
    const result = await createPin(novyPin);
    setLoading(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        alert('PIN byl úspěšně změněn!');
      } else {
        Alert.alert(
          'Hotovo!',
          'PIN byl úspěšně změněn!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

      if (Platform.OS === 'web') {
        router.back();
      }
    } else {
      if (Platform.OS === 'web') {
        alert(result.error || 'Nepodařilo se změnit PIN');
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se změnit PIN');
      }
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
    marginTop: 8,
  },
  pinInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  changeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  securityBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 11,
    color: '#2E7D32',
    lineHeight: 16,
    textAlign: 'center',
  },
});
