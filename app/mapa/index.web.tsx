import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import SegmentedSearchMode from '../_components/SegmentedSearchMode';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { fetchProdejniMistaProMapu } from '../_utils/locationService';
import { fetchFarmariProMapu } from '@/features/farmari/services/farmariService';
import { searchCitiesHybrid, HybridCityResult } from '@/features/mapa/services/citySearchHybridService';
import { useCustomerList } from '@/shared/context/CustomerListContext';
import { getOrCreateCustomerId } from '../_utils/customerIdentity';

// ── Typy ────────────────────────────────────────────────────────
interface MapaPolozka {
  id: string;
  pestitel_id: number;
  prodejni_misto_id: number | null;
  nazev_farmy: string;
  nazev_mista: string | null;
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

// ── Pomocné funkce ───────────────────────────────────────────────
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentKm(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
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

// Mapa přes OpenStreetMap iframe (web-only)
function MapEmbed({ lat, lng, zoom = 8 }: { lat: number; lng: number; zoom?: number }) {
  const delta = 360 / Math.pow(2, zoom + 1);
  const bbox = `${lng - delta},${lat - delta / 2},${lng + delta},${lat + delta / 2}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    // @ts-ignore – iframe je validní HTML element ve web buildu
    <iframe
      src={src}
      title="Mapa farmáře"
      style={{ width: '100%', height: '100%', border: 'none' } as any}
    />
  );
}

function MapDefault() {
  // Výchozí pohled na ČR
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=12.0,48.5,18.9,51.1&layer=mapnik`;
  return (
    // @ts-ignore
    <iframe
      src={src}
      title="Mapa ČR"
      style={{ width: '100%', height: '100%', border: 'none' } as any}
    />
  );
}

// ── Hlavní komponenta ────────────────────────────────────────────
export default function MapaScreenWeb() {
  const { items: customerListItems } = useCustomerList();
  const [objednanyPestitelIds, setObjednanyPestitelIds] = useState<Set<number>>(new Set());

  const [pestitele, setPestitele] = useState<MapaPolozka[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState<number | null>(15);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [produkty, setProdukty] = useState<PredefinovanyProdukt[]>([]);
  const [selectedProdukty, setSelectedProdukty] = useState<number[]>([]);
  const [showProduktyFilter, setShowProduktyFilter] = useState(false);
  const [matchFilter, setMatchFilter] = useState<'all' | 'complete' | 'partial'>('all');

  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'address' | null>(null);
  const [locationLabel, setLocationLabel] = useState('');

  const [mode, setMode] = useState<'okolí' | 'cesta'>('okolí');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<HybridCityResult[]>([]);
  const [destination, setDestination] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [corridorKm, setCorridorKm] = useState(10);

  const [selectedFarmer, setSelectedFarmer] = useState<MapaPolozka | null>(null);

  const productOrder: { [key: string]: number } = {
    'Brambory': 1, 'Cibule': 2, 'Rajčata': 4, 'Paprika': 5, 'Okurky': 6,
    'Česnek': 7, 'Saláty': 8, 'Cuketa': 9, 'Dýně': 10, 'Jablka': 11,
    'Jahody': 12, 'Třešně': 13, 'Švestky': 14, 'Hrušky': 15, 'Maliny': 16,
    'Borůvky': 17, 'Rybíz': 18, 'Angrešt': 19,
  };

  useEffect(() => {
    loadPestitele();
    loadProdukty();
    initializeLocation();
    loadObjednavky();
  }, []);

  const loadObjednavky = async () => {
    try {
      const customerId = await getOrCreateCustomerId();
      const { data } = await supabase
        .from('objednavky').select('pestitel_id').eq('anon_customer_id', customerId.id);
      if (data) setObjednanyPestitelIds(new Set(data.map((o: any) => o.pestitel_id)));
    } catch { /* tiché selhání */ }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=cs`,
        { headers: { 'User-Agent': 'SamopestiteleWebApp/1.0' } }
      );
      const data = await resp.json();
      if (data?.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
        const district = data.address.suburb || data.address.district;
        return district && city ? `${city}, ${district}` : city || 'Aktuální poloha';
      }
    } catch { /* fall through */ }
    return 'Aktuální poloha';
  };

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const userLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(userLoc);
      setLocationSource('gps');
      setLocationLabel(await reverseGeocode(userLoc.lat, userLoc.lng));
      setFiltering(true);
      setTimeout(() => setFiltering(false), 800);
    } catch { /* GPS nedostupné */ }
  };

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) { Alert.alert('Chyba', 'Zadejte prosím adresu'); return; }
    setGeocoding(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=cz&limit=1`,
        { headers: { 'User-Agent': 'SamopestiteleWebApp/1.0' } }
      );
      const data = await resp.json();
      if (data?.length > 0) {
        const r = data[0];
        setUserLocation({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
        setLocationSource('address');
        setLocationLabel(r.display_name.split(',').slice(0, 2).join(','));
        setFiltering(false);
      } else {
        Alert.alert('Adresa nenalezena', 'Zkuste zadat adresu jinak');
      }
    } catch { Alert.alert('Chyba', 'Nepodařilo se najít adresu'); }
    finally { setGeocoding(false); }
  };

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const userLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(userLoc);
      setLocationSource('gps');
      setLocationLabel(await reverseGeocode(userLoc.lat, userLoc.lng));
      setAddressInput('');
      setFiltering(true);
      setTimeout(() => setFiltering(false), 800);
    } catch { /* GPS nedostupné */ }
  };

  const loadProdukty = async () => {
    try {
      const { data } = await supabase.from('predefinovane_produkty').select('id, nazev, emoji, kategorie');
      const sorted = (data || []).sort((a, b) => (productOrder[a.nazev] || 999) - (productOrder[b.nazev] || 999));
      setProdukty(sorted);
    } catch { /* tiché selhání */ }
  };

  const loadPestitele = async () => {
    try {
      setLoading(true);
      const [prodejniMistaData, pestiteleData] = await Promise.all([
        fetchProdejniMistaProMapu(),
        fetchFarmariProMapu(),
      ]);
      const { data: produktyData } = await supabase.from('produkty').select('pestitel_id, nazev');
      const produktyMap = new Map<string, string[]>();
      produktyData?.forEach((p) => {
        const key = String(p.pestitel_id);
        if (!produktyMap.has(key)) produktyMap.set(key, []);
        produktyMap.get(key)?.push(p.nazev);
      });
      const farmariSMisty = new Set(prodejniMistaData.map(m => m.pestitel_id));
      const polozky: MapaPolozka[] = prodejniMistaData.map((misto) => ({
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
      pestiteleData.forEach((p) => {
        if (!farmariSMisty.has(Number(p.id))) {
          polozky.push({
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
      setPestitele(polozky);
    } catch { /* tiché selhání */ }
    finally { setLoading(false); }
  };

  const toggleProdukt = (id: number) => {
    setFiltering(true);
    setSelectedProdukty(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setTimeout(() => setFiltering(false), 800);
  };

  const handleDistanceChange = (d: number | null) => {
    setFiltering(true);
    setSelectedDistance(d);
    setTimeout(() => setFiltering(false), 800);
  };

  const handleDestinationSearch = async (query: string) => {
    setDestinationQuery(query);
    if (query.length < 2) { setDestinationSuggestions([]); return; }
    try {
      const results = await searchCitiesHybrid(query, 5);
      setDestinationSuggestions(results);
    } catch { setDestinationSuggestions([]); }
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

  // ── Filtrování (stejná logika jako původní) ──────────────────
  const filteredPestitele = pestitele
    .map((p: any) => {
      if (userLocation && p.gps_lat && p.gps_lng) {
        return { ...p, distance: calculateDistance(userLocation.lat, userLocation.lng, p.gps_lat, p.gps_lng) };
      }
      return p;
    })
    .map((p: any) => {
      let matchScore = 0;
      let matchedProducts: string[] = [];
      let missingProducts: string[] = [];
      if (selectedProdukty.length > 0) {
        const selected = produkty.filter(pr => selectedProdukty.includes(pr.id))
          .map(pr => ({ nazev: pr.nazev, norm: removeAccents(pr.nazev) }));
        selected.forEach(sel => {
          const has = p.produkty?.some((n: string) => {
            const nn = removeAccents(n);
            return nn.includes(sel.norm) || sel.norm.includes(nn);
          });
          if (has) { matchedProducts.push(sel.nazev); matchScore++; }
          else missingProducts.push(sel.nazev);
        });
      }
      return {
        ...p, matchScore, matchedProducts, missingProducts,
        matchPercentage: selectedProdukty.length > 0 ? (matchScore / selectedProdukty.length) * 100 : 100,
        hasCompleteMatch: selectedProdukty.length > 0 && matchScore === selectedProdukty.length,
      };
    })
    .filter((p: any) => {
      const qn = removeAccents(searchQuery.trim());
      const matchesSearch = !searchQuery.trim() || (
        removeAccents(p.nazev_farmy).includes(qn) ||
        removeAccents(p.mesto).includes(qn) ||
        (p.nazev_mista && removeAccents(p.nazev_mista).includes(qn)) ||
        (p.popis && removeAccents(p.popis).includes(qn)) ||
        p.produkty?.some((n: string) => removeAccents(n).includes(qn))
      );
      let matchesDistance: boolean;
      if (mode === 'cesta' && destination && userLocation && p.gps_lat && p.gps_lng) {
        matchesDistance = pointToSegmentKm(
          p.gps_lat, p.gps_lng,
          userLocation.lat, userLocation.lng,
          destination.lat, destination.lng,
        ) <= corridorKm;
      } else {
        matchesDistance = userLocation === null || selectedDistance === null ||
          (p.distance !== undefined && p.distance <= selectedDistance);
      }
      const matchesProdukty = selectedProdukty.length === 0 || p.matchScore > 0;
      return matchesSearch && matchesDistance && matchesProdukty;
    })
    .sort((a: any, b: any) => {
      if (selectedProdukty.length > 0) {
        if (a.hasCompleteMatch && !b.hasCompleteMatch) return -1;
        if (!a.hasCompleteMatch && b.hasCompleteMatch) return 1;
        if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      }
      if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
      return 0;
    })
    .filter((p: any) => {
      if (selectedProdukty.length === 0) return true;
      if (matchFilter === 'complete') return p.hasCompleteMatch;
      if (matchFilter === 'partial') return !p.hasCompleteMatch && p.matchScore > 0;
      return true;
    });

  // ── Render ────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.logo}>🌿 Samopěstitelé</Text>
        <Text style={s.headerSub}>Hledat produkty v okolí</Text>
      </View>

      {/* BODY */}
      <View style={s.body}>

        {/* LEVÝ PANEL */}
        <ScrollView style={s.leftPanel} showsVerticalScrollIndicator={false}>

          {/* Vyhledávací pole */}
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔎</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Hledat farmáře, produkt, obec..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Přepínač módů */}
          <View style={s.modeRow}>
            <SegmentedSearchMode
              mode={mode === 'okolí' ? 'near' : 'route'}
              onChange={(m) => { if (m === 'near') handleResetMode(); else setMode('cesta'); }}
            />
          </View>

          {/* Karta cíle – mód cesta */}
          {mode === 'cesta' && (
            <View style={s.card}>
              <Text style={s.cardTitle}>🎯 Cíl cesty</Text>
              <TextInput
                style={s.cardInput}
                placeholder="Praha, Brno, Ostrava..."
                placeholderTextColor="#9ca3af"
                value={destinationQuery}
                onChangeText={handleDestinationSearch}
              />
              {destinationSuggestions.length > 0 && (
                <View style={s.suggestions}>
                  {destinationSuggestions.map(s => (
                    <TouchableOpacity
                      key={String(s.id)}
                      style={sx.suggRow}
                      onPress={() => handleSelectDestination(s)}
                    >
                      <Text style={sx.suggText}>{s.nazev}{s.okres ? `, ${s.okres}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {destination && (
                <View style={sx.corridorRow}>
                  <Text style={sx.corridorLabel}>Koridor:</Text>
                  {[5, 10, 20].map(km => (
                    <TouchableOpacity
                      key={km}
                      style={[sx.corridorBtn, corridorKm === km && sx.corridorBtnActive]}
                      onPress={() => { setCorridorKm(km); setFiltering(true); setTimeout(() => setFiltering(false), 400); }}
                    >
                      <Text style={[sx.corridorBtnTxt, corridorKm === km && sx.corridorBtnTxtActive]}>{km} km</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!userLocation && (
                <Text style={sx.warning}>⚠️ Povolte polohu pro funkci Po cestě</Text>
              )}
            </View>
          )}

          {/* Kde hledat */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📍 Výchozí pozice</Text>
            <View style={sx.locRow}>
              <TouchableOpacity
                style={[sx.locBtn, locationSource === 'gps' && sx.locBtnActive]}
                onPress={useMyLocation}
              >
                <Text style={[sx.locBtnTxt, locationSource === 'gps' && sx.locBtnTxtActive]}>📍 Moje poloha</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sx.locBtn, locationSource === 'address' && sx.locBtnActive]}
                onPress={() => setLocationSource('address')}
              >
                <Text style={[sx.locBtnTxt, locationSource === 'address' && sx.locBtnTxtActive]}>🔍 Jiný start</Text>
              </TouchableOpacity>
            </View>
            {locationSource === 'address' && (
              <View style={sx.addrRow}>
                <TextInput
                  style={sx.addrInput}
                  placeholder="Město nebo obec..."
                  placeholderTextColor="#9ca3af"
                  value={addressInput}
                  onChangeText={setAddressInput}
                  onSubmitEditing={() => geocodeAddress(addressInput)}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[sx.addrBtn, geocoding && sx.addrBtnDisabled]}
                  onPress={() => geocodeAddress(addressInput)}
                  disabled={geocoding}
                >
                  <Text style={sx.addrBtnTxt}>{geocoding ? '...' : 'Najít'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {locationLabel ? (
              <Text style={sx.locLabel}>
                {locationSource === 'gps' ? '📍' : '🔍'} {locationLabel}
              </Text>
            ) : null}
          </View>

          {/* Perimetr – jen v okolí módu */}
          {mode === 'okolí' && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Maximální vzdálenost</Text>
              <View style={sx.distRow}>
                {[5, 10, 20, 30, 50].map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[sx.distBtn, selectedDistance === km && sx.distBtnActive]}
                    onPress={() => handleDistanceChange(km)}
                  >
                    <Text style={[sx.distBtnTxt, selectedDistance === km && sx.distBtnTxtActive]}>{km} km</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[sx.distBtn, selectedDistance === null && sx.distBtnActive]}
                  onPress={() => handleDistanceChange(null)}
                >
                  <Text style={[sx.distBtnTxt, selectedDistance === null && sx.distBtnTxtActive]}>Vše</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Produkty */}
          <View style={s.card}>
            <TouchableOpacity style={sx.prodToggle} onPress={() => setShowProduktyFilter(p => !p)}>
              <View>
                <Text style={s.cardTitle}>🧺 Co hledáte?</Text>
                <Text style={sx.prodSub}>
                  {selectedProdukty.length > 0 ? `Vybráno: ${selectedProdukty.length}` : 'Vyberte produkty'}
                </Text>
              </View>
              <Text style={sx.arrow}>{showProduktyFilter ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showProduktyFilter && (
              <View style={sx.prodGrid}>
                {produkty.filter(p =>
                  !searchQuery.trim() || removeAccents(p.nazev).includes(removeAccents(searchQuery.trim()))
                ).map((pr) => (
                  <TouchableOpacity
                    key={pr.id}
                    style={[sx.chip, selectedProdukty.includes(pr.id) && sx.chipActive]}
                    onPress={() => toggleProdukt(pr.id)}
                  >
                    <Text style={sx.chipEmoji}>{pr.emoji}</Text>
                    <Text style={[sx.chipTxt, selectedProdukty.includes(pr.id) && sx.chipTxtActive]}>{pr.nazev}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* VÝSLEDKY */}
          <View style={[s.card, { marginBottom: 24 }]}>
            <Text style={s.cardTitle}>
              {filtering
                ? 'Hledám...'
                : mode === 'cesta' && destination
                  ? `${filteredPestitele.length} míst po cestě do ${destination.label}`
                  : `Nalezeno ${filteredPestitele.length} farmářů`}
            </Text>

            {loading || filtering ? (
              <ActivityIndicator size="small" color="#4caf50" style={{ marginVertical: 16 }} />
            ) : filteredPestitele.length === 0 ? (
              <Text style={sx.empty}>Žádní farmáři nenalezeni. Zkuste změnit filtry.</Text>
            ) : (
              filteredPestitele.map((farmer: any) => {
                const hasCartItems = customerListItems.some(i => i.farmarId === String(farmer.pestitel_id));
                const hasOrder = objednanyPestitelIds.has(farmer.pestitel_id);
                const isSelected = selectedFarmer?.id === farmer.id;
                return (
                  <TouchableOpacity
                    key={farmer.id}
                    style={[sx.farmerRow, isSelected && sx.farmerRowSelected]}
                    onPress={() => {
                      setSelectedFarmer(farmer);
                      router.push(`/farmar/${farmer.pestitel_id}`);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={sx.avatar}>
                      <Text style={sx.avatarEmoji}>🌿</Text>
                    </View>
                    <View style={sx.farmerInfo}>
                      <Text style={sx.farmerName}>{farmer.nazev_farmy}</Text>
                      {farmer.nazev_mista && (
                        <Text style={sx.farmerMisto}>📍 {farmer.nazev_mista}</Text>
                      )}
                      <Text style={sx.farmerMesto}>{farmer.mesto}</Text>
                      {hasOrder && <Text style={sx.badgeOrder}>✅ Objednáno</Text>}
                      {!hasOrder && hasCartItems && <Text style={sx.badgeCart}>🛒 V seznamu</Text>}
                    </View>
                    <View style={sx.farmerRight}>
                      {farmer.distance !== undefined && (
                        <Text style={sx.distance}>
                          {farmer.distance < 1
                            ? `${Math.round(farmer.distance * 1000)} m`
                            : `${farmer.distance.toFixed(1)} km`}
                        </Text>
                      )}
                      <Text style={sx.arrow}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* PRAVÝ PANEL – mapa */}
        <View style={s.mapPanel}>
          {selectedFarmer?.gps_lat && selectedFarmer?.gps_lng
            ? <MapEmbed lat={selectedFarmer.gps_lat} lng={selectedFarmer.gps_lng} zoom={13} />
            : <MapDefault />
          }
          {selectedFarmer && (
            <View style={sx.mapOverlay}>
              <Text style={sx.mapOverlayTitle}>{selectedFarmer.nazev_farmy}</Text>
              <Text style={sx.mapOverlayAddr}>{selectedFarmer.nazev_mista || selectedFarmer.mesto}</Text>
              <TouchableOpacity
                style={sx.mapOverlayBtn}
                onPress={() => router.push(`/farmar/${selectedFarmer.pestitel_id}`)}
              >
                <Text style={sx.mapOverlayBtnTxt}>Zobrazit detail →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    height: 60, backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 6 },
  backIcon: { fontSize: 20, color: '#1a1a1a' },
  logo: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  headerSub: { fontSize: 13, color: '#6b7280' },

  body: { flex: 1, flexDirection: 'row' },

  leftPanel: {
    width: 380,
    backgroundColor: '#f9fafb',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  mapPanel: { flex: 1, backgroundColor: '#e5e7eb', position: 'relative' as any },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', outlineStyle: 'none' as any },

  modeRow: { marginBottom: 10 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  cardInput: {
    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1a1a1a',
    outlineStyle: 'none' as any,
  },
  suggestions: {
    marginTop: 4, backgroundColor: '#ffffff', borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' as any,
  },
});

// Extra styly (bez StyleSheet pro jednodušší čtení)
const sx = StyleSheet.create({
  // Suggestions
  suggRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggText: { fontSize: 14, color: '#1a1a1a' },

  // Koridor
  corridorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  corridorLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  corridorBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  corridorBtnActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  corridorBtnTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  corridorBtnTxtActive: { color: '#ffffff' },
  warning: { fontSize: 13, color: '#f59e0b', marginTop: 8 },

  // Lokace
  locRow: { flexDirection: 'row', gap: 8 },
  locBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center' as any },
  locBtnActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  locBtnTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  locBtnTxtActive: { color: '#ffffff' },
  addrRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addrInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#1a1a1a', outlineStyle: 'none' as any },
  addrBtn: { backgroundColor: '#4caf50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' as any, alignItems: 'center' as any },
  addrBtnDisabled: { opacity: 0.5 },
  addrBtnTxt: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  locLabel: { fontSize: 13, color: '#6b7280', marginTop: 10 },

  // Distance
  distRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  distBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  distBtnActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  distBtnTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  distBtnTxtActive: { color: '#ffffff' },

  // Produkty
  prodToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', gap: 5 },
  chipActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  chipEmoji: { fontSize: 14 },
  chipTxt: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTxtActive: { color: '#ffffff' },

  // Farmáři
  farmerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 10 },
  farmerRowSelected: { backgroundColor: '#f0fdf4' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 20 },
  farmerInfo: { flex: 1 },
  farmerName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  farmerMisto: { fontSize: 12, color: '#4caf50', fontWeight: '500', marginBottom: 1 },
  farmerMesto: { fontSize: 12, color: '#6b7280' },
  badgeOrder: { fontSize: 11, color: '#166534', fontWeight: '600', marginTop: 3 },
  badgeCart: { fontSize: 11, color: '#92400e', fontWeight: '600', marginTop: 3 },
  farmerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distance: { fontSize: 12, color: '#4caf50', fontWeight: '600' },
  arrow: { fontSize: 18, color: '#9ca3af' },

  // Prázdný stav
  empty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },

  // Map overlay
  mapOverlay: {
    position: 'absolute' as any, bottom: 20, left: 20,
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, minWidth: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  mapOverlayTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  mapOverlayAddr: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  mapOverlayBtn: { backgroundColor: '#4caf50', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  mapOverlayBtnTxt: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
