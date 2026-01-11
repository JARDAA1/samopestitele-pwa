import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, Image, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';
import * as ImagePicker from 'expo-image-picker';

interface Stanek {
  id: string;
  nazev: string;
  popis: string | null;
  mesto: string;
  ulice: string;
  foto_url: string | null;
  datum_od: string;
  datum_do: string;
  cas_od: string;
  cas_do: string;
  aktivni: boolean;
}

function MojeStankyScreenContent() {
  const { isAuthenticated, farmar } = useFarmarAuth();

  const [loading, setLoading] = useState(true);
  const [stanky, setStanky] = useState<Stanek[]>([]);
  const [showStanekForm, setShowStanekForm] = useState(false);
  const [editujiciStanek, setEditujiciStanek] = useState<Stanek | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stanekForm, setStanekForm] = useState({
    nazev: '',
    popis: '',
    mesto: '',
    ulice: '',
    foto_url: '',
    datum_od: '',
    datum_do: '',
    cas_od: '',
    cas_do: ''
  });

  useEffect(() => {
    if (isAuthenticated && farmar?.id) {
      loadStanky(farmar.id);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, farmar]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && farmar?.id) {
        loadStanky(farmar.id);
      }
    }, [isAuthenticated, farmar])
  );

  const loadStanky = async (pestitelId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stanky')
        .select('*')
        .eq('pestitel_id', pestitelId)
        .order('datum_od', { ascending: false });

      if (error) {
        console.error('Chyba při načítání stánků:', error);
        return;
      }

      // Kontrola, zda je stánek aktivní (podle data a času)
      const stankyWithStatus = (data || []).map((stanek: any) => {
        const konec = new Date(`${stanek.datum_do}T${stanek.cas_do}`);
        const ted = new Date();
        return {
          ...stanek,
          aktivni: ted <= konec
        };
      });

      setStanky(stankyWithStatus);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVybratFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Chyba', 'Pro výběr fotografie je potřeba povolit přístup k fotkám');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Chyba při výběru fotografie:', error);
      Alert.alert('Chyba', 'Nepodařilo se vybrat fotografii');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${farmar?.id}_${Date.now()}.${fileExt}`;
      const filePath = `stanky/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stanky-photos')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('stanky-photos')
        .getPublicUrl(filePath);

      setStanekForm({ ...stanekForm, foto_url: urlData.publicUrl });
      Alert.alert('Úspěch', 'Fotografie byla nahrána');
    } catch (error: any) {
      console.error('Chyba při nahrávání fotografie:', error);
      Alert.alert('Chyba', 'Nepodařilo se nahrát fotografii');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSmazatFoto = () => {
    Alert.alert(
      'Smazat fotografii?',
      'Opravdu chcete smazat fotografii stánku?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => setStanekForm({ ...stanekForm, foto_url: '' })
        }
      ]
    );
  };

  const handleUlozitStanek = async () => {
    if (!farmar?.id) return;

    if (!stanekForm.nazev || !stanekForm.mesto || !stanekForm.ulice ||
        !stanekForm.datum_od || !stanekForm.datum_do ||
        !stanekForm.cas_od || !stanekForm.cas_do) {
      Alert.alert('Chyba', 'Vyplňte povinná pole (název, město, ulice, data a časy)');
      return;
    }

    try {
      if (editujiciStanek) {
        // Editace existujícího stánku
        const { error } = await supabase
          .from('stanky')
          .update({
            nazev: stanekForm.nazev,
            popis: stanekForm.popis || null,
            mesto: stanekForm.mesto,
            ulice: stanekForm.ulice,
            foto_url: stanekForm.foto_url || null,
            datum_od: stanekForm.datum_od,
            datum_do: stanekForm.datum_do,
            cas_od: stanekForm.cas_od,
            cas_do: stanekForm.cas_do,
          })
          .eq('id', editujiciStanek.id);

        if (error) throw error;
        Alert.alert('Úspěch', 'Stánek byl aktualizován');
      } else {
        // Vytvoření nového stánku
        const { error } = await supabase
          .from('stanky')
          .insert({
            pestitel_id: farmar.id,
            nazev: stanekForm.nazev,
            popis: stanekForm.popis || null,
            mesto: stanekForm.mesto,
            ulice: stanekForm.ulice,
            foto_url: stanekForm.foto_url || null,
            datum_od: stanekForm.datum_od,
            datum_do: stanekForm.datum_do,
            cas_od: stanekForm.cas_od,
            cas_do: stanekForm.cas_do,
          });

        if (error) throw error;
        Alert.alert('Úspěch', 'Stánek byl přidán');
      }

      // Reset formuláře
      setStanekForm({
        nazev: '',
        popis: '',
        mesto: '',
        ulice: '',
        foto_url: '',
        datum_od: '',
        datum_do: '',
        cas_od: '',
        cas_do: ''
      });
      setShowStanekForm(false);
      setEditujiciStanek(null);
      await loadStanky(farmar.id);
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit stánek');
    }
  };

  const handleEditovatStanek = (stanek: Stanek) => {
    setEditujiciStanek(stanek);
    setStanekForm({
      nazev: stanek.nazev,
      popis: stanek.popis || '',
      mesto: stanek.mesto,
      ulice: stanek.ulice,
      foto_url: stanek.foto_url || '',
      datum_od: stanek.datum_od,
      datum_do: stanek.datum_do,
      cas_od: stanek.cas_od,
      cas_do: stanek.cas_do,
    });
    setShowStanekForm(true);
  };

  const handleSmazatStanek = async (stanekId: string) => {
    Alert.alert(
      'Smazat stánek?',
      'Opravdu chcete smazat tento stánek?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('stanky')
                .delete()
                .eq('id', stanekId);

              if (error) throw error;
              Alert.alert('Úspěch', 'Stánek byl smazán');
              if (farmar?.id) {
                await loadStanky(farmar.id);
              }
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se smazat stánek');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {showStanekForm && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowStanekForm(false);
                setEditujiciStanek(null);
              }}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>🏪 Moje stánky</Text>
            <Text style={styles.headerSubtitle}>Správa stánků na trzích a farmářských trzích</Text>
          </View>
          {!showStanekForm && (
            <TouchableOpacity
              style={styles.addButtonHeader}
              onPress={() => {
                setEditujiciStanek(null);
                setStanekForm({
                  nazev: '',
                  popis: '',
                  mesto: '',
                  ulice: '',
                  foto_url: '',
                  datum_od: '',
                  datum_do: '',
                  cas_od: '',
                  cas_do: ''
                });
                setShowStanekForm(true);
              }}
            >
              <Text style={styles.addButtonHeaderText}>+ Přidat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Formulář pro přidání/editaci stánku */}
        {showStanekForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editujiciStanek ? '✏️ Upravit stánek' : '➕ Nový stánek'}
            </Text>

            <Text style={styles.label}>Název stánku *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Borůvkova farma - Farmářský trh"
              value={stanekForm.nazev}
              onChangeText={(text) => setStanekForm({ ...stanekForm, nazev: text })}
            />

            <Text style={styles.label}>Popis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Krátký popis co nabízíte na tomto stánku..."
              value={stanekForm.popis}
              onChangeText={(text) => setStanekForm({ ...stanekForm, popis: text })}
              multiline
              numberOfLines={3}
            />

            {/* Fotografie */}
            <Text style={styles.label}>Fotografie stánku</Text>
            {stanekForm.foto_url ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: stanekForm.foto_url }} style={styles.image} />
                <TouchableOpacity style={styles.deleteImageButton} onPress={handleSmazatFoto}>
                  <Text style={styles.deleteImageText}>🗑️ Smazat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleVybratFoto}
                disabled={uploadingImage}
              >
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>
                  {uploadingImage ? 'Nahrávám...' : 'Přidat fotografii'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionHeader}>📍 Umístění</Text>

            <Text style={styles.label}>Město *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Praha"
              value={stanekForm.mesto}
              onChangeText={(text) => setStanekForm({ ...stanekForm, mesto: text })}
            />

            <Text style={styles.label}>Ulice a číslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Václavské náměstí 1"
              value={stanekForm.ulice}
              onChangeText={(text) => setStanekForm({ ...stanekForm, ulice: text })}
            />

            <Text style={styles.sectionHeader}>📅 Časové údaje</Text>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Datum od *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025-01-15"
                  value={stanekForm.datum_od}
                  onChangeText={(text) => setStanekForm({ ...stanekForm, datum_od: text })}
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Datum do *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025-01-20"
                  value={stanekForm.datum_do}
                  onChangeText={(text) => setStanekForm({ ...stanekForm, datum_do: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Čas od *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  value={stanekForm.cas_od}
                  onChangeText={(text) => setStanekForm({ ...stanekForm, cas_od: text })}
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Čas do *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="18:00"
                  value={stanekForm.cas_do}
                  onChangeText={(text) => setStanekForm({ ...stanekForm, cas_do: text })}
                />
              </View>
            </View>

          </View>
        )}

        {/* Seznam stánků */}
        <View style={styles.stankyList}>
          {stanky.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyTitle}>Zatím nemáte žádné stánky</Text>
              <Text style={styles.emptyText}>
                Klikněte na "+ Přidat" a začněte prodávat na trzích a farmářských trzích
              </Text>
            </View>
          ) : (
            stanky.map((stanek) => (
              <View
                key={stanek.id}
                style={[
                  styles.stanekCard,
                  !stanek.aktivni && styles.stanekCardInaktivni
                ]}
              >
                {stanek.foto_url && (
                  <Image source={{ uri: stanek.foto_url }} style={styles.stanekImage} />
                )}

                <View style={styles.stanekContent}>
                  <View style={styles.stanekHeader}>
                    <Text style={[
                      styles.stanekNazev,
                      !stanek.aktivni && styles.stanekTextInaktivni
                    ]}>
                      {stanek.nazev}
                    </Text>
                    {!stanek.aktivni && (
                      <View style={styles.inaktivniBadge}>
                        <Text style={styles.inaktivniText}>Neaktivní</Text>
                      </View>
                    )}
                  </View>

                  {stanek.popis && (
                    <Text style={[
                      styles.stanekPopis,
                      !stanek.aktivni && styles.stanekTextInaktivni
                    ]}>
                      {stanek.popis}
                    </Text>
                  )}

                  <Text style={[
                    styles.stanekMisto,
                    !stanek.aktivni && styles.stanekTextInaktivni
                  ]}>
                    📍 {stanek.mesto}, {stanek.ulice}
                  </Text>

                  <Text style={[
                    styles.stanekDatum,
                    !stanek.aktivni && styles.stanekTextInaktivni
                  ]}>
                    📅 {stanek.datum_od} až {stanek.datum_do}
                  </Text>

                  <Text style={[
                    styles.stanekCas,
                    !stanek.aktivni && styles.stanekTextInaktivni
                  ]}>
                    🕐 {stanek.cas_od} - {stanek.cas_do}
                  </Text>

                  <View style={styles.stanekActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditovatStanek(stanek)}
                    >
                      <Text style={styles.editButtonText}>✏️ Upravit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleSmazatStanek(stanek.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Smazat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer s tlačítkem Uložit - zobrazí se jen když je formulář otevřený */}
      {showStanekForm && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUlozitStanek}
          >
            <Text style={styles.saveButtonText}>
              {editujiciStanek ? '💾 Uložit změny' : '➕ Přidat stánek'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MojeStankyScreen() {
  return (
    <ProtectedRoute>
      <MojeStankyScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#FF9800', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  backButton: { padding: 8, marginRight: 10 },
  backIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '600' },
  addButtonHeader: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonHeaderText: { color: '#FF9800', fontSize: 16, fontWeight: 'bold' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  content: { flex: 1 },
  formCard: { backgroundColor: '#FFFFFF', margin: 15, padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#E65100', marginBottom: 20, textAlign: 'center' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#E65100', marginTop: 20, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
  imageContainer: { marginBottom: 15 },
  image: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  deleteImageButton: { backgroundColor: '#FF5252', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteImageText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  uploadButton: { backgroundColor: '#FFF3E0', borderWidth: 2, borderColor: '#FF9800', borderStyle: 'dashed', borderRadius: 8, padding: 30, alignItems: 'center', marginBottom: 15 },
  uploadIcon: { fontSize: 40, marginBottom: 10 },
  uploadText: { color: '#E65100', fontSize: 16, fontWeight: '600' },
  saveButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  stankyList: { padding: 15 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#E65100', marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  stanekCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden' },
  stanekCardInaktivni: { opacity: 0.6 },
  stanekImage: { width: '100%', height: 180 },
  stanekContent: { padding: 15 },
  stanekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stanekNazev: { fontSize: 18, fontWeight: 'bold', color: '#E65100', flex: 1 },
  stanekTextInaktivni: { color: '#999' },
  stanekPopis: { fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 20 },
  stanekMisto: { fontSize: 14, color: '#666', marginBottom: 4 },
  stanekDatum: { fontSize: 14, color: '#666', marginBottom: 4 },
  stanekCas: { fontSize: 14, color: '#666', marginBottom: 12 },
  stanekActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editButton: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF5252', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  inaktivniBadge: { backgroundColor: '#FF5252', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  inaktivniText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
