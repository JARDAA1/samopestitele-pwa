import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';
import { DrawerMenu } from '../../utils/DrawerMenu';
import { useDrawerMenu } from '../../utils/useDrawerMenu';
import { Feather } from '@expo/vector-icons';

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

function MojeProdejnaScreenContent() {
  const { isAuthenticated, farmar, authLevel, logout } = useFarmarAuth();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmarData, setFarmarData] = useState<FarmarData | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [archivovaneProdukty, setArchivovaneProdukty] = useState<Produkt[]>([]);
  const [pocetObjednavek, setPocetObjednavek] = useState(0);
  const [farmaInfoExpanded, setFarmaInfoExpanded] = useState(false);
  const [expandedProduktId, setExpandedProduktId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'aktivni' | 'archivovane'>('aktivni');

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
          await loadArchivovaneProdukty(farmar.id);
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
        await loadArchivovaneProdukty(farmar.id);
        await loadPocetObjednavek(farmar.id);
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
        .eq('archivovano', false) // Filtruj archivované produkty
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

  const loadArchivovaneProdukty = async (pestitelId: string) => {
    try {
      console.log('loadArchivovaneProdukty called with ID:', pestitelId);
      const { data, error } = await supabase
        .from('produkty')
        .select('*')
        .eq('pestitel_id', pestitelId)
        .eq('archivovano', true) // Načti pouze archivované produkty
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in loadArchivovaneProdukty:', error);
        throw error;
      }

      console.log('Archived products loaded successfully, count:', data?.length || 0);
      setArchivovaneProdukty(data || []);
    } catch (error) {
      console.error('Chyba při načítání archivovaných produktů:', error);
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
        <ActivityIndicator size="large" color="#7B1FA2" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  // Starý přihlašovací formulář ODSTRANĚN - nyní se používá /prihlaseni

  // PŘIHLÁŠENÝ FARMÁŘ - PRODEJNA
  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Kompaktní header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={openMenu}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {farmarData?.nazev_farmy}
          </Text>
          <TouchableOpacity
            style={styles.addButtonCircle}
            onPress={() => router.push('/moje-farma/nova-polozka')}
          >
            <View style={styles.addCircle}>
              <Text style={styles.addCirclePlus}>+</Text>
            </View>
            <Text style={styles.addCircleText}>Přidat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Přehled - kompaktní karty nahoře */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statBoxCompact}
            onPress={() => router.push('/moje-farma/seznam-produktu?filtr=vse')}
          >
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statNumberCompact}>{produkty.length}</Text>
            <Text style={styles.statLabelCompact}>Produktů</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBoxCompact}
            onPress={() => router.push('/moje-farma/seznam-produktu?filtr=skladem')}
          >
            <Text style={styles.statIcon}>✓</Text>
            <Text style={styles.statNumberCompact}>{produkty.filter(p => p.dostupnost).length}</Text>
            <Text style={styles.statLabelCompact}>Skladem</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBoxCompact}
            onPress={() => router.push('/moje-farma/objednavky')}
          >
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statNumberCompact}>{pocetObjednavek}</Text>
            <Text style={styles.statLabelCompact}>Objednávek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBoxCompact}
            onPress={() => setFarmaInfoExpanded(!farmaInfoExpanded)}
          >
            <Text style={styles.statIcon}>⚙️</Text>
            <Text style={styles.statLabelCompact}>Nastavení</Text>
          </TouchableOpacity>
        </View>

        {/* Informace o farmáři - sbalitelné */}
        {farmaInfoExpanded && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👤 Informace o farmě</Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => router.push('/moje-farma/upravit-farmu')}
              >
                <Text style={styles.editIconText}>✏️</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.profileHintText}>
              Zde můžete změnit PIN nebo svůj profil v sekci Můj profil
            </Text>

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

              <View style={styles.logoutInfoBox}>
                <Text style={styles.logoutInfoText}>
                  ℹ️ Zůstáváte přihlášeni do manuálního odhlášení. Nechcete-li být v prodejně trvale přihlášeni, zde se odhlaste.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/(tabs)/moje-farma/nastaveni-uctu')}
              >
                <Feather name="settings" size={20} color="#9C27B0" style={{ marginRight: 8 }} />
                <Text style={styles.settingsButtonText}>Nastavení účtu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleOdhlasit}
              >
                <Feather name="log-out" size={20} color="#F44336" style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>Odhlásit se</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Produkty */}
        <View style={styles.card}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'aktivni' && styles.activeTab]}
              onPress={() => setActiveTab('aktivni')}
            >
              <Text style={[styles.tabText, activeTab === 'aktivni' && styles.activeTabText]}>
                Aktivní ({produkty.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'archivovane' && styles.activeTab]}
              onPress={() => setActiveTab('archivovane')}
            >
              <Text style={[styles.tabText, activeTab === 'archivovane' && styles.activeTabText]}>
                Archiv ({archivovaneProdukty.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'aktivni' && produkty.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsIcon}>📦</Text>
              <Text style={styles.emptyProductsText}>
                Zatím nemáte žádné aktivní produkty{'\n'}
                Klikněte na "+ Přidat" a začněte prodávat
              </Text>
            </View>
          ) : activeTab === 'archivovane' && archivovaneProdukty.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsIcon}>📦</Text>
              <Text style={styles.emptyProductsText}>
                Zatím nemáte žádné archivované produkty
              </Text>
            </View>
          ) : (
            (activeTab === 'aktivni' ? produkty : archivovaneProdukty).map((produkt) => {
              const isExpanded = expandedProduktId === produkt.id;
              const isArchived = activeTab === 'archivovane';
              return (
                <View key={produkt.id} style={[styles.productCard, isArchived && styles.productCardArchived]}>
                  {/* Hlavní řádek produktu - klikatelný */}
                  <TouchableOpacity
                    style={styles.productRow}
                    onPress={() => setExpandedProduktId(isExpanded ? null : produkt.id)}
                  >
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    <View style={styles.productRowContent}>
                      <Text style={[styles.productName, isArchived && styles.productNameArchived]}>{produkt.nazev}</Text>
                      <Text style={[styles.productPrice, isArchived && styles.productPriceArchived]}>
                        {produkt.cena} Kč / {produkt.jednotka}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        isArchived ? styles.statusDotArchived : (produkt.dostupnost ? styles.statusDotAvailable : styles.statusDotUnavailable)
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
                            isArchived ? styles.archivedBadge : (produkt.dostupnost ? styles.availableBadge : styles.unavailableBadge)
                          ]}
                        >
                          <Text style={styles.availabilityText}>
                            {isArchived ? '📦 Archivováno' : (produkt.dostupnost ? '✓ Skladem' : '✗ Vyprodáno')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.editButton, isArchived && styles.editButtonArchived]}
                          onPress={() => router.push(`/moje-farma/upravit-produkt?id=${produkt.id}`)}
                        >
                          <Text style={[styles.editButtonText, isArchived && styles.editButtonTextArchived]}>✏️ Upravit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button pro přidání produktu */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/moje-farma/pridat-produkt')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#6A1B9A', paddingTop: 44, paddingBottom: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuButton: { padding: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  menuIcon: { fontSize: 24, color: '#FFFFFF', fontWeight: '400' },
  addButtonCircle: { alignItems: 'center', minWidth: 60 },
  addCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  addCirclePlus: { fontSize: 24, color: '#FFFFFF', fontWeight: 'bold', lineHeight: 24 },
  addCircleText: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 8 },
  loadingText: { marginTop: 10, fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  content: { flex: 1 },
  // Kompaktní statistiky nahoře
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  statBoxCompact: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statNumberCompact: { fontSize: 18, fontWeight: 'bold', color: '#FF9800', marginBottom: 2 },
  statLabelCompact: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  // Karty
  card: { backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  logoutInfoBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  logoutInfoText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 16, textAlign: 'center' },
  settingsButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  settingsButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  logoutButton: { backgroundColor: 'rgba(244,67,54,0.8)', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  infoGrid: { gap: 8 },
  profileHintText: { fontSize: 11, color: '#ffcc80', marginBottom: 10, fontStyle: 'italic', lineHeight: 16 },
  infoItem: { marginBottom: 6 },
  infoLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#ffffff', fontWeight: '500' },
  emptyProducts: { alignItems: 'center', padding: 20 },
  emptyProductsIcon: { fontSize: 36, marginBottom: 8 },
  emptyProductsText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 18 },
  productCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  productCardArchived: { backgroundColor: 'rgba(255,255,255,0.05)', opacity: 0.7 },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  expandIcon: { fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 18 },
  productRowContent: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  productNameArchived: { color: 'rgba(255,255,255,0.5)' },
  productPrice: { fontSize: 13, color: '#FF9800', fontWeight: '600' },
  productPriceArchived: { color: 'rgba(255,255,255,0.4)' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotAvailable: { backgroundColor: '#a5d6a7' },
  statusDotUnavailable: { backgroundColor: '#ef9a9a' },
  statusDotArchived: { backgroundColor: 'rgba(255,255,255,0.3)' },
  productDetails: { paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 },
  productImage: { width: '100%', height: 140, borderRadius: 8 },
  productDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
  productStock: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  productActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  availabilityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flex: 1, alignItems: 'center' },
  availableBadge: { backgroundColor: 'rgba(76, 175, 80, 0.3)' },
  unavailableBadge: { backgroundColor: 'rgba(244, 67, 54, 0.3)' },
  archivedBadge: { backgroundColor: 'rgba(255,255,255,0.1)' },
  availabilityText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  editButton: { backgroundColor: '#FF9800', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6, flex: 1, alignItems: 'center' },
  editButtonArchived: { backgroundColor: 'rgba(255,255,255,0.2)' },
  editButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  editButtonTextArchived: { color: '#FFFFFF' },
  editIconButton: { padding: 6 },
  editIconText: { fontSize: 18 },
  tabsContainer: { flexDirection: 'row', marginBottom: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', padding: 3 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  activeTabText: { color: '#ffffff' },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  fabText: { fontSize: 28, color: '#FFFFFF', fontWeight: '300' },
});
