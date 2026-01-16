import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';

interface Pestitel {
  id: string;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
  gps_lat: number | null;
  gps_lng: number | null;
  distance?: number; // Vzdálenost v km
}

interface PredefinovanyProdukt {
  id: number;
  nazev: string;
  emoji: string;
  kategorie: string;
}

// Haversine vzorec pro výpočet vzdálenosti mezi dvěma GPS body
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Poloměr Země v km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapaScreen() {
  const [pestitele, setPestitele] = useState<Pestitel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null); // null = neomezeně
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [produkty, setProdukty] = useState<PredefinovanyProdukt[]>([]);
  const [selectedProdukty, setSelectedProdukty] = useState<number[]>([]); // IDs vybraných produktů
  const [showProduktyFilter, setShowProduktyFilter] = useState(false);

  useEffect(() => {
    loadPestitele();
    getUserLocation();
    loadProdukty();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Povolení k lokaci zamítnuto');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Chyba při získávání lokace:', error);
    }
  };

  const loadProdukty = async () => {
    try {
      const { data, error } = await supabase
        .from('predefinovane_produkty')
        .select('id, nazev, emoji, kategorie')
        .order('kategorie', { ascending: true })
        .order('nazev', { ascending: true });

      if (error) {
        console.error('Chyba při načítání produktů:', error);
        return;
      }

      setProdukty(data || []);
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const toggleProdukt = (produktId: number) => {
    setSelectedProdukty(prev =>
      prev.includes(produktId)
        ? prev.filter(id => id !== produktId)
        : [...prev, produktId]
    );
  };

  const loadPestitele = async () => {
    try {
      setLoading(true);

      // Načíst farmáře
      const { data: pestiteleData, error: pestiteleError } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, mesto, popis, telefon, gps_lat, gps_lng')
        .order('nazev_farmy', { ascending: true });

      if (pestiteleError) {
        console.error('Chyba při načítání pěstitelů:', pestiteleError);
        return;
      }

      // Načíst produkty pro každého farmáře
      const { data: produktyData, error: produktyError } = await supabase
        .from('produkty')
        .select('pestitel_id, nazev');

      if (produktyError) {
        console.error('Chyba při načítání produktů:', produktyError);
      }

      // Vytvoření mapy produktů podle pestitel_id
      const produktyMap = new Map<string, string[]>();
      if (produktyData) {
        console.log('🔍 První 3 produkty z databáze:', produktyData.slice(0, 3));
        produktyData.forEach((p) => {
          const key = String(p.pestitel_id);
          if (!produktyMap.has(key)) {
            produktyMap.set(key, []);
          }
          produktyMap.get(key)?.push(p.nazev);
        });
        console.log('🗺️ Mapa produktů podle pestitel_id:', Array.from(produktyMap.entries()));
      }

      // Přidání produktů k farmářům
      const pestiteleWithProducts = (pestiteleData || []).map((p) => ({
        ...p,
        produkty: produktyMap.get(String(p.id)) || [],
      }));

      // Debug: Výpis počtu farmářů s produkty
      const countWithProducts = pestiteleWithProducts.filter(p => p.produkty.length > 0).length;
      console.log(`📊 Načteno ${pestiteleWithProducts.length} farmářů, ${countWithProducts} má přidané produkty`);
      console.log(`📦 Celkem produktů v databázi: ${produktyData?.length || 0}`);
      console.log('👨‍🌾 Farmáři s jejich produkty:', pestiteleWithProducts.map(p => ({
        id: p.id,
        nazev: p.nazev_farmy,
        pocet_produktu: p.produkty.length,
        produkty: p.produkty
      })));

      setPestitele(pestiteleWithProducts as any);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPestitele = pestitele
    .map((p: any) => {
      // Výpočet vzdálenosti pokud máme GPS data
      if (userLocation && p.gps_lat && p.gps_lng) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          p.gps_lat,
          p.gps_lng
        );
        return { ...p, distance };
      }
      return p;
    })
    .filter((p: any) => {
      // Filtr podle textu
      const query = searchQuery.toLowerCase().trim();

      // Textové vyhledávání (pokud je něco napsáno)
      const matchesSearch = !query || (
        p.nazev_farmy.toLowerCase().includes(query) ||
        p.mesto.toLowerCase().includes(query) ||
        (p.popis && p.popis.toLowerCase().includes(query)) ||
        (p.produkty && p.produkty.length > 0 && p.produkty.some((produktNazev: string) =>
          produktNazev.toLowerCase().includes(query)
        ))
      );

      // Filtr podle vzdálenosti
      const matchesDistance =
        selectedDistance === null || // neomezeně
        (p.distance !== undefined && p.distance <= selectedDistance);

      // Filtr podle produktů (checkboxy)
      let matchesProdukty = true;
      if (selectedProdukty.length > 0) {
        // Získat názvy vybraných produktů
        const selectedProduktNames = produkty
          .filter(prod => selectedProdukty.includes(prod.id))
          .map(prod => prod.nazev.toLowerCase());

        // Kontrola, zda farmář má alespoň jeden z vybraných produktů
        matchesProdukty = p.produkty && p.produkty.length > 0 &&
          p.produkty.some((produktNazev: string) =>
            selectedProduktNames.some(selectedName =>
              produktNazev.toLowerCase().includes(selectedName) ||
              selectedName.includes(produktNazev.toLowerCase())
            )
          );
      }

      return matchesSearch && matchesDistance && matchesProdukty;
    })
    .sort((a: any, b: any) => {
      // Seřazení podle vzdálenosti (pokud je k dispozici)
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header s vyhledáváním */}
      <View style={styles.header}>
        <View style={styles.searchHeaderRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.searchLabel}>Napiš co hledáš</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Hledat farmáře, město nebo produkt..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Filtr produktů */}
      <View style={styles.produktyFilterContainer}>
        <TouchableOpacity
          style={styles.produktyFilterHeader}
          onPress={() => setShowProduktyFilter(!showProduktyFilter)}
        >
          <Text style={styles.produktyFilterLabel}>
            Nebo vyber ze seznamu produktů {selectedProdukty.length > 0 && `(${selectedProdukty.length}) `}
            <Text style={styles.produktyFilterIcon}>{showProduktyFilter ? '▲' : '▼'}</Text>
          </Text>
        </TouchableOpacity>

        {showProduktyFilter && (
          <ScrollView style={styles.produktyList} nestedScrollEnabled>
            {produkty.map((produkt) => (
              <TouchableOpacity
                key={produkt.id}
                style={styles.produktItem}
                onPress={() => toggleProdukt(produkt.id)}
              >
                <Text style={styles.produktEmoji}>{produkt.emoji}</Text>
                <Text style={styles.produktNazev}>{produkt.nazev}</Text>
                <View style={[
                  styles.checkbox,
                  selectedProdukty.includes(produkt.id) && styles.checkboxChecked
                ]}>
                  {selectedProdukty.includes(produkt.id) && (
                    <Text style={styles.checkboxIcon}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Filtr vzdálenosti */}
      <View style={styles.distanceFilterContainer}>
        <Text style={styles.distanceFilterLabel}>Vzdálenost:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distanceButtonsScroll}>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 5 && styles.distanceButtonActive]}
            onPress={() => setSelectedDistance(5)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 5 && styles.distanceButtonTextActive]}>
              5 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 10 && styles.distanceButtonActive]}
            onPress={() => setSelectedDistance(10)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 10 && styles.distanceButtonTextActive]}>
              10 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 20 && styles.distanceButtonActive]}
            onPress={() => setSelectedDistance(20)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 20 && styles.distanceButtonTextActive]}>
              20 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 30 && styles.distanceButtonActive]}
            onPress={() => setSelectedDistance(30)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 30 && styles.distanceButtonTextActive]}>
              30 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === null && styles.distanceButtonActive]}
            onPress={() => setSelectedDistance(null)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === null && styles.distanceButtonTextActive]}>
              Neomezeně
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Počet výsledků */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredPestitele.length === 0
              ? 'Žádní farmáři nenalezeni'
              : `Nalezeno ${filteredPestitele.length} ${filteredPestitele.length === 1 ? 'farmář' : 'farmářů'}`
            }
          </Text>
        </View>
      )}

      {/* Seznam farmářů */}
      {filteredPestitele.length === 0 && searchQuery.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌾</Text>
          <Text style={styles.emptyTitle}>Zatím žádní farmáři</Text>
          <Text style={styles.emptyText}>
            Farmáři se budou zobrazovat zde, jakmile se zaregistrují
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPestitele}
          keyExtractor={(item) => item.id}
          style={styles.listContainer}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => router.push(`/pestitele/${item.id}`)}
            >
              <View style={styles.listItemContent}>
                <Text style={styles.listItemName}>{item.nazev_farmy}</Text>
                <Text style={styles.listItemDetail}>
                  {item.mesto}
                  {item.distance !== undefined && ` • ${item.distance.toFixed(1)} km`}
                </Text>
                <Text style={styles.listItemDetail}>
                  {item.telefon ? `📞 ${item.telefon}` : 'Kontakt neuveden'}
                </Text>
              </View>
              <Text style={styles.listItemArrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
  },
  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  searchLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  distanceFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  distanceFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  distanceButtonsScroll: {
    flexGrow: 0,
  },
  distanceButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  distanceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  distanceButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  distanceButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  listItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  listItemDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  listItemArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
  resultsInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsText: { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  produktyFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  produktyFilterHeader: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FF9800',
  },
  produktyFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  produktyFilterIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  produktyList: {
    maxHeight: 200,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#FF9800',
  },
  produktItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFB84D',
  },
  produktEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  produktNazev: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FFFFFF',
  },
  checkboxIcon: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
