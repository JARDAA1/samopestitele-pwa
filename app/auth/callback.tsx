import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useFarmarAuth } from '../utils/farmarAuthContext';
import { supabase } from '../../lib/supabase';

/**
 * Callback handler pro magic link autentizaci
 *
 * Tato stránka se zobrazí po kliknutí na magic link v emailu.
 * Zpracuje autentizaci a přesměruje uživatele na hlavní stránku.
 */
export default function AuthCallbackScreen() {
  const { checkMagicLinkSession, farmar } = useFarmarAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

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

        // Zkontrolujeme, jestli má uživatel nastavený PIN
        // Pokud ne, přesměrujeme ho na vytvoření PINu
        if (farmar && farmar.id) {
          const { data: farmarData } = await supabase
            .from('pestitele')
            .select('heslo_hash')
            .eq('id', farmar.id)
            .single();

          // Pokud nemá PIN (heslo_hash je null nebo prázdné), přesměrujeme na vytvoření PINu
          if (!farmarData?.heslo_hash) {
            setTimeout(() => {
              router.replace('/prihlaseni/vytvorit-pin');
            }, 1500);
            return;
          }
        }

        // Pokud má PIN nebo se něco pokazilo, jdeme na moje-farma
        setTimeout(() => {
          router.replace('/(tabs)/moje-farma');
        }, 1500);
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.title}>Přihlašuji...</Text>
            <Text style={styles.subtitle}>
              Ověřujeme váš přihlašovací odkaz
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Přihlášení úspěšné!</Text>
            <Text style={styles.subtitle}>
              Budete přesměrováni na hlavní stránku...
            </Text>
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
    color: '#2E7D32',
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
    color: '#4CAF50',
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
    color: '#4CAF50',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
