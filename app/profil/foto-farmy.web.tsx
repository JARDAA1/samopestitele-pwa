import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import {
  fetchFotoFarmy,
  updateFotoFarmy,
} from '@/features/profil/services/profilService';
import { uploadImage, deleteImage } from '../_utils/imageUpload';

const MAX_SIZE_MB = 5;

function FotoFarmyContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFoto, setCurrentFoto] = useState<string | null>(null);
  const [currentFotoPath, setCurrentFotoPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    if (!farmar?.id) return;
    fetchFotoFarmy(farmar.id)
      .then(data => {
        setCurrentFoto(data?.foto_url || null);
        setCurrentFotoPath(data?.foto_path || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [farmar?.id]);

  const handleFileChange = async (e: any) => {
    const file: File = e.target.files?.[0];
    if (!file || !farmar?.id) return;

    setErrorMsg('');
    if (!file.type.startsWith('image/')) { setErrorMsg('Vyberte soubor obrázku.'); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Soubor je příliš velký. Maximální velikost je ${MAX_SIZE_MB} MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      if (currentFotoPath) {
        try { await deleteImage(currentFotoPath); } catch { /* ignore */ }
      }

      const result = await uploadImage(objectUrl, farmar.id);
      if (!result) throw new Error('Upload failed');
      await updateFotoFarmy(farmar.id, { foto_url: result.url, foto_path: result.path });
      setCurrentFoto(result.url);
      setCurrentFotoPath(result.path);
      setPreview(null);
      setSuccessMsg('Fotka byla úspěšně nahrána');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Nepodařilo se nahrát fotografii');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!farmar?.id || !currentFoto) return;
    if (!window.confirm('Opravdu chcete smazat fotografii farmy?')) return;

    setUploading(true);
    try {
      if (currentFotoPath) await deleteImage(currentFotoPath);
      await updateFotoFarmy(farmar.id, { foto_url: null, foto_path: null });
      setCurrentFoto(null);
      setCurrentFotoPath(null);
      setSuccessMsg('Fotografie byla smazána');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('Nepodařilo se smazat fotografii');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.push('/profil')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Fotografie farmy</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {successMsg ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓ {successMsg}</Text>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Current or preview photo */}
        <View style={s.photoCard}>
          {preview || currentFoto ? (
            <>
              <Image
                source={{ uri: preview || currentFoto! }}
                style={s.photo}
                resizeMode="cover"
              />
              {preview && (
                <View style={s.previewBadge}>
                  <Text style={s.previewBadgeText}>Náhled</Text>
                </View>
              )}
            </>
          ) : (
            <View style={s.placeholder}>
              <Text style={s.placeholderIcon}>🌿</Text>
              <Text style={s.placeholderText}>Žádná fotografie</Text>
              <Text style={s.placeholderHint}>Nahrajte fotografii vaší farmy nebo prodejního místa</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.iconCircle}><Text style={s.iconText}>📸</Text></View>
            <View>
              <Text style={s.cardTitle}>Nahrát fotografii</Text>
              <Text style={s.cardSubtitle}>JPG, PNG — max {MAX_SIZE_MB} MB</Text>
            </View>
          </View>

          {uploading ? (
            <View style={s.uploadingBox}>
              <ActivityIndicator size="small" color="#4caf50" />
              <Text style={s.uploadingText}>Nahrávám...</Text>
            </View>
          ) : (
            <>
              {/* @ts-ignore */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <TouchableOpacity
                style={s.uploadBtn}
                onPress={() => fileInputRef.current?.click()}
              >
                <Text style={s.uploadBtnText}>📁 Vybrat ze zařízení</Text>
              </TouchableOpacity>

              {currentFoto && (
                <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                  <Text style={s.deleteBtnText}>🗑️ Smazat fotografii</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={s.tipsBox}>
            <Text style={s.tipsTitle}>💡 Tipy pro dobrou fotografii</Text>
            <Text style={s.tip}>• Vyfotografujte zahradu, stánek nebo produkty</Text>
            <Text style={s.tip}>• Použijte jasné přirozené světlo</Text>
            <Text style={s.tip}>• Horizontální formát vypadá nejlépe</Text>
            <Text style={s.tip}>• Kvalitní foto přitahuje více zákazníků</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function FotoFarmyScreen() {
  return <ProtectedRoute><FotoFarmyContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },

  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 640 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 20, paddingBottom: 48,
  },

  successBanner: {
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#4caf50',
  },
  successText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  photoCard: {
    backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e7eb', minHeight: 240 as any,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  photo: { width: '100%' as any, height: 320 as any },
  previewBadge: {
    position: 'absolute' as any, top: 12, right: 12,
    backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  placeholder: {
    minHeight: 240 as any, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  placeholderIcon: { fontSize: 56, marginBottom: 12 },
  placeholderText: { fontSize: 16, fontWeight: '600', color: '#9ca3af', marginBottom: 6 },
  placeholderHint: { fontSize: 14, color: '#d1d5db', textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  uploadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  uploadingText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  uploadBtn: {
    backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  uploadBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#fef2f2', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  deleteBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },

  tipsBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#4caf50', gap: 4,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 6 },
  tip: { fontSize: 13, color: '#374151', lineHeight: 20 },
});
