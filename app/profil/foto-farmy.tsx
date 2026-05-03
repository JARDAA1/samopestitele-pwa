import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { fetchFotoFarmy, updateFotoFarmy } from '@/features/profil/services/profilService';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, validateImage, deleteImage } from '../_utils/imageUpload';

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
      const data = await fetchFotoFarmy(farmar.id);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Oprávnění', 'Pro nahrání fotky je potřeba povolit přístup k fotogalerii.', [{ text: 'OK' }]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const validation = await validateImage(uri, 5);
      if (!validation.valid) {
        Alert.alert('Chyba', validation.error || 'Neplatný obrázek');
        return;
      }

      setUploading(true);
      const uploaded = await uploadImage(uri, 'farmy');
      if (!uploaded) {
        Alert.alert('Chyba', 'Nepodařilo se nahrát obrázek. Zkuste to znovu.');
        setUploading(false);
        return;
      }

      if (fotoPath) await deleteImage(fotoPath);

      await updateFotoFarmy(farmar!.id, { foto_url: uploaded.url, foto_path: uploaded.path });
      setFotoUrl(uploaded.url);
      setFotoPath(uploaded.path);
      Alert.alert('Uloženo', 'Foto bylo úspěšně nahráno');
    } catch (error: any) {
      console.error('Chyba při nahrávání foto:', error);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se nahrát foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSmazatFoto = async () => {
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

    if (!shouldDelete) return;

    try {
      if (!farmar?.id) { console.error('No farmar ID'); return; }

      if (fotoPath) await deleteImage(fotoPath);

      await updateFotoFarmy(farmar.id, { foto_url: null, foto_path: null });
      setFotoUrl(null);
      setFotoPath(null);

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Foto bylo odstraněno');
      } else {
        Alert.alert('Smazáno', 'Foto bylo odstraněno');
      }
    } catch (error: any) {
      console.error('Chyba při mazání foto:', error);
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
              <Image source={{ uri: fotoUrl }} style={styles.foto} resizeMode="cover" />
              <TouchableOpacity style={styles.deleteButton} onPress={handleSmazatFoto}>
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
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#6A1B9A', paddingTop: 44, paddingBottom: 8, paddingHorizontal: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 6, width: 70 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)', margin: 12, padding: 20,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  label: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16, lineHeight: 18 },
  fotoContainer: { marginBottom: 16 },
  foto: { width: '100%', height: 250, borderRadius: 10, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  emptyFoto: {
    width: '100%', height: 250, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  uploadButton: { backgroundColor: '#FF9800', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  deleteButton: { backgroundColor: 'rgba(244, 67, 54, 0.7)', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  helperText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontStyle: 'italic' },
});
