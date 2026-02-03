import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function ProfilLoginScreen() {
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
    const result = await sendMagicLink(cleanEmail);
    setLoading(false);

    if (result.success) {
      setEmailSent(true);
      if (Platform.OS === 'web') {
        alert('Přihlašovací odkaz byl odeslán na ' + cleanEmail + '\n\nZkontrolujte svou emailovou schránku a klikněte na odkaz pro přihlášení.');
      } else {
        Alert.alert(
          'Email odeslán',
          'Zkontrolujte svou emailovou schránku a klikněte na odkaz pro přihlášení.',
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil - Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>👤</Text>
          </View>

          {emailSent ? (
            <>
              <Text style={styles.title}>Email odeslán</Text>
              <Text style={styles.subtitle}>
                Zkontrolujte svou emailovou schránku ({email}) a klikněte na přihlašovací odkaz.
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
              <Text style={styles.title}>Přihlášení emailem</Text>
              <Text style={styles.subtitle}>
                Zabezpečený přístup k osobním údajům, nastavení a platbám
              </Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Nejvyšší bezpečnost</Text>
                <Text style={styles.infoText}>
                  Přihlašovací odkaz platný 1 hodinu. Session 7 dní.
                </Text>
              </View>

              <Text style={styles.label}>Email</Text>
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
                  {loading ? 'Odesílám...' : 'Odeslat přihlašovací odkaz'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#6A1B9A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
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
});
