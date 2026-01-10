import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';

interface FarmarData {
  id: string;
  nazev_farmy: string;
  jmeno: string;
  telefon: string;
  email: string;
  mesto: string;
  adresa: string | null;
  popis: string | null;
}

interface Produkt {
  id: string;
  nazev: string;
  popis: string | null;
  cena: number;
  mnozstvi: number | null;
  jednotka: string;
  dostupnost: boolean;
  foto_url: string | null;
}

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

function MojeProdejnaScreenContent() {
  const { isAuthenticated, farmar, authLevel, logout } = useFarmarAuth();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmarData, setFarmarData] = useState<FarmarData | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [pocetObjednavek, setPocetObjednavek] = useState(0);
  const [farmaInfoExpanded, setFarmaInfoExpanded] = useState(false);
  const [expandedProduktId, setExpandedProduktId] = useState<string | null>(null);

  // Stánky
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

  // Staré přihlašovací state proměnné - ODSTRANĚNO (nyní používáme /prihlaseni)

  useEffect(() => {
    if (isAuthenticated && farmar?.id) {
      checkLoginAndLoadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, farmar]);

  // Reload produktů při návratu na obrazovku
  useFocusEffect(
    useCallback(() => {
      const reloadIfLoggedIn = async () => {
        if (isAuthenticated && farmar?.id) {
          await loadProdukty(farmar.id);
        }
      };
      reloadIfLoggedIn();
    }, [isAuthenticated, farmar])
  );

  const checkLoginAndLoadData = async () => {
    try {
      if (farmar?.id) {
        setIsLoggedIn(true);
        await loadFarmarData(farmar.id);
        await loadProdukty(farmar.id);
        await loadPocetObjednavek(farmar.id);
        await loadStanky(farmar.id);
      }
    } catch (error) {
      console.error('Chyba při načítání dat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFarmarData = async (pestitelId: string) => {
    try {
      console.log('loadFarmarData called with ID:', pestitelId);
      const { data, error } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, jmeno, telefon, email, mesto, adresa, popis')
        .eq('id', pestitelId)
        .single();

      if (error) {
        console.error('Supabase error in loadFarmarData:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from loadFarmarData');
        return;
      }

      console.log('Farmer data loaded successfully:', data);
      setFarmarData(data);
    } catch (error) {
      console.error('Chyba při načítání dat farmáře:', error);
      // Nezobrazujeme alert, protože je to při přihlášení
    }
  };

  const loadProdukty = async (pestitelId: string) => {
    try {
      console.log('loadProdukty called with ID:', pestitelId);
      const { data, error } = await supabase
        .from('produkty')
        .select('*')
        .eq('pestitel_id', pestitelId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in loadProdukty:', error);
        throw error;
      }

      console.log('Products loaded successfully, count:', data?.length || 0);
      setProdukty(data || []);
    } catch (error) {
      console.error('Chyba při načítání produktů:', error);
      // Nezobrazujeme alert, protože je to při přihlášení
    }
  };

  const loadPocetObjednavek = async (pestitelId: string) => {
    try {
      const { count, error } = await supabase
        .from('objednavky')
        .select('*', { count: 'exact', head: true })
        .eq('pestitel_id', pestitelId);

      if (error) {
        console.error('Chyba při načítání počtu objednávek:', error);
        return;
      }

      setPocetObjednavek(count || 0);
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const loadStanky = async (pestitelId: string) => {
    try {
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
    }
  };

  const handleUlozitStanek = async () => {
    if (!farmarData?.id) return;

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
            pestitel_id: farmarData.id,
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
      await loadStanky(farmarData.id);
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
              if (farmarData?.id) {
                await loadStanky(farmarData.id);
              }
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se smazat stánek');
            }
          }
        }
      ]
    );
  };

  // Staré přihlašovací funkce ODSTRANĚNY - nyní se používá nový auth systém

  const handleOdhlasit = async () => {
    console.log('🔴 handleOdhlasit CALLED!');
    Alert.alert(
      'Odhlásit se?',
      'Opravdu se chcete odhlásit?',
      [
        {
          text: 'Zrušit',
          style: 'cancel',
          onPress: () => console.log('User cancelled logout')
        },
        {
          text: 'Odhlásit',
          style: 'destructive',
          onPress: async () => {
            console.log('🔴 User confirmed logout - calling logout()...');
            await logout();
            console.log('🔴 Logout complete - redirecting...');
            router.replace('/prihlaseni');
            console.log('🔴 Redirect called');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  // Starý přihlašovací formulář ODSTRANĚN - nyní se používá /prihlaseni

  // PŘIHLÁŠENÝ FARMÁŘ - PRODEJNA
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>🏪 {farmarData?.nazev_farmy}</Text>
            <Text style={styles.headerSubtitle}>Správa prodejny</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={() => router.push('/moje-farma/pridat-produkt')}
          >
            <Text style={styles.addButtonHeaderText}>+ Přidat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Informace o farmáři */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setFarmaInfoExpanded(!farmaInfoExpanded)}
          >
            <Text style={styles.cardTitle}>
              {farmaInfoExpanded ? '▼' : '▶'} 👤 Informace o farmě
            </Text>
            {farmaInfoExpanded && (
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => router.push('/moje-farma/upravit-farmu')}
              >
                <Text style={styles.editIconText}>✏️</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Text style={styles.profileHintText}>
            Zde můžete změnit PIN nebo svůj profil v sekci Můj profil
          </Text>

          {farmaInfoExpanded && (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Farmář:</Text>
                <Text style={styles.infoValue}>{farmarData?.jmeno}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Telefon:</Text>
                <Text style={styles.infoValue}>{farmarData?.telefon}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Město:</Text>
                <Text style={styles.infoValue}>{farmarData?.mesto}</Text>
              </View>

              {farmarData?.adresa && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Adresa:</Text>
                  <Text style={styles.infoValue}>{farmarData.adresa}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleOdhlasit}
              >
                <Text style={styles.logoutButtonText}>🚪 Odhlásit se</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Produkty */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Nabízené produkty ({produkty.length})</Text>

          {produkty.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsIcon}>📦</Text>
              <Text style={styles.emptyProductsText}>
                Zatím nemáte žádné produkty{'\n'}
                Klikněte na "+ Přidat" a začněte prodávat
              </Text>
            </View>
          ) : (
            produkty.map((produkt) => {
              const isExpanded = expandedProduktId === produkt.id;
              return (
                <View key={produkt.id} style={styles.productCard}>
                  {/* Hlavní řádek produktu - klikatelný */}
                  <TouchableOpacity
                    style={styles.productRow}
                    onPress={() => setExpandedProduktId(isExpanded ? null : produkt.id)}
                  >
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    <View style={styles.productRowContent}>
                      <Text style={styles.productName}>{produkt.nazev}</Text>
                      <Text style={styles.productPrice}>
                        {produkt.cena} Kč / {produkt.jednotka}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        produkt.dostupnost ? styles.statusDotAvailable : styles.statusDotUnavailable
                      ]}
                    />
                  </TouchableOpacity>

                  {/* Rozbalené detaily */}
                  {isExpanded && (
                    <View style={styles.productDetails}>
                      {produkt.foto_url && (
                        <Image source={{ uri: produkt.foto_url }} style={styles.productImage} />
                      )}
                      {produkt.popis && (
                        <Text style={styles.productDesc}>{produkt.popis}</Text>
                      )}
                      {produkt.mnozstvi !== null && produkt.mnozstvi !== undefined && (
                        <Text style={styles.productStock}>
                          📦 Skladem: {produkt.mnozstvi} {produkt.jednotka}
                        </Text>
                      )}
                      <View style={styles.productActions}>
                        <View
                          style={[
                            styles.availabilityBadge,
                            produkt.dostupnost ? styles.availableBadge : styles.unavailableBadge
                          ]}
                        >
                          <Text style={styles.availabilityText}>
                            {produkt.dostupnost ? '✓ Skladem' : '✗ Vyprodáno'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => router.push(`/moje-farma/upravit-produkt?id=${produkt.id}`)}
                        >
                          <Text style={styles.editButtonText}>✏️ Upravit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Přehled */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Přehled</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/moje-farma/seznam-produktu?filtr=vse')}
            >
              <Text style={styles.statNumber}>{produkty.length}</Text>
              <Text style={styles.statLabel}>Produktů</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/moje-farma/seznam-produktu?filtr=skladem')}
            >
              <Text style={styles.statNumber}>{produkty.filter(p => p.dostupnost).length}</Text>
              <Text style={styles.statLabel}>Skladem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/moje-farma/objednavky')}
            >
              <Text style={styles.statNumber}>{pocetObjednavek}</Text>
              <Text style={styles.statLabel}>Objednávek</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Moje stánky */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🏪 Moje stánky ({stanky.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
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
              <Text style={styles.addButtonText}>
                {showStanekForm ? '✕ Zrušit' : '+ Přidat stánek'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileHintText}>
            Zde můžete změnit PIN nebo svůj profil v sekci Můj profil
          </Text>

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
                Klikněte na "+ Přidat stánek" a začněte prodávat na trzích
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

export default function MojeProdejnaScreen() {
  return (
    <ProtectedRoute>
      <MojeProdejnaScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#4CAF50', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  addButtonHeader: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonHeaderText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  loginContent: { padding: 20, justifyContent: 'center', minHeight: '80%' },
  loginCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 25, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  loginIcon: { fontSize: 60, textAlign: 'center', marginBottom: 15 },
  loginTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 25 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  loginButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DDD' },
  dividerText: { marginHorizontal: 15, fontSize: 12, color: '#999', fontWeight: '600' },
  registerButton: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#4CAF50' },
  registerButtonText: { color: '#4CAF50', fontSize: 15, fontWeight: '600' },
  content: { flex: 1 },
  card: { backgroundColor: '#FFFFFF', margin: 15, padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  logoutLink: { color: '#FF5252', fontSize: 14, fontWeight: '600' },
  logoutButton: { backgroundColor: '#FF5252', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  logoutButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  infoGrid: { gap: 12 },
  profileHintText: { fontSize: 12, color: '#FF5252', marginBottom: 12, fontStyle: 'italic' },
  infoItem: { marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#666', marginBottom: 3 },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '500' },
  addButton: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyProducts: { alignItems: 'center', padding: 30 },
  emptyProductsIcon: { fontSize: 50, marginBottom: 10 },
  emptyProductsText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  productCard: { backgroundColor: '#F9F9F9', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  expandIcon: { fontSize: 14, color: '#666', width: 20 },
  productRowContent: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  productPrice: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotAvailable: { backgroundColor: '#4CAF50' },
  statusDotUnavailable: { backgroundColor: '#FF5252' },
  productDetails: { paddingHorizontal: 15, paddingBottom: 15, gap: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 10 },
  productImage: { width: '100%', height: 150, borderRadius: 8 },
  productDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  productStock: { fontSize: 13, color: '#666' },
  productActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  availabilityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, flex: 1, alignItems: 'center' },
  availableBadge: { backgroundColor: '#E8F5E9' },
  unavailableBadge: { backgroundColor: '#FFEBEE' },
  availabilityText: { fontSize: 12, fontWeight: '600' },
  editButton: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, flex: 1, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#E8F5E9', padding: 15, borderRadius: 8, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  // Nové styly pro SMS autentizaci
  infoTextSmall: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  inputCode: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 25 },
  backButton: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 10, alignItems: 'center', minWidth: 100 },
  backButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  resendButton: { marginTop: 15, alignItems: 'center' },
  resendText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  testBox: { backgroundColor: '#FFF3CD', borderColor: '#FFA000', borderWidth: 2, padding: 15, borderRadius: 8, marginBottom: 20 },
  testText: { fontSize: 12, fontWeight: 'bold', color: '#FF6F00', marginBottom: 5 },
  testCode: { fontSize: 24, fontWeight: 'bold', color: '#FF6F00' },
  editIconButton: { padding: 8 },
  editIconText: { fontSize: 20 },
  // Styly pro stánky
  stanekForm: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 8, marginBottom: 15 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  stanekCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  stanekCardInaktivni: { backgroundColor: '#F5F5F5', opacity: 0.7 },
  stanekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stanekMesto: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  stanekTextInaktivni: { color: '#999' },
  stanekUlice: { fontSize: 15, color: '#666', marginBottom: 8 },
  stanekDatum: { fontSize: 14, color: '#666', marginBottom: 4 },
  stanekCas: { fontSize: 14, color: '#666', marginBottom: 10 },
  stanekActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  deleteButton: { backgroundColor: '#FF5252', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, flex: 1, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  inaktivniBadge: { backgroundColor: '#FF5252', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  inaktivniText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
});
