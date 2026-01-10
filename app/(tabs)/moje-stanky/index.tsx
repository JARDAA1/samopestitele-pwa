import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';

interface Stanek {
  id: string;
  mesto: string;
  ulice: string;
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
  const [stanekForm, setStanekForm] = useState({
    mesto: '',
    ulice: '',
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

  const handleUlozitStanek = async () => {
    if (!farmar?.id) return;

    if (!stanekForm.mesto || !stanekForm.ulice || !stanekForm.datum_od ||
        !stanekForm.datum_do || !stanekForm.cas_od || !stanekForm.cas_do) {
      Alert.alert('Chyba', 'Vyplňte všechna pole');
      return;
    }

    try {
      if (editujiciStanek) {
        // Editace existujícího stánku
        const { error } = await supabase
          .from('stanky')
          .update({
            mesto: stanekForm.mesto,
            ulice: stanekForm.ulice,
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
            mesto: stanekForm.mesto,
            ulice: stanekForm.ulice,
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
        mesto: '',
        ulice: '',
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
      mesto: stanek.mesto,
      ulice: stanek.ulice,
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
          <View>
            <Text style={styles.headerTitle}>🏪 Moje stánky</Text>
            <Text style={styles.headerSubtitle}>Správa stánků na trzích</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={() => {
              setEditujiciStanek(null);
              setStanekForm({
                mesto: '',
                ulice: '',
                datum_od: '',
                datum_do: '',
                cas_od: '',
                cas_do: ''
              });
              setShowStanekForm(!showStanekForm);
            }}
          >
            <Text style={styles.addButtonHeaderText}>
              {showStanekForm ? '✕ Zrušit' : '+ Přidat'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🏪 Moje stánky ({stanky.length})</Text>
          </View>

          {/* Formulář pro přidání/editaci stánku */}
          {showStanekForm && (
            <View style={styles.stanekForm}>
              <Text style={styles.formTitle}>
                {editujiciStanek ? '✏️ Upravit stánek' : '➕ Nový stánek'}
              </Text>

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

              <Text style={styles.label}>Datum od *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (např. 2025-01-15)"
                value={stanekForm.datum_od}
                onChangeText={(text) => setStanekForm({ ...stanekForm, datum_od: text })}
              />

              <Text style={styles.label}>Datum do *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (např. 2025-01-20)"
                value={stanekForm.datum_do}
                onChangeText={(text) => setStanekForm({ ...stanekForm, datum_do: text })}
              />

              <Text style={styles.label}>Čas od *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (např. 08:00)"
                value={stanekForm.cas_od}
                onChangeText={(text) => setStanekForm({ ...stanekForm, cas_od: text })}
              />

              <Text style={styles.label}>Čas do *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (např. 18:00)"
                value={stanekForm.cas_do}
                onChangeText={(text) => setStanekForm({ ...stanekForm, cas_do: text })}
              />

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleUlozitStanek}
              >
                <Text style={styles.loginButtonText}>
                  {editujiciStanek ? '💾 Uložit změny' : '➕ Přidat stánek'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Seznam stánků */}
          {stanky.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsIcon}>🏪</Text>
              <Text style={styles.emptyProductsText}>
                Zatím nemáte žádné stánky{'\n'}
                Klikněte na "+ Přidat" a začněte prodávat na trzích
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
                <View style={styles.stanekHeader}>
                  <Text style={[
                    styles.stanekMesto,
                    !stanek.aktivni && styles.stanekTextInaktivni
                  ]}>
                    📍 {stanek.mesto}
                  </Text>
                  {!stanek.aktivni && (
                    <View style={styles.inaktivniBadge}>
                      <Text style={styles.inaktivniText}>Neaktivní</Text>
                    </View>
                  )}
                </View>

                <Text style={[
                  styles.stanekUlice,
                  !stanek.aktivni && styles.stanekTextInaktivni
                ]}>
                  {stanek.ulice}
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
            ))
          )}
        </View>
      </ScrollView>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  addButtonHeader: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonHeaderText: { color: '#FF9800', fontSize: 16, fontWeight: 'bold' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  content: { flex: 1 },
  card: { backgroundColor: '#FFFFFF', margin: 15, padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#E65100' },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  loginButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  emptyProducts: { alignItems: 'center', padding: 30 },
  emptyProductsIcon: { fontSize: 50, marginBottom: 10 },
  emptyProductsText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  stanekForm: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 8, marginBottom: 15 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#E65100', marginBottom: 15 },
  stanekCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  stanekCardInaktivni: { backgroundColor: '#F5F5F5', opacity: 0.7 },
  stanekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stanekMesto: { fontSize: 18, fontWeight: 'bold', color: '#E65100' },
  stanekTextInaktivni: { color: '#999' },
  stanekUlice: { fontSize: 15, color: '#666', marginBottom: 8 },
  stanekDatum: { fontSize: 14, color: '#666', marginBottom: 4 },
  stanekCas: { fontSize: 14, color: '#666', marginBottom: 10 },
  stanekActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editButton: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, flex: 1, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF5252', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, flex: 1, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  inaktivniBadge: { backgroundColor: '#FF5252', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  inaktivniText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
});
