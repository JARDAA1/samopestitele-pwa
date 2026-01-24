import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function StankyLoginScreen() {
  const { loginWithPin } = useFarmarAuth();

  const [farmNumber, setFarmNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinLogin = async () => {
    if (!farmNumber || farmNumber.trim() === '') {
      alert('Zadejte číslo farmy');
      return;
    }

    if (pin.length !== 8) {
      alert('PIN musí mít přesně 8 číslic');
      return;
    }

    const forbiddenPins = ['12345678', '87654321', '00000000', '11111111', '22222222', '33333333', '44444444', '55555555', '66666666', '77777777', '88888888', '99999999'];
    if (forbiddenPins.includes(pin)) {
      alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      return;
    }

    if (/^(.)\1+$/.test(pin)) {
      alert('PIN nesmí obsahovat pouze stejné číslice.');
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
        <Text style={styles.headerTitle}>Moje stánky</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎪</Text>
          </View>

          <Text style={styles.title}>Přihlášení PINem</Text>
          <Text style={styles.subtitle}>
            Spravujte své stánky na trzích - flexibilně, dnes tady, zítra jinde
          </Text>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔒 Bezpečný přístup</Text>
            <Text style={styles.securityText}>
              Číslo farmy + PIN kód • Správa stánků • Fotografie a lokace
            </Text>
          </View>

          <Text style={styles.label}>Číslo farmy</Text>
          <TextInput
            style={styles.farmNumberInput}
            placeholder="F001"
            value={farmNumber}
            onChangeText={(text) => setFarmNumber(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
            autoFocus
          />

          <Text style={styles.label}>PIN kód (8 číslic)</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••••••"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={8}
            onSubmitEditing={handlePinLogin}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handlePinLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Přihlásit se</Text>
            )}
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 Co jsou Moje stánky?</Text>
            <Text style={styles.helpText}>
              Evidujte své stánky na farmářských trzích:{'\n'}
              • Název a popis stánku{'\n'}
              • Umístění (město, ulice){'\n'}
              • Fotografie stánku{'\n'}
              • Časy otevření (dny a hodiny)
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Používáte stejné číslo farmy a PIN jako pro Prodejnu.{'\n\n'}
              Číslo farmy najdete ve svém Profilu po přihlášení emailem.
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
    borderTopColor: '#FF9800',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
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
  securityInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
  },
  farmNumberInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
  },
  pinInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 11,
    color: '#2E7D32',
    lineHeight: 14,
  },
});
