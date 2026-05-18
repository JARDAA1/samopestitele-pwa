import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import AuthLoginForm from '../_components/AuthLoginForm';

export default function ProdejnaLoginScreen() {
  const { loginWithPin, isAuthenticated, authLevel } = useFarmarAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMagicLinkOption, setShowMagicLinkOption] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && authLevel === 'pin') {
      router.replace('/(tabs)/moje-prodejna');
    }
  }, [isAuthenticated, authLevel]);

  const handleLogin = async () => {
    if (!username.trim()) {
      Platform.OS === 'web' ? alert('Zadejte uživatelské jméno') : Alert.alert('Chyba', 'Zadejte uživatelské jméno');
      return;
    }
    if (!password || password.length < 8) {
      Platform.OS === 'web' ? alert('Heslo musí mít minimálně 8 znaků') : Alert.alert('Chyba', 'Heslo musí mít minimálně 8 znaků');
      return;
    }

    setLoading(true);
    const result = await loginWithPin(username.trim(), password);
    setLoading(false);

    if (result.success) {
      setRemainingAttempts(null);
      router.replace('/(tabs)/moje-prodejna');
    } else {
      if (result.remainingAttempts !== undefined) setRemainingAttempts(result.remainingAttempts);
      Platform.OS === 'web' ? alert(result.error || 'Nesprávné přihlašovací údaje') : Alert.alert('Chyba', result.error || 'Nesprávné přihlašovací údaje');
      setShowMagicLinkOption(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prodejna - Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/images/prodejna-icon.png')}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Přihlášení farmáře</Text>
          <Text style={styles.subtitle}>Přihlaste se emailem a heslem</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Bezpečný přístup</Text>
            <Text style={styles.infoText}>Správa produktů, objednávek a nastavení vaší farmy.</Text>
          </View>

          <AuthLoginForm
            username={username}
            onUsernameChange={setUsername}
            password={password}
            onPasswordChange={setPassword}
            loading={loading}
            remainingAttempts={remainingAttempts}
            onSubmit={handleLogin}
            onForgotPassword={() => router.push('/zapomenute-udaje')}
            testIDs={{ username: 'login-username', password: 'login-password', submit: 'login-submit', error: 'login-error' }}
          />

          {showMagicLinkOption && (
            <View style={styles.fallbackContainer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ZAPOMNĚLI JSTE HESLO?</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/prihlaseni/profil')}
              >
                <Text style={styles.secondaryButtonText}>Obnovit heslo přes email</Text>
              </TouchableOpacity>
              <Text style={styles.fallbackInfo}>Na váš email vám pošleme odkaz pro obnovení hesla.</Text>
            </View>
          )}

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Ještě nemáte účet?</Text>
            <Text style={styles.helpText}>Zaregistrujte se a získejte přístup k správě své farmy.</Text>
            <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/registrace')}>
              <Text style={styles.registerLinkText}>Vytvořit účet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 44, paddingBottom: 8, paddingHorizontal: 12,
    backgroundColor: '#1a3a1a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 6 },
  backIcon: { fontSize: 22, color: '#ffffff', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 40 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 30 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    alignSelf: 'center', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.3)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  iconImage: { width: 160, height: 160 },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)', padding: 14, borderRadius: 10,
    marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#FF9800', marginBottom: 4 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  fallbackContainer: { marginTop: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  fallbackInfo: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10, lineHeight: 16 },
  helpBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 10,
    marginTop: 20, alignItems: 'center',
  },
  helpTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  helpText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, textAlign: 'center', marginBottom: 10 },
  registerLink: { backgroundColor: 'rgba(255,152,0,0.3)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  registerLinkText: { color: '#FF9800', fontSize: 13, fontWeight: '600' },
});
