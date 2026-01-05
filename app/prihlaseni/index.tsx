import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function PrihlaseniScreen() {
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
          'Email odeslán ✓',
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
        <Text style={styles.headerTitle}>Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {emailSent ? (
            <>
              <Text style={styles.title}>✉️ Email odeslán</Text>
              <Text style={styles.subtitle}>
                Zkontrolujte svou emailovou schránku ({email}) a klikněte na přihlašovací odkaz.
              </Text>
              <View style={styles.emailSentBox}>
                <Text style={styles.emailSentText}>
                  ℹ️ Pokud email nevidíte, zkontrolujte složku spam nebo nevyžádanou poštu.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleOdeslatMagicLink}
                disabled={loading}
              >
                <Text style={styles.resendLinkText}>
                  Odeslat znovu
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>📧 Přihlášení emailem</Text>
              <Text style={styles.subtitle}>
                Zadejte svůj email. Pošleme vám přihlašovací odkaz.
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
                onSubmitEditing={handleOdeslatMagicLink}
              />

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleOdeslatMagicLink}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Odesílám...' : 'Odeslat přihlašovací odkaz'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEBO</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/registrace')}
          >
            <Text style={styles.registerLinkText}>
              Ještě nemám účet - Zaregistrovat se
            </Text>
          </TouchableOpacity>
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
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  registerLink: {
    padding: 12,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLink: {
    padding: 12,
    alignItems: 'center',
  },
  resendLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  emailSentBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  emailSentText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
