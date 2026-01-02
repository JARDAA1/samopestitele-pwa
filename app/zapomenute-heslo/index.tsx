import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function ZapomenuteHesloScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOdeslat = async () => {
    // Validace emailu
    if (!email.trim()) {
      if (Platform.OS === 'web') {
        alert('Zadejte email');
      } else {
        Alert.alert('Chyba', 'Zadejte email');
      }
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (Platform.OS === 'web') {
        alert('Zadejte platný email');
      } else {
        Alert.alert('Chyba', 'Zadejte platný email');
      }
      return;
    }

    setLoading(true);

    // TODO: Implementovat API endpoint pro obnovení přístupu
    // Endpoint by měl:
    // 1. Najít farmáře podle emailu
    // 2. Odeslat SMS kód na registrovaný telefon
    // 3. Nebo odeslat reset link na email

    try {
      // Simulace API volání
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (Platform.OS === 'web') {
        alert(
          'Pokud je tento email registrován, obdržíte instrukce pro obnovení přístupu.\n\n' +
          'Zkontrolujte vaši emailovou schránku a také SMS na vašem registrovaném telefonu.'
        );
      } else {
        Alert.alert(
          'Email odeslán ✓',
          'Pokud je tento email registrován, obdržíte instrukce pro obnovení přístupu.\n\n' +
          'Zkontrolujte vaši emailovou schránku a také SMS na vašem registrovaném telefonu.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

      // Na webu počkáme a vrátíme se
      if (Platform.OS === 'web') {
        setTimeout(() => router.back(), 2000);
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Nepodařilo se odeslat email. Zkuste to znovu.');
      } else {
        Alert.alert('Chyba', 'Nepodařilo se odeslat email. Zkuste to znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Obnovení přístupu</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>📧 Zapomenuté heslo</Text>
          <Text style={styles.subtitle}>
            Zadejte email, který jste použili při registraci. Pošleme vám instrukce pro obnovení přístupu.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="vas@email.cz"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            onSubmitEditing={handleOdeslat}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleOdeslat}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Odesílám...' : 'Odeslat instrukce'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Jak to funguje?</Text>
          <Text style={styles.infoText}>
            1. Zadáte email z registrace{'\n'}
            2. Pokud email existuje, dostanete SMS kód na váš registrovaný telefon{'\n'}
            3. S tímto kódem se můžete přihlásit a změnit údaje
          </Text>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>💡 Stále nemůžete získat přístup?</Text>
          <Text style={styles.helpText}>
            Kontaktujte nás na email: podpora@samopestitele.cz
          </Text>
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
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },
  helpCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
