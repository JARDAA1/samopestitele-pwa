import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { fetchHesloHash } from '@/features/profil/services/profilService';
import { supabase } from '@/lib/supabaseClient';

/**
 * Callback handler pro magic link autentizaci a ověření emailu
 *
 * mode=verify  → přišel z registrace, ověří email, zobrazí uvítání
 * mode=recovery → přišel z reset hesla, nabídne nastavení nového hesla
 * (default)    → standardní magic link login
 */
export default function AuthCallbackScreen() {
  const { checkMagicLinkSession } = useFarmarAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const [status, setStatus] = useState<'loading' | 'success_verify' | 'success_login' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    // Posloucháme na SIGNED_IN event — Supabase ho vyvolá, jakmile zpracuje token z URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();
        await handleCallback();
      }
    });

    // Fallback: pokud Supabase session už existuje (obnova stránky), zkusíme rovnou
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        handleCallback();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCallback = async () => {
    try {
      const success = await checkMagicLinkSession();

      if (!success) {
        setStatus('error');
        setErrorMessage('Nepodařilo se ověřit odkaz. Zkuste to prosím znovu.');
        return;
      }

      // Pokud jde o ověření emailu z registrace
      if (mode === 'verify') {
        await markEmailVerified();
        setStatus('success_verify');
        return;
      }

      // Standardní reset hesla / magic link login — načteme farmar přímo ze session
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email) {
        const { data: farmers } = await supabase
          .from('pestitele')
          .select('id')
          .eq('email', email)
          .single();
        if (farmers?.id) {
          const hesloHash = await fetchHesloHash(farmers.id);
          if (!hesloHash) {
            setHasPassword(false);
            setTimeout(() => router.replace('/profil/nastavit-heslo'), 1500);
            return;
          }
        }
      }

      setHasPassword(true);
      setStatus('success_login');
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Došlo k neočekávané chybě.');
    }
  };

  const markEmailVerified = async () => {
    try {
      const { supabase } = require('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email) {
        await supabase
          .from('pestitele')
          .update({ email_verified: true })
          .eq('email', email);
      }
    } catch (e) {
      console.error('Nepodařilo se nastavit email_verified:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        {/* Načítání */}
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#1a3a1a" />
            <Text style={styles.title}>Ověřuji...</Text>
            <Text style={styles.subtitle}>Zpracováváme váš odkaz</Text>
          </>
        )}

        {/* Úspěšné ověření emailu z registrace — welcome */}
        {status === 'success_verify' && (
          <>
            <Text style={styles.welcomeIcon}>🌱</Text>
            <Text style={styles.title}>Vítejte v Samopestitele.cz!</Text>
            <Text style={styles.subtitle}>
              Váš email byl úspěšně ověřen. Účet je aktivní, můžete se přihlásit.
            </Text>
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>Co dělat jako první?</Text>
              <Text style={styles.tipItem}>📍 Doplňte adresu a GPS polohu farmy</Text>
              <Text style={styles.tipItem}>🧺 Přidejte první produkty</Text>
              <Text style={styles.tipItem}>📸 Nahrajte fotku farmy</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/prihlaseni')}
            >
              <Text style={styles.primaryButtonText}>Přihlásit se →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Úspěšný login — nastavení hesla */}
        {status === 'success_login' && !hasPassword && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Přihlášení úspěšné!</Text>
            <Text style={styles.subtitle}>Přesměrováváme vás na nastavení hesla...</Text>
          </>
        )}

        {status === 'success_login' && hasPassword && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Přihlášení úspěšné!</Text>
            <Text style={styles.subtitle}>Chcete si nastavit nové heslo?</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/profil/nastavit-heslo')}>
              <Text style={styles.primaryButtonText}>Nastavit nové heslo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/muj-profil')}>
              <Text style={styles.secondaryButtonText}>Pokračovat bez změny</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Chyba */}
        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>✗</Text>
            <Text style={styles.title}>Chyba ověření</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.link} onPress={() => router.replace('/prihlaseni')}>
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
    backgroundColor: '#1a3a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: 420,
    width: '100%',
  },
  welcomeIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  successIcon: {
    fontSize: 64,
    color: '#a5d6a7',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorIcon: {
    fontSize: 64,
    color: '#ef5350',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  tipsBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 14,
    color: '#ef5350',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  link: {
    marginTop: 20,
    fontSize: 15,
    color: '#FF9800',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
