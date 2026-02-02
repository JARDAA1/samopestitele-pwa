import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Alert, SafeAreaView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { DrawerMenu } from '../utils/DrawerMenu';
import { useDrawerMenu } from '../utils/useDrawerMenu';

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
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();
  const { width } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(false);

  // Desktop detection až po hydrataci (prevence React error #418)
  const isDesktop = isMounted && width >= 1024;

  const [pestitele, setPestitele] = useState<Pestitel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // Nový stav pro filtrování
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState<number | null>(15); // Výchozí 15km
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [produkty, setProdukty] = useState<PredefinovanyProdukt[]>([]);
  const [selectedProdukty, setSelectedProdukty] = useState<number[]>([]); // IDs vybraných produktů
  const [showProduktyFilter, setShowProduktyFilter] = useState(false);
  const [matchFilter, setMatchFilter] = useState<'all' | 'complete' | 'partial'>('all'); // Nový filtr
  const [expandedFarmers, setExpandedFarmers] = useState<{[key: string]: boolean}>({}); // Sledování expanded stavu pro každého farmáře

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
    setIsMounted(true);
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
      const userLoc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(userLoc);
      setLocationSource('gps');

      // Reverse geocoding - získat název místa z GPS souřadnic
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLoc.lat}&lon=${userLoc.lng}&accept-language=cs`,
          {
            headers: {
              'User-Agent': 'SamopestiteleMobileApp/1.0'
            }
          }
        );
        const data = await response.json();
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
          const district = data.address.suburb || data.address.district;
          const label = district && city ? `${city}, ${district}` : city || 'Aktuální poloha';
          setLocationLabel(label);
        } else {
          setLocationLabel('Aktuální poloha');
        }
      } catch (error) {
        console.error('Chyba při reverse geocodingu:', error);
        setLocationLabel('Aktuální poloha');
      }

      // Automaticky spustit filtrování s výchozí vzdáleností 15km
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

        // Filtrování se provede automaticky díky reaktivitě filteredPestitele
        setFiltering(false);
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

      // Reverse geocoding - získat název místa z GPS souřadnic
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=cs`,
          {
            headers: {
              'User-Agent': 'SamopestiteleMobileApp/1.0'
            }
          }
        );
        const data = await response.json();
        if (data && data.address) {
          // Vytvoříme hezký label z adresy
          const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
          const district = data.address.suburb || data.address.district;
          const label = district && city ? `${city}, ${district}` : city || 'Aktuální poloha';
          setLocationLabel(label);
        } else {
          setLocationLabel('Aktuální poloha');
        }
      } catch (error) {
        console.error('Chyba při reverse geocodingu:', error);
        setLocationLabel('Aktuální poloha');
      }
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

  // Nová logika s match score a partial matching
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
    .map((p: any) => {
      // Výpočet match score pro vybrané produkty
      let matchScore = 0;
      let matchedProducts: string[] = [];
      let missingProducts: string[] = [];

      if (selectedProdukty.length > 0) {
        const selectedProduktNames = produkty
          .filter(prod => selectedProdukty.includes(prod.id))
          .map(prod => ({ id: prod.id, nazev: prod.nazev, nazevNorm: removeAccents(prod.nazev) }));

        selectedProduktNames.forEach(selectedProd => {
          const hasProduct = p.produkty && p.produkty.some((produktNazev: string) => {
            const normalizedProduktNazev = removeAccents(produktNazev);
            return normalizedProduktNazev.includes(selectedProd.nazevNorm) ||
                   selectedProd.nazevNorm.includes(normalizedProduktNazev);
          });

          if (hasProduct) {
            matchedProducts.push(selectedProd.nazev);
            matchScore++;
          } else {
            missingProducts.push(selectedProd.nazev);
          }
        });
      }

      return {
        ...p,
        matchScore,
        matchedProducts,
        missingProducts,
        matchPercentage: selectedProdukty.length > 0 ? (matchScore / selectedProdukty.length) * 100 : 100,
        hasCompleteMatch: selectedProdukty.length > 0 && matchScore === selectedProdukty.length
      };
    })
    .filter((p: any) => {
      // Filtr podle textu
      const query = searchQuery.trim();
      const queryNormalized = removeAccents(query);

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
        selectedDistance === null ||
        (p.distance !== undefined && p.distance <= selectedDistance);

      // Filtr podle produktů - zobrazit všechny, kteří mají alespoň 1 produkt
      const matchesProdukty = selectedProdukty.length === 0 || p.matchScore > 0;

      return matchesSearch && matchesDistance && matchesProdukty;
    })
    .sort((a: any, b: any) => {
      // Řazení: 1) kompletní match nahoře, 2) podle match score, 3) podle vzdálenosti
      if (selectedProdukty.length > 0) {
        // Kompletní match first
        if (a.hasCompleteMatch && !b.hasCompleteMatch) return -1;
        if (!a.hasCompleteMatch && b.hasCompleteMatch) return 1;

        // Pak podle match score
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
      }

      // Nakonec podle vzdálenosti
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    })
    .filter((p: any) => {
      // Aplikovat matchFilter pouze pokud byly vybrány produkty
      if (selectedProdukty.length === 0) return true;

      if (matchFilter === 'complete') {
        return p.hasCompleteMatch;
      } else if (matchFilter === 'partial') {
        return !p.hasCompleteMatch && p.matchScore > 0;
      }
      return true; // 'all'
    });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Minimalistický header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openMenu}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hledat produkty</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          {/* Levý panel - filtry */}
          <View style={[styles.filtersPanel, isDesktop && styles.filtersPanelDesktop]}>
            {/* Kompaktní filtr karta */}
            <View style={[styles.compactFilterCard, isDesktop && styles.compactFilterCardDesktop]}>
              {/* Vyhledávání */}
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInputCompact}
                  placeholder="🔍 Hledat produkt..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.filterToggleBtn, showProduktyFilter && styles.filterToggleBtnActive]}
                  onPress={() => setShowProduktyFilter(!showProduktyFilter)}
                >
                  <Text style={styles.filterToggleBtnText}>☰</Text>
                </TouchableOpacity>
              </View>

              {/* Produkty chips - jen když je otevřené */}
              {showProduktyFilter && (
                <View style={styles.chipGridCompact}>
                  {produkty.map((produkt) => (
                    <TouchableOpacity
                      key={produkt.id}
                      style={[
                        styles.chipCompact,
                        selectedProdukty.includes(produkt.id) && styles.chipCompactActive
                      ]}
                      onPress={() => toggleProdukt(produkt.id)}
                    >
                      <Text style={styles.chipEmojiCompact}>{produkt.emoji}</Text>
                      <Text style={[
                        styles.chipTextCompact,
                        selectedProdukty.includes(produkt.id) && styles.chipTextCompactActive
                      ]}>
                        {produkt.nazev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Lokalita - inline */}
              <View style={styles.locationRow}>
                <TouchableOpacity
                  style={styles.locationBtnCompact}
                  onPress={useMyLocation}
                >
                  <Text style={styles.locationBtnIcon}>📍</Text>
                  <Text style={styles.locationBtnText} numberOfLines={1}>
                    {locationLabel || 'Načítám polohu...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Vzdálenost - inline */}
              <View style={styles.distanceRow}>
                <Text style={styles.distanceLabel}>Vzdálenost:</Text>
                <View style={styles.distanceBtnsInline}>
                  {[5, 15, 30, null].map((dist) => (
                    <TouchableOpacity
                      key={dist || 'all'}
                      style={[styles.distBtnInline, selectedDistance === dist && styles.distBtnInlineActive]}
                      onPress={() => handleDistanceChange(dist)}
                    >
                      <Text style={[styles.distBtnInlineText, selectedDistance === dist && styles.distBtnInlineTextActive]}>
                        {dist ? `${dist}km` : '50+'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Jiná adresa - collapsible */}
              <TouchableOpacity
                style={styles.customAddressToggle}
                onPress={() => setAddressInput(addressInput ? '' : ' ')}
              >
                <Text style={styles.customAddressToggleText}>
                  {addressInput.trim() ? '✕ Zrušit vlastní adresu' : '+ Zadat jinou adresu'}
                </Text>
              </TouchableOpacity>

              {addressInput.trim() !== '' && (
                <View style={styles.customAddressRow}>
                  <TextInput
                    style={styles.addressInputCompact}
                    placeholder="Město, ulice..."
                    placeholderTextColor="#999"
                    value={addressInput.trim() === '' ? '' : addressInput}
                    onChangeText={setAddressInput}
                    autoCorrect={false}
                    autoCapitalize="words"
                    onSubmitEditing={() => geocodeAddress(addressInput)}
                  />
                  <TouchableOpacity
                    style={[styles.geocodeBtnCompact, geocoding && styles.geocodeBtnCompactDisabled]}
                    onPress={() => geocodeAddress(addressInput)}
                    disabled={geocoding}
                  >
                    {geocoding ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.geocodeBtnCompactText}>OK</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Pravý panel - výsledky */}
          <View style={[styles.resultsPanel, isDesktop && styles.resultsPanelDesktop]}>
            {/* Výsledky - farmáři */}
            {!filtering && (selectedDistance !== null || selectedProdukty.length > 0 || searchQuery.length > 0) && (
              <View style={[styles.resultsSection, isDesktop && styles.resultsSectionDesktop]}>
                <Text style={styles.resultsSectionTitle}>
                  Nalezeno {filteredPestitele.length} farmářů
                </Text>

                {/* Match filter - zobrazit jen pokud byly vybrány produkty */}
                {selectedProdukty.length > 0 && (
                  <View style={styles.matchFilterContainer}>
                    <TouchableOpacity
                      style={[styles.matchFilterBtn, matchFilter === 'all' && styles.matchFilterBtnActive]}
                      onPress={() => setMatchFilter('all')}>
                      <Text style={[styles.matchFilterText, matchFilter === 'all' && styles.matchFilterTextActive]}>
                        Všichni ({filteredPestitele.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.matchFilterBtn, matchFilter === 'complete' && styles.matchFilterBtnActive]}
                      onPress={() => setMatchFilter('complete')}>
                      <Text style={[styles.matchFilterText, matchFilter === 'complete' && styles.matchFilterTextActive]}>
                        Má vše ({filteredPestitele.filter(p => p.hasCompleteMatch).length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.matchFilterBtn, matchFilter === 'partial' && styles.matchFilterBtnActive]}
                      onPress={() => setMatchFilter('partial')}>
                      <Text style={[styles.matchFilterText, matchFilter === 'partial' && styles.matchFilterTextActive]}>
                        Částečná ({filteredPestitele.filter(p => !p.hasCompleteMatch && p.matchScore > 0).length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Seznam farmářů */}
            {!filtering && filteredPestitele.length > 0 && (
              <>
                {filteredPestitele.slice(0, 3).map((item) => {
                  const hasSelectedProducts = selectedProdukty.length > 0;
                  const isExpanded = expandedFarmers[item.id] || false;

                  return (
                    <View key={item.id} style={styles.farmerCardWrapper}>
                      <TouchableOpacity
                        style={[styles.farmerCard, isDesktop && styles.farmerCardDesktop]}
                        onPress={() => router.push(`/pestitele/${item.id}`)}
                      >
                        <View style={styles.farmerAvatar}>
                          <Text style={styles.farmerAvatarText}>
                            {item.nazev_farmy.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.farmerInfo}>
                          <Text style={styles.farmerName}>{item.nazev_farmy}</Text>
                          <View style={styles.farmerMeta}>
                            <Text style={styles.farmerDistance}>
                              📍 {item.distance !== undefined ? `${item.distance.toFixed(1)} km` : item.mesto}
                            </Text>
                            <Text style={styles.farmerRating}>⭐ 4.9</Text>
                          </View>

                          {/* Match indicator - zobrazit jen pokud byly vybrány produkty */}
                          {hasSelectedProducts && (
                            <View style={styles.matchIndicator}>
                              {item.hasCompleteMatch ? (
                                <View style={styles.matchBadgeComplete}>
                                  <Text style={styles.matchBadgeText}>✓ Má vše</Text>
                                </View>
                              ) : (
                                <View style={styles.matchBadgePartial}>
                                  <Text style={styles.matchBadgeTextPartial}>
                                    {item.matchScore}/{selectedProdukty.length} produktů
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                        <Text style={styles.farmerArrow}>›</Text>
                      </TouchableOpacity>

                      {/* Expandable sekce pro chybějící produkty */}
                      {hasSelectedProducts && !item.hasCompleteMatch && item.missingProducts.length > 0 && (
                        <>
                          <TouchableOpacity
                            style={[styles.expandButton, isDesktop && styles.expandButtonDesktop]}
                            onPress={() => setExpandedFarmers({
                              ...expandedFarmers,
                              [item.id]: !isExpanded
                            })}
                          >
                            <Text style={styles.expandButtonText}>
                              {isExpanded ? '▼' : '▶'} {isExpanded ? 'Skrýt' : 'Zobrazit'} chybějící produkty
                            </Text>
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={[styles.expandedSection, isDesktop && styles.expandedSectionDesktop]}>
                              <Text style={styles.expandedTitle}>Má tyto produkty:</Text>
                              {item.matchedProducts.map((prod: string, idx: number) => (
                                <Text key={idx} style={styles.productItemMatched}>
                                  ✓ {prod}
                                </Text>
                              ))}

                              <Text style={styles.expandedTitle}>Chybí:</Text>
                              {item.missingProducts.map((prod: string, idx: number) => (
                                <Text key={idx} style={styles.productItemMissing}>
                                  ✗ {prod}
                                </Text>
                              ))}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity style={[styles.showResultsButton, isDesktop && styles.showResultsButtonDesktop]}>
                  <Text style={styles.showResultsButtonText}>
                    Zobrazit výsledky
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Indikátor filtrování */}
            {filtering && (
              <View style={styles.filteringIndicator}>
                <ActivityIndicator size="large" color="#222222" />
                <Text style={styles.filteringText}>Vyhledávám...</Text>
              </View>
            )}

            {/* Empty state */}
            {!filtering && filteredPestitele.length === 0 && (selectedDistance !== null || searchQuery.length > 0) && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>😕</Text>
                <Text style={styles.emptyTitle}>Bohužel nikoho jsme nenašli</Text>
                <Text style={styles.emptyText}>
                  Zkuste změnit vzdálenost nebo vyhledat jiný produkt
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Plovoucí tlačítko pro zavření seznamu produktů */}
      {showProduktyFilter && (
        <TouchableOpacity
          style={styles.floatingCloseButton}
          onPress={() => setShowProduktyFilter(false)}
        >
          <Text style={styles.floatingCloseButtonIcon}>✕</Text>
          <Text style={styles.floatingCloseButtonText}>Zavřít seznam</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eeeeee' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  scrollContentDesktop: { paddingHorizontal: 24 },
  mainLayout: { flex: 1 },
  mainLayoutDesktop: { flexDirection: 'row', gap: 24 },
  filtersPanel: { flex: 0 },
  filtersPanelDesktop: { width: 380, maxWidth: 420, flexShrink: 0, flex: 0 },
  resultsPanel: { flex: 1 },
  resultsPanelDesktop: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 22,
    color: '#222222',
    fontWeight: '400',
  },

  // === KOMPAKTNÍ FILTR KARTA ===
  compactFilterCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  compactFilterCardDesktop: {
    marginHorizontal: 0,
    padding: 16,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInputCompact: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222',
  },
  filterToggleBtn: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: '#222',
  },
  filterToggleBtnText: {
    fontSize: 18,
    color: '#222',
  },

  // Chips compact
  chipGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    paddingTop: 4,
  },
  chipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chipCompactActive: {
    backgroundColor: '#222',
  },
  chipEmojiCompact: {
    fontSize: 14,
  },
  chipTextCompact: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  chipTextCompactActive: {
    color: '#fff',
  },

  // Location row
  locationRow: {
    marginBottom: 8,
  },
  locationBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationBtnIcon: {
    fontSize: 16,
  },
  locationBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },

  // Distance row
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  distanceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  distanceBtnsInline: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  distBtnInline: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  distBtnInlineActive: {
    backgroundColor: '#222',
  },
  distBtnInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  distBtnInlineTextActive: {
    color: '#fff',
  },

  // Custom address
  customAddressToggle: {
    paddingVertical: 6,
  },
  customAddressToggleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  customAddressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  addressInputCompact: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222',
  },
  geocodeBtnCompact: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  geocodeBtnCompactDisabled: {
    opacity: 0.5,
  },
  geocodeBtnCompactText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  distanceButtonsScroll: {
    flexGrow: 0,
  },
  distanceButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  distanceButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#222222',
  },
  distanceButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#222222',
  },
  distanceButtonTextActive: {
    color: '#222222',
    fontWeight: '700',
  },
  listContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  listItem: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
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
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  resultsText: { fontSize: 14, color: '#222222', fontWeight: '600', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyImage: { width: 200, height: 200, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#222222', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#222222', textAlign: 'center', lineHeight: 24 },
  produktyFilterHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  produktyFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  produktyFilterIcon: {
    fontSize: 16,
    color: '#222222',
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
    borderBottomColor: '#dddddd',
    backgroundColor: '#ffffff',
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
    borderColor: '#dddddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  checkboxIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filteringIndicator: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    gap: 15,
  },
  filteringText: {
    fontSize: 18,
    color: '#222222',
    fontWeight: 'bold',
  },
  addressInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addressInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dddddd',
    color: '#222222',
  },
  geocodeButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  geocodeButtonDisabled: {
    backgroundColor: '#ffffff',
    opacity: 0.5,
  },
  geocodeButtonText: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '600',
  },
  geocodeButtonFull: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  useMyLocationButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  useMyLocationText: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '600',
  },
  currentLocationBadge: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  currentLocationText: {
    fontSize: 13,
    color: '#222222',
    fontWeight: '500',
  },
  orDividerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginVertical: 6,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  filterToggleIcon: {
    fontSize: 14,
    color: '#666',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dddddd',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#222222',
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#222222',
    fontWeight: '700',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  locationButtonIcon: {
    fontSize: 20,
  },
  locationButtonText: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    marginBottom: 12,
  },
  locationBadgeText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
    flex: 1,
  },
  locationBadgeChange: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchSectionDesktop: {
    marginHorizontal: 0,
  },
  locationSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  locationSectionDesktop: {
    marginHorizontal: 0,
  },
  sectionMainTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationIcon: {
    fontSize: 20,
  },
  productListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    marginTop: 8,
    gap: 6,
  },
  productListButtonIcon: {
    fontSize: 18,
    color: '#222222',
  },
  productListButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  locationInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    gap: 8,
  },
  locationInputIcon: {
    fontSize: 18,
  },
  locationInputText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  locationInputPlaceholder: {
    color: '#999',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    marginTop: 8,
    gap: 6,
  },
  gpsButtonIcon: {
    fontSize: 16,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
    textAlign: 'right',
    marginBottom: 6,
  },
  distanceButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  distanceButtonSmall: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    alignItems: 'center',
  },
  distanceButtonSmallActive: {
    backgroundColor: '#ffffff',
    borderColor: '#222222',
  },
  distanceButtonSmallText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
  },
  distanceButtonSmallTextActive: {
    color: '#222222',
    fontWeight: '700',
  },
  resultsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultsSectionDesktop: {
    marginHorizontal: 0,
    marginTop: 16,
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  farmerCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  farmerCardDesktop: {
    marginHorizontal: 0,
  },
  farmerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dddddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  farmerMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  farmerDistance: {
    fontSize: 13,
    color: '#666',
  },
  farmerRating: {
    fontSize: 13,
    color: '#666',
  },
  farmerArrow: {
    fontSize: 24,
    color: '#CCC',
  },
  showResultsButton: {
    backgroundColor: '#222222',
    marginHorizontal: 10,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  showResultsButtonDesktop: {
    marginHorizontal: 0,
  },
  showResultsButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  matchFilterContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  matchFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dddddd',
    alignItems: 'center',
  },
  matchFilterBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#222222',
  },
  matchFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
  },
  matchFilterTextActive: {
    color: '#222222',
    fontWeight: '700',
  },
  farmerCardWrapper: {
    marginBottom: 12,
  },
  matchIndicator: {
    marginTop: 6,
  },
  matchBadgeComplete: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
  },
  matchBadgePartial: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  matchBadgeTextPartial: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
  },
  expandButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: -4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  expandButtonDesktop: {
    marginHorizontal: 0,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#222222',
    fontWeight: '500',
  },
  expandedSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: -4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  expandedSectionDesktop: {
    marginHorizontal: 0,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
    marginTop: 6,
    marginBottom: 3,
  },
  productItemMatched: {
    fontSize: 12,
    color: '#222222',
    marginLeft: 6,
    marginVertical: 1,
  },
  productItemMissing: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 6,
    marginVertical: 1,
  },
  // Plovoucí tlačítko pro zavření seznamu produktů
  floatingCloseButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  floatingCloseButtonIcon: {
    fontSize: 18,
    color: '#222222',
    fontWeight: '600',
    marginRight: 6,
  },
  floatingCloseButtonText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
  },
});
