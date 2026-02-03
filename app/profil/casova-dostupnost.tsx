import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';
import { ProtectedRoute } from '../utils/ProtectedRoute';
import { supabase } from '../../lib/supabase';

function CasovaDostupnostContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dostupnost, setDostupnost] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDostupnost();
  }, []);

  const loadDostupnost = async () => {
    try {
      if (!farmar?.id) return;

      const { data, error } = await supabase
        .from('pestitele')
        .select('casova_dostupnost')
        .eq('id', farmar.id)
        .single();

      if (error) throw error;

      setDostupnost(data?.casova_dostupnost || '');
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUlozit = async () => {
    setSaving(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('pestitele')
        .update({ casova_dostupnost: dostupnost.trim() })
        .eq('id', farmar.id);

      if (error) throw error;

      // Formátovat datum a čas
      const now = new Date();
      const datum = now.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const cas = now.toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit'
      });

      setSavedMessage(`Uloženo ${datum} v ${cas}`);

      // Skrýt zprávu po 5 sekundách
      setTimeout(() => {
        setSavedMessage(null);
      }, 5000);

    } catch (error: any) {
      console.error('Chyba při ukládání:', error);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje časová dostupnost</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {savedMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {savedMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Kdy jste k zastižení?</Text>
          <Text style={styles.hint}>
            Popište, kdy vás mohou zákazníci kontaktovat nebo navštívit. Například: "Po-Pá 8-18h, So 9-13h" nebo "Volejte předem".
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Např: Pondělí - Pátek: 8:00 - 18:00&#10;Sobota: 9:00 - 13:00&#10;Volejte předem na tel. číslo"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={dostupnost}
            onChangeText={setDostupnost}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <Text style={styles.helperText}>
            💡 Tip: Uveďte i preferovaný způsob kontaktu (telefon, email, SMS)
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Zrušit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleUlozit}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Ukládám...' : 'Uložit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function CasovaDostupnostScreen() {
  return (
    <ProtectedRoute>
      <CasovaDostupnostContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
    width: 70,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    margin: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: 200,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 32,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  successText: {
    color: '#a5d6a7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
