import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

export default function ZapomenuteUdajeScreen() {
  const { sendMagicLink } = useFarmarAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleOdeslatMagicLink = async () => {
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

    setLoading(true);
    const result = await sendMagicLink(cleanEmail, 'recovery');
    setLoading(false);

    if (result.success) {
      setEmailSent(true);
      if (Platform.OS === 'web') {
        alert('Odkaz pro obnovení byl odeslán na ' + cleanEmail + '\n\nZkontrolujte svou emailovou schránku a klikněte na odkaz.');
      } else {
        Alert.alert(
          'Email odeslán',
          'Zkontrolujte svou emailovou schránku a klikněte na odkaz pro obnovení přístupu.',
          [{ text: 'OK' }]
        );
      }
    } else {
      if (Platform.OS === 'web') {
        alert(result.error || 'Nepodařilo se odeslat email. Zkontrolujte emailovou adresu.');
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se odeslat email. Zkontrolujte emailovou adresu.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zapomenuté údaje</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Info karta */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          {emailSent ? (
            <>
              <Text style={styles.title}>Email odeslán</Text>
              <Text style={styles.subtitle}>
                Zkontrolujte svou emailovou schránku ({email}) a klikněte na odkaz pro obnovení přístupu.
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Pokud email nevidíte, zkontrolujte složku spam nebo nevyžádanou poštu.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleOdeslatMagicLink}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Odesílám...' : 'Odeslat znovu'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Obnovení přístupu</Text>
              <Text style={styles.subtitle}>
                Zadejte email, který jste použili při registraci. Pošleme vám odkaz pro přihlášení a nastavení nového hesla.
              </Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Bezpečné obnovení</Text>
                <Text style={styles.infoText}>
                  Přihlašovací odkaz je platný 1 hodinu. Po přihlášení budete moci nastavit nové heslo.
                </Text>
              </View>

              <Text style={styles.label}>Email z registrace</Text>
              <TextInput
                style={styles.input}
                placeholder="vas@email.cz"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                onSubmitEditing={handleOdeslatMagicLink}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleOdeslatMagicLink}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Odesílám...' : 'Odeslat odkaz pro obnovení'}
                </Text>
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>Nemáte přístup k emailu?</Text>
                <Text style={styles.helpText}>
                  V tom případě bohužel nelze účet obnovit. Email je jediná cesta, jak bezpečně ověřit vaši identitu.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33691e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#33691e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
    color: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
});
