import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useFarmarAuth } from '../utils/farmarAuthContext';
import { supabase } from '../../lib/supabase';

/**
 * Callback handler pro magic link autentizaci
 *
 * Tato stránka se zobrazí po kliknutí na magic link v emailu.
 * Zpracuje autentizaci a nabídne možnost nastavit nové heslo.
 */
export default function AuthCallbackScreen() {
  const { checkMagicLinkSession, farmar } = useFarmarAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Počkáme chvíli, než se URL parametry zpracují
      await new Promise(resolve => setTimeout(resolve, 1000));

      const success = await checkMagicLinkSession();

      if (success) {
        setStatus('success');

        // Zkontrolujeme, jestli má uživatel nastavené heslo
        if (farmar && farmar.id) {
          const { data: farmarData } = await supabase
            .from('pestitele')
            .select('heslo_hash')
            .eq('id', farmar.id)
            .single();

          // Pokud nemá heslo, přesměrujeme na vytvoření
          if (!farmarData?.heslo_hash) {
            setHasPassword(false);
            setTimeout(() => {
              router.replace('/profil/nastavit-heslo');
            }, 1500);
            return;
          }
        }

        // Uživatel má heslo - zobrazíme možnost změnit nebo pokračovat
        setHasPassword(true);
      } else {
        setStatus('error');
        setErrorMessage('Nepodařilo se ověřit přihlašovací odkaz. Zkuste to prosím znovu.');
      }
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Došlo k neočekávané chybě při přihlašování.');
    }
  };

  const handleSetNewPassword = () => {
    router.replace('/profil/nastavit-heslo');
  };

  const handleContinue = () => {
    router.replace('/muj-profil');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#7B1FA2" />
            <Text style={styles.title}>Přihlašuji...</Text>
            <Text style={styles.subtitle}>
              Ověřujeme váš přihlašovací odkaz
            </Text>
          </>
        )}

        {status === 'success' && !hasPassword && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Přihlášení úspěšné!</Text>
            <Text style={styles.subtitle}>
              Přesměrováváme vás na nastavení hesla...
            </Text>
          </>
        )}

        {status === 'success' && hasPassword && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Přihlášení úspěšné!</Text>
            <Text style={styles.subtitle}>
              Chcete si nastavit nové heslo?
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSetNewPassword}>
              <Text style={styles.primaryButtonText}>Nastavit nové heslo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleContinue}>
              <Text style={styles.secondaryButtonText}>Pokračovat bez změny</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>✗</Text>
            <Text style={styles.title}>Chyba přihlášení</Text>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
            <Text
              style={styles.link}
              onPress={() => router.replace('/prihlaseni')}
            >
              Zpět na přihlášení
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6A1B9A',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  successIcon: {
    fontSize: 64,
    color: '#7B1FA2',
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 64,
    color: '#F44336',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  link: {
    marginTop: 24,
    fontSize: 16,
    color: '#7B1FA2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#7B1FA2',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
