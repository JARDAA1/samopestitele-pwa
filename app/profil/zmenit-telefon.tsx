import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFarmarAuth } from '../utils/farmarAuthContext';

export default function ZmenitTelefonScreen() {
  const { farmar, updateFarmarData } = useFarmarAuth();

  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('00420')) {
      cleaned = '+420' + cleaned.slice(5);
    } else if (cleaned.startsWith('420') && !cleaned.startsWith('+')) {
      cleaned = '+420' + cleaned.slice(3);
    } else if (!cleaned.startsWith('+') && cleaned.length === 9) {
      cleaned = '+420' + cleaned;
    }
    return cleaned;
  };

  const validatePhone = (phone: string): boolean => {
    const formatted = formatPhone(phone);
    return /^\+420[0-9]{9}$/.test(formatted);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSendCode = async () => {
    if (!validatePhone(newPhone)) {
      showAlert('Chyba', 'Zadejte platné české telefonní číslo');
      return;
    }

    const formattedPhone = formatPhone(newPhone);

    // Kontrola, zda číslo již neexistuje
    const { data: existingUser } = await supabase
      .from('pestitele')
      .select('id')
      .eq('telefon', formattedPhone)
      .single();

    if (existingUser) {
      showAlert('Chyba', 'Toto telefonní číslo je již registrováno');
      return;
    }

    setLoading(true);

    try {
      // Generování 6-místného kódu
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      // Odeslání SMS
      const smsResponse = await fetch('https://ozxzowfzhdulofkxniji.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: `Váš ověřovací kód pro změnu telefonu v Samopěstitelé: ${code}`,
        }),
      });

      if (!smsResponse.ok) {
        throw new Error('Nepodařilo se odeslat SMS');
      }

      setStep('verify');
      showAlert('Kód odeslán', `Na číslo ${formattedPhone} jsme odeslali ověřovací kód`);
    } catch (error) {
      console.error('Chyba při odesílání SMS:', error);
      showAlert('Chyba', 'Nepodařilo se odeslat ověřovací SMS. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndChange = async () => {
    if (verificationCode !== generatedCode) {
      showAlert('Chyba', 'Nesprávný ověřovací kód');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhone(newPhone);

      // Aktualizace telefonu v databázi
      const { error } = await supabase
        .from('pestitele')
        .update({ telefon: formattedPhone })
        .eq('id', farmar?.id);

      if (error) throw error;

      // Aktualizace lokálního stavu
      if (updateFarmarData) {
        updateFarmarData({ telefon: formattedPhone });
      }

      showAlert('Úspěch', 'Telefonní číslo bylo úspěšně změněno');
      router.back();
    } catch (error) {
      console.error('Chyba při změně telefonu:', error);
      showAlert('Chyba', 'Nepodařilo se změnit telefonní číslo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Změnit telefon</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📱</Text>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Změna telefonního čísla</Text>
              <Text style={styles.subtitle}>
                Zadejte nové telefonní číslo. Pošleme vám SMS s ověřovacím kódem.
              </Text>

              <View style={styles.currentPhoneBox}>
                <Text style={styles.currentPhoneLabel}>Aktuální číslo:</Text>
                <Text style={styles.currentPhoneValue}>{farmar?.telefon}</Text>
              </View>

              <Text style={styles.label}>Nové telefonní číslo</Text>
              <TextInput
                style={styles.input}
                placeholder="+420 xxx xxx xxx"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Odeslat ověřovací kód</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Ověření</Text>
              <Text style={styles.subtitle}>
                Zadejte 6-místný kód, který jsme odeslali na číslo {formatPhone(newPhone)}
              </Text>

              <Text style={styles.label}>Ověřovací kód</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyAndChange}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Ověřit a změnit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setStep('phone');
                  setVerificationCode('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Zadat jiné číslo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendCode}
                disabled={loading}
              >
                <Text style={styles.resendButtonText}>Odeslat kód znovu</Text>
              </TouchableOpacity>
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
    backgroundColor: '#6A1B9A',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,152,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  currentPhoneBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  currentPhoneLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  currentPhoneValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
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
    fontSize: 18,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 16,
    fontSize: 28,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    padding: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
});
