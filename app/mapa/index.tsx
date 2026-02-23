import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import SegmentedSearchMode from '../components/SegmentedSearchMode';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { fetchProdejniMistaProMapu } from '../utils/locationService';
import { fetchFarmariProMapu } from '@/features/farmari/services/farmariService';
import { searchCitiesHybrid, HybridCityResult } from '@/features/mapa/services/citySearchHybridService';

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

// Rozšířený typ pro zobrazení v mapě - prodejní místo s info o farmáři
interface MapaPolozka {
  id: string; // Unikátní ID pro mapu (kombinace farmáře a místa)
  pestitel_id: number;
  prodejni_misto_id: number | null;
  nazev_farmy: string;
  nazev_mista: string | null; // Název prodejního místa (pokud existuje)
  mesto: string;
  popis: string | null;
  telefon: string;
  gps_lat: number | null;
  gps_lng: number | null;
  distance?: number;
  produkty?: string[];
  foto_url?: string | null;
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

/**
 * Vzdálenost bodu P od úsečky A→B (equirectangular, přesnost OK pro CZ < 500 km).
 * @returns vzdálenost v km
 */
function pointToSegmentKm(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const cosLat = Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const R = 6371;
  const bx = (bLng - aLng) * cosLat * R * Math.PI / 180;
  const by = (bLat - aLat) * R * Math.PI / 180;
  const px = (pLng - aLng) * cosLat * R * Math.PI / 180;
  const py = (pLat - aLat) * R * Math.PI / 180;
  const lenSq = bx * bx + by * by;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  return Math.sqrt((px - t * bx) ** 2 + (py - t * by) ** 2);
}

export default function MapaScreen() {
  // Odstraněna desktop detection - používáme pouze mobile-first layout
  // Tablet layout je řešen globálně přes AppLayout wrapper

  const [pestitele, setPestitele] = useState<MapaPolozka[]>([]);
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

  // Stánky po cestě – mód a cíl
  const [mode, setMode] = useState<'okolí' | 'cesta'>('okolí');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<HybridCityResult[]>([]);
  const [destination, setDestination] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [corridorKm, setCorridorKm] = useState(10);

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

  // Stánky po cestě – destination search
  const handleDestinationSearch = async (query: string) => {
    setDestinationQuery(query);
    if (query.length < 2) { setDestinationSuggestions([]); return; }
    try {
      const results = await searchCitiesHybrid(query, 5);
      setDestinationSuggestions(results);
    } catch {
      setDestinationSuggestions([]);
    }
  };

  const handleSelectDestination = (city: HybridCityResult) => {
    setDestination({ lat: city.gps_lat, lng: city.gps_lng, label: city.nazev });
    setDestinationQuery(city.nazev);
    setDestinationSuggestions([]);
    setFiltering(true);
    setTimeout(() => setFiltering(false), 600);
  };

  const handleResetMode = () => {
    setMode('okolí');
    setDestination(null);
    setDestinationQuery('');
    setDestinationSuggestions([]);
  };

  const loadPestitele = async () => {
    try {
      setLoading(true);

      // Paralelně: aktivní prodejní místa + všichni farmáři s GPS
      const [prodejniMistaData, pestiteleData] = await Promise.all([
        fetchProdejniMistaProMapu(),
        fetchFarmariProMapu(),
      ]);

      // Produkty pro filtrování (každý farmář → seznam názvů produktů)
      const { data: produktyData, error: produktyError } = await supabase
        .from('produkty')
        .select('pestitel_id, nazev');

      if (produktyError) {
        console.error('Chyba při načítání produktů:', produktyError);
      }

      const produktyMap = new Map<string, string[]>();
      produktyData?.forEach((p) => {
        const key = String(p.pestitel_id);
        if (!produktyMap.has(key)) produktyMap.set(key, []);
        produktyMap.get(key)?.push(p.nazev);
      });

      // Prodejní místa = primární body na mapě
      const farmariSMisty = new Set(prodejniMistaData.map(m => m.pestitel_id));
      const mapaPolozky: MapaPolozka[] = prodejniMistaData.map((misto) => ({
        id: `misto-${misto.id}`,
        pestitel_id: misto.pestitel_id,
        prodejni_misto_id: misto.id,
        nazev_farmy: misto.pestitel?.nazev_farmy ?? 'Neznámý farmář',
        nazev_mista: misto.nazev,
        mesto: misto.adresa ?? '',
        popis: misto.pestitel?.popis ?? null,
        telefon: misto.pestitel?.telefon ?? '',
        gps_lat: misto.lat,
        gps_lng: misto.lng,
        foto_url: misto.pestitel?.foto_url ?? null,
        produkty: produktyMap.get(String(misto.pestitel_id)) ?? [],
      }));

      // Farmáři BEZ aktivního prodejního místa = záložní body
      pestiteleData.forEach((p) => {
        if (!farmariSMisty.has(Number(p.id))) {
          mapaPolozky.push({
            id: `farmar-${p.id}`,
            pestitel_id: Number(p.id),
            prodejni_misto_id: null,
            nazev_farmy: p.nazev_farmy ?? 'Neznámý farmář',
            nazev_mista: null,
            mesto: p.mesto ?? '',
            popis: p.popis,
            telefon: p.telefon ?? '',
            gps_lat: p.gps_lat,
            gps_lng: p.gps_lng,
            foto_url: null,
            produkty: produktyMap.get(String(p.id)) ?? [],
          });
        }
      });

      console.log(`📍 ${mapaPolozky.length} bodů (${prodejniMistaData.length} míst, ${mapaPolozky.length - prodejniMistaData.length} farmářů bez místa)`);

      setPestitele(mapaPolozky);
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
        (p.nazev_mista && removeAccents(p.nazev_mista).includes(queryNormalized)) ||
        (p.popis && removeAccents(p.popis).includes(queryNormalized)) ||
        (p.produkty && p.produkty.length > 0 && p.produkty.some((produktNazev: string) =>
          removeAccents(produktNazev).includes(queryNormalized)
        ))
      );

      // Filtr podle vzdálenosti / koridoru:
      let matchesDistance: boolean;
      if (mode === 'cesta' && destination && userLocation && p.gps_lat && p.gps_lng) {
        // Mód "Po cestě": vzdálenost bodu od úsečky start→cíl
        matchesDistance = pointToSegmentKm(
          p.gps_lat, p.gps_lng,
          userLocation.lat, userLocation.lng,
          destination.lat, destination.lng
        ) <= corridorKm;
      } else {
        // Normální mód: vzdálenost od výchozí pozice
        matchesDistance =
          userLocation === null ||
          selectedDistance === null ||
          (p.distance !== undefined && p.distance <= selectedDistance);
      }

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
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header se šipkou zpět */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.back()}
        >
          <Text style={styles.menuIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hledat produkty</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          {/* Panel produktů */}
          <View style={styles.filtersPanel}>
            {/* Rozbalovací tlačítko */}
            <TouchableOpacity
              style={styles.produktyToggle}
              onPress={() => setShowProduktyFilter(!showProduktyFilter)}
            >
              <View style={styles.produktyToggleLeft}>
                <Text style={styles.produktyToggleIcon}>🧺</Text>
                <View>
                  <Text style={styles.produktyToggleTitle}>Co hledáte?</Text>
                  <Text style={styles.produktyToggleSubtitle}>
                    {selectedProdukty.length > 0
                      ? `Vybráno: ${selectedProdukty.length} produktů`
                      : 'Vyberte produkty'}
                  </Text>
                </View>
              </View>
              <Text style={styles.produktyToggleArrow}>{showProduktyFilter ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Seznam produktů - rozbalený */}
            {showProduktyFilter && (
              <View style={styles.produktyCard}>
                <View style={styles.produktyGrid}>
                  {produkty.map((produkt) => (
                    <TouchableOpacity
                      key={produkt.id}
                      style={[
                        styles.produktChip,
                        selectedProdukty.includes(produkt.id) && styles.produktChipActive
                      ]}
                      onPress={() => toggleProdukt(produkt.id)}
                    >
                      <Text style={styles.produktEmoji}>{produkt.emoji}</Text>
                      <Text style={[
                        styles.produktText,
                        selectedProdukty.includes(produkt.id) && styles.produktTextActive
                      ]}>
                        {produkt.nazev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Přepínač módů: V okolí / Po cestě */}
            <View style={styles.modeToggleRow}>
              <SegmentedSearchMode
                mode={mode === 'okolí' ? 'near' : 'route'}
                onChange={(m) => {
                  if (m === 'near') handleResetMode();
                  else setMode('cesta');
                }}
              />
            </View>

            {/* Karta cíle – jen v módu 'cesta' */}
            {mode === 'cesta' && (
              <View style={styles.destinationCard}>
                <Text style={styles.destinationCardTitle}>🎯 Cíl cesty</Text>
                <TextInput
                  style={styles.destinationInput}
                  placeholder="Praha, Brno, Ostrava..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={destinationQuery}
                  onChangeText={handleDestinationSearch}
                />
                {destinationSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {destinationSuggestions.map(s => (
                      <TouchableOpacity
                        key={String(s.id)}
                        style={styles.suggestionRow}
                        onPress={() => handleSelectDestination(s)}
                      >
                        <Text style={styles.suggestionText}>
                          {s.nazev}{s.okres ? `, ${s.okres}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {destination && (
                  <View style={styles.corridorRow}>
                    <Text style={styles.corridorLabel}>Koridor:</Text>
                    {[5, 10, 20].map(km => (
                      <TouchableOpacity
                        key={km}
                        style={[styles.corridorBtn, corridorKm === km && styles.corridorBtnActive]}
                        onPress={() => { setCorridorKm(km); setFiltering(true); setTimeout(() => setFiltering(false), 400); }}
                      >
                        <Text style={[styles.corridorBtnText, corridorKm === km && styles.corridorBtnTextActive]}>
                          {km} km
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!userLocation && (
                  <Text style={styles.warningText}>⚠️ Povolte sdílení polohy pro funkci Po cestě</Text>
                )}
              </View>
            )}

            {/* Sekce Kde hledat */}
            <View style={styles.locationCard}>
              <Text style={styles.locationCardTitle}>Kde hledat</Text>
              <Text style={styles.locationCardSubtitle}>Výchozí pozice</Text>

              {/* Toggle tlačítka */}
              <View style={styles.locationToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.locationToggleBtn,
                    locationSource === 'gps' && styles.locationToggleBtnActive
                  ]}
                  onPress={useMyLocation}
                >
                  <Text style={styles.locationToggleBtnIcon}>📍</Text>
                  <Text style={[
                    styles.locationToggleBtnText,
                    locationSource === 'gps' && styles.locationToggleBtnTextActive
                  ]}>
                    Moje poloha
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationToggleBtn,
                    locationSource === 'address' && styles.locationToggleBtnActive
                  ]}
                  onPress={() => setLocationSource('address')}
                >
                  <Text style={styles.locationToggleBtnIcon}>🔍</Text>
                  <Text style={[
                    styles.locationToggleBtnText,
                    locationSource === 'address' && styles.locationToggleBtnTextActive
                  ]}>
                    Jiný start
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Input pro zadání adresy - pouze pokud je vybrán "Jiný start" */}
              {locationSource === 'address' && (
                <View style={styles.addressInputContainer}>
                  <TextInput
                    style={styles.locationAddressInput}
                    placeholder="Město nebo obec..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={addressInput}
                    onChangeText={setAddressInput}
                    onSubmitEditing={() => geocodeAddress(addressInput)}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={[styles.addressSearchBtn, geocoding && styles.addressSearchBtnDisabled]}
                    onPress={() => geocodeAddress(addressInput)}
                    disabled={geocoding}
                  >
                    <Text style={styles.addressSearchBtnText}>
                      {geocoding ? '...' : 'Najít'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Zobrazení aktuální polohy */}
              {locationLabel && (
                <View style={styles.currentLocationInfo}>
                  <Text style={styles.currentLocationIcon}>
                    {locationSource === 'gps' ? '📍' : '🔍'}
                  </Text>
                  <Text style={styles.currentLocationLabel}>{locationLabel}</Text>
                </View>
              )}
            </View>

            {/* Sekce Perimetr – skryta v cestovním módu */}
            {mode === 'okolí' && <View style={styles.perimeterCard}>
              <Text style={styles.perimeterCardTitle}>Maximální vzdálenost od výchozí pozice</Text>

              <View style={styles.perimeterRow}>
                {[5, 10, 20, 30, 50].map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[
                      styles.perimeterBtn,
                      selectedDistance === km && styles.perimeterBtnActive
                    ]}
                    onPress={() => handleDistanceChange(km)}
                  >
                    <Text style={[
                      styles.perimeterBtnText,
                      selectedDistance === km && styles.perimeterBtnTextActive
                    ]}>
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.perimeterBtnAll,
                  selectedDistance === null && styles.perimeterBtnAllActive
                ]}
                onPress={() => handleDistanceChange(null)}
              >
                <Text style={[
                  styles.perimeterBtnAllText,
                  selectedDistance === null && styles.perimeterBtnAllTextActive
                ]}>
                  Bez omezení
                </Text>
              </TouchableOpacity>
            </View>}

            {/* Sekce Výsledky - Nalezení farmáři */}
            <View style={styles.resultsCard}>
              <Text style={styles.resultsCardTitle}>
                {filtering
                  ? 'Hledám...'
                  : mode === 'cesta' && destination
                    ? `${filteredPestitele.length} míst po cestě do ${destination.label}`
                    : `Nalezeno ${filteredPestitele.length} farmářů`}
              </Text>

              {filtering ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : filteredPestitele.length === 0 ? (
                <View style={styles.emptyResultsContainer}>
                  <Text style={styles.emptyResultsText}>
                    Žádní farmáři nenalezeni. Zkuste změnit filtry.
                  </Text>
                </View>
              ) : (
                <View style={styles.farmersList}>
                  {filteredPestitele.map((farmer: any) => (
                    <TouchableOpacity
                      key={farmer.id}
                      style={styles.farmerRow}
                      onPress={() => router.push(`/farmar/${farmer.pestitel_id}`)}
                    >
                      <View style={styles.farmerRowInfo}>
                        <Text style={styles.farmerRowName}>{farmer.nazev_farmy}</Text>
                        {farmer.nazev_mista && (
                          <Text style={styles.farmerRowMistoName}>📍 {farmer.nazev_mista}</Text>
                        )}
                        <Text style={styles.farmerRowMesto}>{farmer.mesto}</Text>
                      </View>
                      <View style={styles.farmerRowRight}>
                        {farmer.distance !== undefined && (
                          <Text style={styles.farmerRowDistance}>
                            {farmer.distance < 1
                              ? `${Math.round(farmer.distance * 1000)} m`
                              : `${farmer.distance.toFixed(1)} km`}
                          </Text>
                        )}
                        <Text style={styles.farmerRowArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Plovoucí tlačítko Zavřít */}
      {showProduktyFilter && (
        <TouchableOpacity
          style={styles.floatingCloseBtn}
          onPress={() => setShowProduktyFilter(false)}
        >
          <Text style={styles.floatingCloseBtnText}>
            {selectedProdukty.length > 0 ? `Zavřít (${selectedProdukty.length})` : 'Zavřít'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  scrollContentDesktop: { paddingHorizontal: 24 },
  mainLayout: { flex: 1 },
  mainLayoutDesktop: { flexDirection: 'row', gap: 24 },
  filtersPanel: { flex: 0 },
  filtersPanelDesktop: { width: 380, maxWidth: 420, flexShrink: 0, flex: 0 },
  resultsPanel: { flex: 1 },
  resultsPanelDesktop: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  header: {
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuButton: {
    padding: 6,
  },
  menuIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '400',
  },

  // === ROZBALOVACÍ TOGGLE ===
  produktyToggle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  produktyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  produktyToggleIcon: {
    fontSize: 24,
  },
  produktyToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  produktyToggleSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  produktyToggleArrow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // === KARTA PRODUKTŮ ===
  produktyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    paddingBottom: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  produktyCardDesktop: {
    marginHorizontal: 0,
    padding: 20,
    maxWidth: 600,
  },
  produktyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  produktChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  produktChipActive: {
    backgroundColor: '#FF9800',
  },
  produktEmoji: {
    fontSize: 16,
  },
  produktText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  produktTextActive: {
    color: '#ffffff',
  },

  // === PLOVOUCÍ TLAČÍTKO ===
  floatingCloseBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // === SEKCE KDE HLEDAT ===
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  locationCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  locationCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  locationToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  locationToggleBtnActive: {
    backgroundColor: '#FF9800',
  },
  locationToggleBtnIcon: {
    fontSize: 14,
  },
  locationToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  locationToggleBtnTextActive: {
    color: '#ffffff',
  },
  addressInputContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  locationAddressInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addressSearchBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSearchBtnDisabled: {
    opacity: 0.5,
  },
  addressSearchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  currentLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  currentLocationIcon: {
    fontSize: 14,
  },
  currentLocationLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },

  // === SEKCE PERIMETR ===
  perimeterCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  perimeterCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  perimeterCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  perimeterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  perimeterBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  perimeterBtnActive: {
    backgroundColor: '#FF9800',
  },
  perimeterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  perimeterBtnTextActive: {
    color: '#ffffff',
  },
  perimeterBtnAll: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  perimeterBtnAllActive: {
    backgroundColor: '#FF9800',
  },
  perimeterBtnAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  perimeterBtnAllTextActive: {
    color: '#ffffff',
  },

  // === SEKCE VÝSLEDKY ===
  resultsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resultsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyResultsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  farmersList: {
    gap: 0,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  farmerRowInfo: {
    flex: 1,
  },
  farmerRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  farmerRowMistoName: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginBottom: 2,
  },
  farmerRowMesto: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  farmerRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farmerRowDistance: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9800',
  },
  farmerRowArrow: {
    fontSize: 20,
    color: '#FF9800',
    fontWeight: '300',
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
    color: '#ffffff',
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
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 6,
    padding: 10,
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
    marginHorizontal: 8,
    marginVertical: 3,
    borderRadius: 6,
    padding: 10,
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
    marginHorizontal: 8,
    marginVertical: 6,
    paddingVertical: 10,
    borderRadius: 6,
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

  // Stánky po cestě
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderColor: '#FF9800',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  modeBtnTextActive: {
    color: '#FF9800',
  },
  destinationCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  destinationCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  destinationInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  suggestionsBox: {
    marginTop: 4,
    backgroundColor: 'rgba(50,0,80,0.97)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  corridorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  corridorLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  corridorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  corridorBtnActive: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderColor: '#FF9800',
  },
  corridorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  corridorBtnTextActive: {
    color: '#FF9800',
  },
  warningText: {
    color: '#FFB74D',
    fontSize: 13,
    marginTop: 8,
  },
});
