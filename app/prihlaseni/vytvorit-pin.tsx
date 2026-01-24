import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function VytvoritPinScreen() {
  const { createPin, farmar } = useFarmarAuth();

  const [pin, setPin] = useState('');
  const [pinPotvrzeni, setPinPotvrzeni] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVytvoritPin = async () => {
    // Validace délky
    if (pin.length < 4) {
      if (Platform.OS === 'web') {
        alert('PIN musí mít minimálně 4 číslice');
      } else {
        Alert.alert('Chyba', 'PIN musí mít minimálně 4 číslice');
      }
      return;
    }

    // Validace že obsahuje pouze číslice
    if (!/^\d+$/.test(pin)) {
      if (Platform.OS === 'web') {
        alert('PIN může obsahovat pouze číslice');
      } else {
        Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      }
      return;
    }

    // Validace zakázaných PINů
    const forbiddenPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '12345678', '87654321'];
    if (forbiddenPins.includes(pin)) {
      if (Platform.OS === 'web') {
        alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      } else {
        Alert.alert('Chyba', 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      }
      return;
    }

    // Validace opakujících se číslic
    if (/^(.)\1+$/.test(pin)) {
      if (Platform.OS === 'web') {
        alert('PIN nesmí obsahovat pouze stejné číslice.');
      } else {
        Alert.alert('Chyba', 'PIN nesmí obsahovat pouze stejné číslice.');
      }
      return;
    }

    // Validace shody
    if (pin !== pinPotvrzeni) {
      if (Platform.OS === 'web') {
        alert('PINy se neshodují');
      } else {
        Alert.alert('Chyba', 'PINy se neshodují');
      }
      return;
    }

    setLoading(true);
    const result = await createPin(pin);
    setLoading(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        alert('PIN byl úspěšně vytvořen! Nyní se můžete přihlašovat do Prodejny pomocí PINu.');
      } else {
        Alert.alert(
          'Hotovo!',
          'PIN byl úspěšně vytvořen! Nyní se můžete přihlašovat do Prodejny pomocí PINu.',
          [{ text: 'OK', onPress: () => router.replace('/muj-profil') }]
        );
      }

      if (Platform.OS === 'web') {
        router.replace('/muj-profil');
      }
    } else {
      if (Platform.OS === 'web') {
        alert(result.error || 'Nepodařilo se vytvořit PIN');
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se vytvořit PIN');
      }
    }
  };

  const handlePreskocit = () => {
    if (Platform.OS === 'web') {
      const confirmed = confirm('Opravdu chcete přeskočit vytvoření PINu? Budete se muset vždy přihlašovat emailem.');
      if (confirmed) {
        router.replace('/muj-profil');
      }
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
              • Session platná 30 minut inaktivity{'\n'}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSpacer: {
    width: 80,
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
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
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
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
  farmNumberHighlight: {
    fontWeight: '700',
    color: '#E65100',
    fontSize: 13,
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
