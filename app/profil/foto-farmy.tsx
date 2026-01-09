import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';
import { ProtectedRoute } from '../utils/ProtectedRoute';
import { supabase } from '../../lib/supabase';

function FotoFarmyContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadFoto();
  }, []);

  const loadFoto = async () => {
    try {
      if (!farmar?.id) return;

      const { data, error } = await supabase
        .from('pestitele')
        .select('foto_url')
        .eq('id', farmar.id)
        .single();

      if (error) throw error;

      setFotoUrl(data?.foto_url || null);
    } catch (error) {
      console.error('Chyba při načítání foto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNahratFoto = () => {
    Alert.alert(
      'Nahrát foto',
      'Funkce uploadu fotek bude brzy dostupná. Zatím můžete vložit URL adresu obrázku.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Vložit URL',
          onPress: () => {
            if (typeof window !== 'undefined') {
              const url = prompt('Vložte URL adresu obrázku:');
              if (url) {
                ulozitFotoUrl(url);
              }
            }
          }
        }
      ]
    );
  };

  const ulozitFotoUrl = async (url: string) => {
    setUploading(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        return;
      }

      const { error } = await supabase
        .from('pestitele')
        .update({ foto_url: url })
        .eq('id', farmar.id);

      if (error) throw error;

      setFotoUrl(url);
      Alert.alert('Uloženo', 'Foto bylo úspěšně uloženo');
    } catch (error: any) {
      console.error('Chyba při ukládání:', error);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se uložit foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSmazatFoto = () => {
    Alert.alert(
      'Smazat foto?',
      'Opravdu chcete smazat foto?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!farmar?.id) return;

              const { error } = await supabase
                .from('pestitele')
                .update({ foto_url: null })
                .eq('id', farmar.id);

              if (error) throw error;

              setFotoUrl(null);
              Alert.alert('Smazáno', 'Foto bylo odstraněno');
            } catch (error: any) {
              Alert.alert('Chyba', error?.message || 'Nepodařilo se smazat foto');
            }
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>Tady mě najdete</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Foto místa, kde vás zákazníci najdou</Text>
          <Text style={styles.hint}>
            Přidejte foto vašeho stánku, farmy nebo místa, kde prodáváte. Pomůže zákazníkům vás snáze najít.
          </Text>

          {fotoUrl ? (
            <View style={styles.fotoContainer}>
              <Image
                source={{ uri: fotoUrl }}
                style={styles.foto}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleSmazatFoto}
              >
                <Text style={styles.deleteButtonText}>🗑️ Smazat foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyFoto}>
              <Text style={styles.emptyIcon}>📸</Text>
              <Text style={styles.emptyText}>Žádné foto</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={handleNahratFoto}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? 'Nahrávám...' : fotoUrl ? '📷 Změnit foto' : '📷 Nahrát foto'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            💡 Tip: Použijte jasné foto, které pomůže zákazníkům vás najít. Ideální je foto vašeho stánku nebo vývěsního štítu.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function FotoFarmyScreen() {
  return (
    <ProtectedRoute>
      <FotoFarmyContent />
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
  fotoContainer: {
    marginBottom: 16,
  },
  foto: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F0F0F0',
  },
  emptyFoto: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E8EAED',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
