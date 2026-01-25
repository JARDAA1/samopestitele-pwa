import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../utils/farmarAuthContext';
import { ProtectedRoute } from '../utils/ProtectedRoute';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, validateImage, deleteImage } from '../utils/imageUpload';

function FotoFarmyContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPath, setFotoPath] = useState<string | null>(null);

  useEffect(() => {
    loadFoto();
  }, []);

  const loadFoto = async () => {
    try {
      if (!farmar?.id) return;

      const { data, error } = await supabase
        .from('pestitele')
        .select('foto_url, foto_path')
        .eq('id', farmar.id)
        .single();

      if (error) throw error;

      setFotoUrl(data?.foto_url || null);
      setFotoPath(data?.foto_path || null);
    } catch (error) {
      console.error('Chyba při načítání foto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNahratFoto = async () => {
    try {
      console.log('🎬 START: handleNahratFoto');

      // Požádat o oprávnění
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Permission status:', status);

      if (status !== 'granted') {
        Alert.alert(
          'Oprávnění',
          'Pro nahrání fotky je potřeba povolit přístup k fotogalerii.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Otevřít výběr obrázku
      console.log('📂 Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 Image picker result:', result);

      if (result.canceled) {
        console.log('❌ User canceled image selection');
        return;
      }

      const uri = result.assets[0].uri;
      console.log('📍 Selected image URI:', uri);

      // Validace velikosti a formátu
      console.log('🔍 Validating image...');
      const validation = await validateImage(uri, 5);
      console.log('✅ Validation result:', validation);

      if (!validation.valid) {
        console.log('❌ Validation failed:', validation.error);
        Alert.alert('Chyba', validation.error || 'Neplatný obrázek');
        return;
      }

      // Upload obrázku
      console.log('⬆️ Starting upload...');
      setUploading(true);

      const uploaded = await uploadImage(uri, 'farmy');
      console.log('📦 Upload result:', uploaded);

      if (!uploaded) {
        console.log('❌ Upload returned null');
        Alert.alert('Chyba', 'Nepodařilo se nahrát obrázek. Zkuste to znovu.');
        setUploading(false);
        return;
      }

      // Smazat starý obrázek z Storage, pokud existuje
      if (fotoPath) {
        console.log('🗑️ Deleting old image:', fotoPath);
        await deleteImage(fotoPath);
      }

      // Uložit do databáze
      console.log('💾 Saving to database...');
      const { error } = await supabase
        .from('pestitele')
        .update({
          foto_url: uploaded.url,
          foto_path: uploaded.path
        })
        .eq('id', farmar.id);

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ SUCCESS: Image uploaded and saved');
      setFotoUrl(uploaded.url);
      setFotoPath(uploaded.path);
      Alert.alert('Uloženo', 'Foto bylo úspěšně nahráno');

    } catch (error: any) {
      console.error('❌ ERROR in handleNahratFoto:', error);
      console.error('❌ Error stack:', error?.stack);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se nahrát foto');
    } finally {
      console.log('🏁 FINISH: handleNahratFoto (uploading = false)');
      setUploading(false);
    }
  };

  const handleSmazatFoto = async () => {
    console.log('🗑️ handleSmazatFoto called');
    console.log('   Current fotoPath:', fotoPath);
    console.log('   Current fotoUrl:', fotoUrl);
    console.log('   Farmar ID:', farmar?.id);

    // Pro web použít window.confirm(), pro native Alert.alert
    const shouldDelete = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm('Opravdu chcete smazat foto?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Smazat foto?',
            'Opravdu chcete smazat foto?',
            [
              { text: 'Zrušit', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Smazat', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!shouldDelete) {
      console.log('❌ User cancelled delete');
      return;
    }

    try {
      console.log('🚀 Starting delete process...');

      if (!farmar?.id) {
        console.error('❌ No farmar ID');
        return;
      }

      // Smazat ze Storage
      if (fotoPath) {
        console.log('🗑️ Deleting from Storage:', fotoPath);
        const deleted = await deleteImage(fotoPath);
        console.log('   Delete result:', deleted);
      } else {
        console.log('⚠️ No fotoPath to delete from Storage');
      }

      // Smazat z databáze
      console.log('💾 Updating database...');
      const { error } = await supabase
        .from('pestitele')
        .update({ foto_url: null, foto_path: null })
        .eq('id', farmar.id);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Database updated successfully');

      setFotoUrl(null);
      setFotoPath(null);

      // Zobrazit success message
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Foto bylo odstraněno');
      } else {
        Alert.alert('Smazáno', 'Foto bylo odstraněno');
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Chyba: ' + (error?.message || 'Nepodařilo se smazat foto'));
      } else {
        Alert.alert('Chyba', error?.message || 'Nepodařilo se smazat foto');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#7B1FA2" />
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
          <Text style={styles.helperText}>
            📏 Maximální velikost: 5 MB • Formáty: JPG, PNG, WEBP
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
    backgroundColor: '#7B1FA2',
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
    color: '#6A1B9A',
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
    backgroundColor: '#7B1FA2',
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
