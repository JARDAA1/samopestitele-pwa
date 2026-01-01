import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

interface Pestitel {
  id: string;
  nazev_farmy: string;
  jmeno: string;
  mesto: string;
  adresa: string | null;
  gps_lat: number;
  gps_lng: number;
  popis: string | null;
  telefon: string;
  produkty?: string[];
  kategorie?: string[];
  distance?: number;
}

const KATEGORIE = ['Zelenina', 'Ovoce', 'Vejce', 'Mléčné výrobky', 'Med', 'Ostatní'];

export default function MapaScreen() {
  const [pestitele, setPestitele] = useState<Pestitel[]>([]);
  const [filteredPestitele, setFilteredPestitele] = useState<Pestitel[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategorie, setSelectedKategorie] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const distanceOptions = [5, 10, 20, 30, 50, 999999];

  useEffect(() => {
    getUserLocation();
    loadPestitele();
  }, []);

  useEffect(() => {
    if (userLocation && pestitele.length > 0) {
      filterPestitele();
    }
  }, [selectedDistance, userLocation, pestitele, searchQuery, selectedKategorie]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, pestitele]);

  const getUserLocation = async () => {
    try {
      // Pro web používáme browser Geolocation API
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.log('Geolocation error:', error.message);
            // Výchozí poloha (střed ČR)
            setUserLocation({ latitude: 49.8175, longitude: 15.473 });
          }
        );
      } else {
        // Fallback na výchozí polohu
        console.log('Geolocation není podporována');
        setUserLocation({ latitude: 49.8175, longitude: 15.473 });
      }
    } catch (error) {
      console.error('Chyba při získávání polohy:', error);
      setUserLocation({ latitude: 49.8175, longitude: 15.473 });
    }
  };

  const loadPestitele = async () => {
    try {
      // Načteme farmáře
      const { data: pestiteleData, error: pestiteleError } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, jmeno, mesto, adresa, gps_lat, gps_lng, popis, telefon')
        .neq('gps_lat', 0)
        .neq('gps_lng', 0)
        .order('created_at', { ascending: false });

      if (pestiteleError) throw pestiteleError;

      // Pro každého farmáře načteme jeho produkty
      const pestiteleWithProdukty = await Promise.all(
        (pestiteleData || []).map(async (pestitel) => {
          const { data: produktyData } = await supabase
            .from('produkty')
            .select('nazev, kategorie')
            .eq('pestitel_id', pestitel.id);

          const produktyLowercase = produktyData?.map(p => p.nazev.toLowerCase()) || [];

          return {
            ...pestitel,
            produkty: produktyLowercase,
            kategorie: produktyData?.map(p => p.kategorie) || []
          };
        })
      );

      setPestitele(pestiteleWithProdukty);
    } catch (error) {
      console.error('Chyba při načítání pěstitelů:', error);
      if (Platform.OS !== 'web') {
        // Alert pouze na mobilních platformách
        // Na webu by to způsobilo problém
      }
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula - výpočet vzdálenosti mezi dvěma GPS body
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Poloměr Země v km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const generateSuggestions = () => {
    const query = searchQuery.toLowerCase().trim();
    const allProdukty = new Set<string>();

    pestitele.forEach(pestitel => {
      pestitel.produkty?.forEach(produkt => {
        if (produkt.includes(query)) {
          allProdukty.add(produkt);
        }
      });
    });

    setSuggestions(Array.from(allProdukty).slice(0, 5));
    setShowSuggestions(true);
  };

  const toggleKategorie = (kategorie: string) => {
    setSelectedKategorie(prev =>
      prev.includes(kategorie)
        ? prev.filter(k => k !== kategorie)
        : [...prev, kategorie]
    );
  };

  const filterPestitele = () => {
    if (!userLocation) {
      setFilteredPestitele(pestitele);
      return;
    }

    let filtered = pestitele
      .map((pestitel) => ({
        ...pestitel,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          pestitel.gps_lat,
          pestitel.gps_lng
        ),
      }))
      .filter((pestitel) => pestitel.distance! <= selectedDistance);

    // Filtr podle vyhledávacího dotazu (produkty)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(pestitel =>
        pestitel.produkty?.some(produkt => produkt.includes(query))
      );
    }

    // Filtr podle vybraných kategorií
    if (selectedKategorie.length > 0) {
      filtered = filtered.filter(pestitel =>
        pestitel.kategorie?.some((kat: string) => selectedKategorie.includes(kat))
      );
    }

    filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    setFilteredPestitele(filtered);
  };

  const handlePestitelPress = (pestitelId: string) => {
    router.push(`/pestitele/${pestitelId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  const renderListHeader = useCallback(() => (
    <>
      {/* Vyhledávací pole */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat produkt (např. med, rajčata...)"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.trim().length > 0) {
              setShowSuggestions(true);
            }
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              setShowSuggestions(false);
            }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {/* Našeptávač */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setSearchQuery(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <Text style={styles.suggestionText}>🔍 {suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Checkboxy pro kategorie */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>🏷️ Kategorie:</Text>
        <View style={styles.categoryButtons}>
          {KATEGORIE.map((kategorie) => (
            <TouchableOpacity
              key={kategorie}
              style={[
                styles.categoryButton,
                selectedKategorie.includes(kategorie) && styles.categoryButtonActive,
              ]}
              onPress={() => toggleKategorie(kategorie)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedKategorie.includes(kategorie) && styles.categoryButtonTextActive,
                ]}
              >
                {selectedKategorie.includes(kategorie) ? '☑' : '☐'} {kategorie}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedKategorie.length > 0 && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => setSelectedKategorie([])}
          >
            <Text style={styles.clearFiltersText}>Zrušit výběr kategorií</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kilometrovník - filtr vzdálenosti */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>📍 Vzdálenost od vás:</Text>
        <View style={styles.distanceButtons}>
          {distanceOptions.map((distance) => (
            <TouchableOpacity
              key={distance}
              style={[
                styles.distanceButton,
                selectedDistance === distance && styles.distanceButtonActive,
              ]}
              onPress={() => setSelectedDistance(distance)}
            >
              <Text
                style={[
                  styles.distanceButtonText,
                  selectedDistance === distance && styles.distanceButtonTextActive,
                ]}
              >
                {distance >= 999999 ? 'Neomezeně' : `${distance} km`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          Nalezeno {filteredPestitele.length} farmářů {selectedDistance >= 999999 ? 'v celé ČR' : `do ${selectedDistance} km`}
        </Text>
      </View>
    </>
  ), [searchQuery, showSuggestions, suggestions, selectedKategorie, selectedDistance, filteredPestitele]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapa</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Seznam farmářů */}
      <FlatList
        data={filteredPestitele}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        removeClippedSubviews={false}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌾</Text>
            <Text style={styles.emptyTitle}>Žádní farmáři nenalezeni</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? `Produkt "${searchQuery}" není dostupný v okolí ${selectedDistance >= 999999 ? '' : `${selectedDistance} km`}.` : `V okolí ${selectedDistance >= 999999 ? 'není žádný farmář' : `${selectedDistance} km nejsou žádní farmáři`}.`}
              {'\n'}Zkuste zvětšit vzdálenost nebo změnit vyhledávání.
            </Text>
            {selectedDistance < 999999 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => {
                  const currentIndex = distanceOptions.indexOf(selectedDistance);
                  if (currentIndex < distanceOptions.length - 1) {
                    setSelectedDistance(distanceOptions[currentIndex + 1]);
                  }
                }}
              >
                <Text style={styles.expandButtonText}>
                  📍 Rozšířit hledání na {distanceOptions[Math.min(distanceOptions.indexOf(selectedDistance) + 1, distanceOptions.length - 1)] >= 999999 ? 'celou ČR' : `${distanceOptions[Math.min(distanceOptions.indexOf(selectedDistance) + 1, distanceOptions.length - 1)]} km`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item: pestitel, index }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handlePestitelPress(pestitel.id)}
            activeOpacity={0.6}
          >
            <View style={styles.listItemLeft}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName} numberOfLines={1}>
                  {pestitel.nazev_farmy}
                </Text>
                <Text style={styles.listItemLocation} numberOfLines={1}>
                  📍 {pestitel.mesto}
                </Text>
              </View>
            </View>
            <View style={styles.listItemRight}>
              <Text style={styles.listItemDistance}>
                {pestitel.distance?.toFixed(1)} km
              </Text>
              <Text style={styles.listItemArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSpacer: {
    width: 40,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },

  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 25,
    top: 25,
    padding: 5,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    maxHeight: 150,
    zIndex: 100,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },

  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#2E7D32', marginBottom: 10 },
  distanceButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  distanceButton: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  distanceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  distanceButtonText: { fontSize: 13, fontWeight: '600', color: '#666' },
  distanceButtonTextActive: { color: '#FFFFFF' },

  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#2E7D32',
  },
  clearFiltersButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#FF5252',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  infoBanner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  infoBannerText: { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },

  listContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  expandButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  expandButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  listItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 72,
  },

  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  listItemLocation: {
    fontSize: 14,
    color: '#666',
  },

  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemDistance: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 50,
  },
  listItemArrow: {
    fontSize: 28,
    color: '#CCC',
    fontWeight: '300',
  },
});
