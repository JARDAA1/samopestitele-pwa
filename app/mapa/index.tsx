import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
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

// Funkce pro normalizaci textu - odstraní diakritiku
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
  const [filtering, setFiltering] = useState(false); // Nový stav pro filtrování
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState<number | null>(10); // Výchozí 10km
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [produkty, setProdukty] = useState<PredefinovanyProdukt[]>([]);
  const [selectedProdukty, setSelectedProdukty] = useState<number[]>([]); // IDs vybraných produktů
  const [showProduktyFilter, setShowProduktyFilter] = useState(false);

  // Nové stavy pro zadávání adresy
  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'address' | null>(null); // Zdroj polohy
  const [locationLabel, setLocationLabel] = useState<string>(''); // Popis aktuální polohy

  // Pevné pořadí produktů
  const productOrder: { [key: string]: number } = {
    'Brambory': 1,
    'Cibule': 2,
    'Rajčata': 4,
    'Paprika': 5,
    'Okurky': 6,
    'Česnek': 7,
    'Saláty': 8,
    'Cuketa': 9,
    'Dýně': 10,
    'Jablka': 11,
    'Jahody': 12,
    'Třešně': 13,
    'Švestky': 14,
    'Hrušky': 15,
    'Maliny': 16,
    'Borůvky': 17,
    'Rybíz': 18,
    'Angrešt': 19,
  };

  useEffect(() => {
    loadPestitele();
    loadProdukty();
    // Automaticky získat polohu a spustit filtrování při načtení
    initializeLocationAndFilter();
  }, []);

  const initializeLocationAndFilter = async () => {
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
      setLocationSource('gps');
      setLocationLabel('Moje poloha (GPS)');

      // Automaticky spustit filtrování s výchozí vzdáleností 10km
      setFiltering(true);
      setTimeout(() => {
        setFiltering(false);
      }, 800);
    } catch (error) {
      console.error('Chyba při získávání lokace:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Povolení k lokaci zamítnuto');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (error) {
      console.error('Chyba při získávání lokace:', error);
      return null;
    }
  };

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      Alert.alert('Chyba', 'Zadejte prosím adresu');
      return;
    }

    setGeocoding(true);
    try {
      // Použijeme OpenStreetMap Nominatim API pro geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=cz&limit=1`,
        {
          headers: {
            'User-Agent': 'SamopestiteleMobileApp/1.0'
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setUserLocation({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        });
        setLocationSource('address');
        setLocationLabel(result.display_name.split(',').slice(0, 2).join(','));

        // Spustíme filtrování s novou lokací
        setFiltering(true);
        setTimeout(() => {
          filterPestitele();
        }, 100);
      } else {
        Alert.alert('Adresa nenalezena', 'Zkuste zadat adresu jinak nebo použít GPS lokaci');
      }
    } catch (error) {
      console.error('Chyba při geocodingu:', error);
      Alert.alert('Chyba', 'Nepodařilo se najít zadanou adresu');
    } finally {
      setGeocoding(false);
    }
  };

  const useMyLocation = async () => {
    const location = await getUserLocation();
    if (location) {
      setUserLocation(location);
      setLocationSource('gps');
      setLocationLabel('Moje poloha (GPS)');
    }
    setAddressInput('');

    // Spustíme filtrování s GPS lokací
    setFiltering(true);
    setTimeout(() => {
      setFiltering(false);
    }, 800);
  };

  const loadProdukty = async () => {
    try {
      const { data, error } = await supabase
        .from('predefinovane_produkty')
        .select('id, nazev, emoji, kategorie');

      if (error) {
        console.error('Chyba při načítání produktů:', error);
        return;
      }

      // Seřadíme produkty podle pevného pořadí
      const sortedProdukty = (data || []).sort((a, b) => {
        const orderA = productOrder[a.nazev] || 999;
        const orderB = productOrder[b.nazev] || 999;
        return orderA - orderB;
      });

      setProdukty(sortedProdukty);
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const toggleProdukt = (produktId: number) => {
    setFiltering(true);
    setSelectedProdukty(prev =>
      prev.includes(produktId)
        ? prev.filter(id => id !== produktId)
        : [...prev, produktId]
    );
    // Delší zpoždění pro viditelný indikátor
    setTimeout(() => setFiltering(false), 800);
  };

  const handleDistanceChange = (distance: number | null) => {
    setFiltering(true);
    setSelectedDistance(distance);
    // Delší zpoždění pro viditelný indikátor
    setTimeout(() => setFiltering(false), 800);
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
      const query = searchQuery.trim();
      const queryNormalized = removeAccents(query);

      // Textové vyhledávání (pokud je něco napsáno)
      const matchesSearch = !query || (
        removeAccents(p.nazev_farmy).includes(queryNormalized) ||
        removeAccents(p.mesto).includes(queryNormalized) ||
        (p.popis && removeAccents(p.popis).includes(queryNormalized)) ||
        (p.produkty && p.produkty.length > 0 && p.produkty.some((produktNazev: string) =>
          removeAccents(produktNazev).includes(queryNormalized)
        ))
      );

      // Filtr podle vzdálenosti
      const matchesDistance =
        selectedDistance === null || // neomezeně
        (p.distance !== undefined && p.distance <= selectedDistance);

      // Filtr podle produktů (checkboxy)
      let matchesProdukty = true;
      if (selectedProdukty.length > 0) {
        // Získat názvy vybraných produktů (bez diakritiky)
        const selectedProduktNames = produkty
          .filter(prod => selectedProdukty.includes(prod.id))
          .map(prod => removeAccents(prod.nazev));

        // Kontrola, zda farmář má alespoň jeden z vybraných produktů (bez diakritiky)
        matchesProdukty = p.produkty && p.produkty.length > 0 &&
          p.produkty.some((produktNazev: string) => {
            const normalizedProduktNazev = removeAccents(produktNazev);
            return selectedProduktNames.some(selectedName =>
              normalizedProduktNazev.includes(selectedName) ||
              selectedName.includes(normalizedProduktNazev)
            );
          });
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
      {/* Header s tlačítkem zpět */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      {/* SEKCE 1: Co chci nakoupit */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🛒 Co chci nakoupit</Text>
        </View>

        {/* Textové vyhledávání */}
        <View style={styles.sectionContent}>
          <Text style={styles.subsectionLabel}>Napiš co hledáš</Text>
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
        <View style={styles.sectionContent}>
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
                  <View style={styles.produktTextContainer}>
                    <Text style={styles.produktEmoji}>{produkt.emoji}</Text>
                    <Text style={styles.produktNazev}>{produkt.nazev}</Text>
                  </View>
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
      </View>

      {/* SEKCE 2: Kde to chci najít */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 Kde to chci najít</Text>
        </View>

        {/* Zadávání adresy */}
        <View style={styles.sectionContent}>
          {/* Když není nastavená žádná poloha - zobrazit obě možnosti */}
          {!locationSource && (
            <>
              <Text style={styles.subsectionLabel}>Vyber způsob určení polohy</Text>
              <TouchableOpacity
                style={styles.useMyLocationButton}
                onPress={useMyLocation}
              >
                <Text style={styles.useMyLocationText}>📍 Použít mou polohu (GPS)</Text>
              </TouchableOpacity>
              <Text style={styles.orDividerText}>nebo</Text>
              <View style={styles.addressInputRow}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="např. Hlavní 123, Praha"
                  value={addressInput}
                  onChangeText={setAddressInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                  onSubmitEditing={() => geocodeAddress(addressInput)}
                />
                <TouchableOpacity
                  style={[styles.geocodeButton, geocoding && styles.geocodeButtonDisabled]}
                  onPress={() => geocodeAddress(addressInput)}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.geocodeButtonText}>Hledat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Když je nastavená GPS - zobrazit badge a možnost zadat adresu */}
          {locationSource === 'gps' && (
            <>
              <View style={styles.currentLocationBadge}>
                <Text style={styles.currentLocationText}>
                  📍 {locationLabel}
                </Text>
              </View>
              <Text style={styles.subsectionLabel}>Nebo zadej jiné výchozí místo</Text>
              <View style={styles.addressInputRow}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="např. Hlavní 123, Praha"
                  value={addressInput}
                  onChangeText={setAddressInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                  onSubmitEditing={() => geocodeAddress(addressInput)}
                />
                <TouchableOpacity
                  style={[styles.geocodeButton, geocoding && styles.geocodeButtonDisabled]}
                  onPress={() => geocodeAddress(addressInput)}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.geocodeButtonText}>Hledat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Když je nastavená adresa - zobrazit badge a tlačítko pro návrat k GPS */}
          {locationSource === 'address' && (
            <>
              <View style={styles.currentLocationBadge}>
                <Text style={styles.currentLocationText}>
                  📮 {locationLabel}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.useMyLocationButton}
                onPress={useMyLocation}
              >
                <Text style={styles.useMyLocationText}>📍 Vrátit se k mé poloze (GPS)</Text>
              </TouchableOpacity>
              <Text style={styles.orDividerText}>nebo</Text>
              <Text style={styles.subsectionLabel}>Zadej jiné výchozí místo</Text>
              <View style={styles.addressInputRow}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="např. Hlavní 123, Praha"
                  value={addressInput}
                  onChangeText={setAddressInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                  onSubmitEditing={() => geocodeAddress(addressInput)}
                />
                <TouchableOpacity
                  style={[styles.geocodeButton, geocoding && styles.geocodeButtonDisabled]}
                  onPress={() => geocodeAddress(addressInput)}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.geocodeButtonText}>Hledat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Filtr vzdálenosti */}
        <View style={styles.sectionContent}>
          <Text style={styles.subsectionLabel}>Maximální vzdálenost od výchozího místa</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distanceButtonsScroll}>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 5 && styles.distanceButtonActive]}
            onPress={() => handleDistanceChange(5)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 5 && styles.distanceButtonTextActive]}>
              5 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 10 && styles.distanceButtonActive]}
            onPress={() => handleDistanceChange(10)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 10 && styles.distanceButtonTextActive]}>
              10 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 20 && styles.distanceButtonActive]}
            onPress={() => handleDistanceChange(20)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 20 && styles.distanceButtonTextActive]}>
              20 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === 30 && styles.distanceButtonActive]}
            onPress={() => handleDistanceChange(30)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === 30 && styles.distanceButtonTextActive]}>
              30 km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.distanceButton, selectedDistance === null && styles.distanceButtonActive]}
            onPress={() => handleDistanceChange(null)}
          >
            <Text style={[styles.distanceButtonText, selectedDistance === null && styles.distanceButtonTextActive]}>
              Neomezeně
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </View>

      {/* Indikátor filtrování nebo výsledky */}
      {filtering ? (
        <View style={styles.filteringIndicator}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.filteringText}>Vyhledávám...</Text>
        </View>
      ) : (
        (selectedDistance !== null || selectedProdukty.length > 0 || searchQuery.length > 0) && (
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {filteredPestitele.length === 0
                ? '❌ Nikoho jsem nenašel'
                : `✓ Nalezeno ${filteredPestitele.length} ${filteredPestitele.length === 1 ? 'farmář' : filteredPestitele.length < 5 ? 'farmáři' : 'farmářů'}`
              }
            </Text>
          </View>
        )
      )}

      {/* Seznam farmářů */}
      {filteredPestitele.length === 0 && !filtering ? (
        <View style={styles.emptyState}>
          {selectedDistance !== null || selectedProdukty.length > 0 || searchQuery.length > 0 ? (
            <>
              <Text style={styles.emptyTitle}>Bohužel nikoho jsem nenašel</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>🌾</Text>
              <Text style={styles.emptyTitle}>Vyberte vzdálenost nebo produkt</Text>
              <Text style={styles.emptyText}>
                Použijte filtr nahoře k vyhledání farmářů ve vaší blízkosti
              </Text>
            </>
          )}
        </View>
      ) : !filtering ? (
        <>
          {filteredPestitele.map((item, index) => (
            <TouchableOpacity
              key={item.id}
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
          ))}
        </>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  backArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#9C27B0',
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
  emptyImage: { width: 200, height: 200, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  produktyFilterHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    marginBottom: 8,
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
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  produktItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    marginBottom: 4,
  },
  produktTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  produktEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  produktNazev: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filteringIndicator: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 15,
  },
  filteringText: {
    fontSize: 18,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  addressInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  geocodeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  geocodeButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  geocodeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  useMyLocationButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  useMyLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  currentLocationBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  currentLocationText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  orDividerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
});
