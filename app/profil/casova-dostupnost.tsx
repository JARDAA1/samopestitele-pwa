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
        <ActivityIndicator size="large" color="#4CAF50" />
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
            placeholderTextColor="#999"
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
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    width: 80,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8EAED',
    minHeight: 200,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBanner: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
