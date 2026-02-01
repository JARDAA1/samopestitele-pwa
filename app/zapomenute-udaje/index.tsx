import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';

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
          'Email odeslán ✓',
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zapomenuté údaje</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            {Platform.OS === 'web' ? (
              <Image
                source={{ uri: '/assets/images/profil-icon.png' }}
                style={styles.iconImage}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../../assets/images/profil-icon.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            )}
          </View>

          {emailSent ? (
            <>
              <Text style={styles.title}>✉️ Email odeslán</Text>
              <Text style={styles.subtitle}>
                Zkontrolujte svou emailovou schránku ({email}) a klikněte na odkaz pro obnovení přístupu.
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
              <Text style={styles.title}>Obnovení přístupu</Text>
              <Text style={styles.subtitle}>
                Zadejte email, který jste použili při registraci. Pošleme vám odkaz, přes který si zobrazíte kód farmy a můžete změnit PIN.
              </Text>

              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>🔒 Bezpečné obnovení</Text>
                <Text style={styles.securityText}>
                  Přihlašovací odkaz platný 1 hodinu • Po přihlášení zobrazíme váš kód farmy a umožníme změnit PIN
                </Text>
              </View>

              <Text style={styles.label}>Email z registrace</Text>
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
                  {loading ? 'Odesílám...' : 'Odeslat odkaz pro obnovení'}
                </Text>
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>💡 Nemáte přístup k emailu?</Text>
                <Text style={styles.helpText}>
                  V tom případě bohužel nelze účet obnovit. Email je jediná cesta, jak bezpečně ověřit vaši identitu.
                </Text>
              </View>
            </>
          )}
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
    color: '#6A1B9A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
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
  iconImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6A1B9A',
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
    color: '#6A1B9A',
    marginBottom: 8,
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
  resendLink: {
    padding: 12,
    alignItems: 'center',
  },
  resendLinkText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  emailSentBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  emailSentText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  helpBox: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
