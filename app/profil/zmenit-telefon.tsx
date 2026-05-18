import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { checkTelefonExists, updateTelefon } from '@/features/profil/services/profilService';

export default function ZmenitTelefonScreen() {
  const { farmar, updateFarmarData } = useFarmarAuth();

  const [newPhone, setNewPhone] = useState('');
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

  const handleChangePhone = async () => {
    if (!validatePhone(newPhone)) {
      showAlert('Chyba', 'Zadejte platné české telefonní číslo (9 číslic)');
      return;
    }

    const formattedPhone = formatPhone(newPhone);

    // Kontrola, zda je nové číslo jiné než aktuální
    if (formattedPhone === farmar?.telefon) {
      showAlert('Chyba', 'Nové číslo je stejné jako aktuální');
      return;
    }

    // Kontrola, zda číslo již neexistuje
    const telefonExists = await checkTelefonExists(formattedPhone);

    if (telefonExists) {
      showAlert('Chyba', 'Toto telefonní číslo je již registrováno u jiného účtu');
      return;
    }

    setLoading(true);

    try {
      // Aktualizace telefonu v databázi
      await updateTelefon(farmar?.id!, formattedPhone);

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

          <Text style={styles.title}>Změna telefonního čísla</Text>
          <Text style={styles.subtitle}>
            Zadejte nové telefonní číslo pro váš účet.
          </Text>

          <View style={styles.currentPhoneBox}>
            <Text style={styles.currentPhoneLabel}>Aktuální číslo:</Text>
            <Text style={styles.currentPhoneValue}>{farmar?.telefon}</Text>
          </View>

          <Text style={styles.label}>Nové telefonní číslo</Text>
          <TextInput
            style={styles.input}
            placeholder="např. 777 123 456"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            autoFocus
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Zadejte české telefonní číslo (9 číslic). Předvolba +420 bude doplněna automaticky.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleChangePhone}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Změnit telefonní číslo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Zrušit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33691e',
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
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
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
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
