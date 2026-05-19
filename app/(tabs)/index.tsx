import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { fetchPocetNovychObjednavek } from '@/features/objednavky/services/objednavkyService';
import { useCart } from '../_utils/cartContext';
import { useCustomerList } from '@/shared/context/CustomerListContext';
import { formatMnozstvi } from '../_utils/formatKc';
import { supabase } from '@/lib/supabaseClient';
import SellingModeModal from '../_components/SellingModeModal';
import FarmerStatusCard from '../_components/FarmerStatusCard';

type ProdejniMisto = { id: number; nazev: string | null; adresa: string | null };

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=cs`,
      { headers: { 'User-Agent': 'samopestitele-app/1.0' } }
    );
    const { address: addr } = await resp.json();
    if (!addr) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.village;
    const city = addr.city || addr.town || addr.municipality;
    if (suburb && city) return `${city} – ${suburb}`;
    if (city) return city;
    if (addr.county) return addr.county;
  } catch { /* fall through */ }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isSessionChecked, farmar } = useFarmarAuth();
  const { itemCount, cart } = useCart();
  const { itemCount: listItemCount, lastFarmer } = useCustomerList();
  const [cartExpanded, setCartExpanded] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  const [pestitelRowId, setPestitelRowId] = useState<string | null>(null);
  const [activeMisto, setActiveMisto] = useState<ProdejniMisto | null | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [farmerMista, setFarmerMista] = useState<ProdejniMisto[]>([]);
  const [mistoLoading, setMistoLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [farmerProfile, setFarmerProfile] = useState<{
    nazev_farmy: string | null; adresa: string | null; mesto: string | null;
    gps_lat: number | null; gps_lng: number | null;
  } | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const isMobile = isMounted && width < 768;
  const isDesktop = isMounted && width >= 768;

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && farmar?.id) {
        loadFarmerStatus(farmar.id);
      } else {
        setPestitelRowId(null);
        setActiveMisto(undefined);
      }
    }, [isAuthenticated, farmar?.id])
  );

  const loadFarmerStatus = async (pestitelId: string) => {
    const [{ data: row }, { data: misto }] = await Promise.all([
      supabase.from('pestitele')
        .select('id,nazev_farmy,adresa,mesto,gps_lat,gps_lng')
        .eq('id', pestitelId)
        .maybeSingle(),
      supabase.from('prodejni_mista')
        .select('id,nazev,adresa,lat,lng,aktivni,platne_od,platne_do')
        .eq('pestitel_id', pestitelId)
        .eq('aktivni', true)
        .gte('platne_do', new Date().toISOString())
        .order('platne_od', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!row) { setPestitelRowId(null); setActiveMisto(undefined); return; }
    setPestitelRowId(String(row.id));
    setFarmerProfile({
      nazev_farmy: row.nazev_farmy ?? null, adresa: row.adresa ?? null,
      mesto: row.mesto ?? null, gps_lat: row.gps_lat ?? null, gps_lng: row.gps_lng ?? null,
    });
    setActiveMisto(misto ?? null);
    setNewOrdersCount(await fetchPocetNovychObjednavek(pestitelId));
  };

  const refreshActiveMisto = async (pestitelId: string) => {
    const { data } = await supabase.from('prodejni_mista')
      .select('id,nazev,adresa,lat,lng,aktivni,platne_od,platne_do')
      .eq('pestitel_id', pestitelId)
      .eq('aktivni', true)
      .gte('platne_do', new Date().toISOString())
      .order('platne_od', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveMisto(data ?? null);
  };

  const handleCardPress = async () => {
    if (!pestitelRowId || activeMisto === undefined) return;
    if (activeMisto !== null) {
      const prev = activeMisto;
      setActiveMisto(null);
      const { error } = await supabase.rpc('deactivate_selling', { p_pestitel_id: pestitelRowId });
      if (error) { setActiveMisto(prev); console.error('deactivate_selling:', error); }
    } else {
      setGeoError('');
      setShowModal(true);
      setMistoLoading(true);
      const { data } = await supabase.from('prodejni_mista')
        .select('id,nazev,adresa,lat,lng,aktivni,platne_od,platne_do')
        .eq('pestitel_id', pestitelRowId)
        .neq('nazev', 'Mobilní prodej')
        .order('created_at', { ascending: false });
      let mista: ProdejniMisto[] = data ?? [];
      if (mista.length === 0 && farmerProfile) {
        const addr = farmerProfile.adresa || farmerProfile.mesto;
        if (addr) mista = [{ id: -2, nazev: farmerProfile.nazev_farmy || 'Moje prodejna', adresa: addr }];
      }
      setFarmerMista(mista);
      setMistoLoading(false);
    }
  };

  const handleSelectStale = async (misto: ProdejniMisto) => {
    if (!pestitelRowId) return;
    setModalLoading(true);
    const prev = activeMisto;
    setActiveMisto(misto);
    setShowModal(false);
    const result = misto.id === -2
      ? await supabase.rpc('activate_mobile_today', {
          p_pestitel_id: pestitelRowId,
          p_lat: farmerProfile?.gps_lat ?? 0, p_lng: farmerProfile?.gps_lng ?? 0,
          p_lokace_text: misto.adresa || misto.nazev || 'Moje prodejna', p_hours: 12,
        })
      : await supabase.rpc('set_active_sales_location', {
          p_prodejni_misto_id: misto.id, p_pestitel_id: pestitelRowId, p_hours: 12,
        });
    if (result.error) {
      setActiveMisto(prev);
      setShowModal(true);
      console.error('handleSelectStale error:', result.error);
    } else {
      await refreshActiveMisto(pestitelRowId);
    }
    setModalLoading(false);
  };

  const handleActivateMobilni = async () => {
    if (!pestitelRowId) return;
    setGeoError('');
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('Geolokace není dostupná v tomto prohlížeči.')); return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
      });
      const { latitude: lat, longitude: lng } = position.coords;
      const lokaceText = await reverseGeocode(lat, lng);
      setActiveMisto({ id: -1, nazev: 'Mobilní prodej', adresa: lokaceText });
      setShowModal(false);
      const { error } = await supabase.rpc('activate_mobile_today', {
        p_pestitel_id: pestitelRowId, p_lat: lat, p_lng: lng,
        p_lokace_text: lokaceText, p_hours: 12,
      });
      if (error) {
        setActiveMisto(null);
        console.error('activate_mobile_today error:', error);
        setShowModal(true);
      } else {
        await refreshActiveMisto(pestitelRowId);
      }
    } catch (err: any) {
      const denied = err?.code === 1 || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('permission');
      setGeoError(denied ? 'Pro mobilní režim povolte polohu (GPS).' : (err?.message || 'Nepodařilo se získat polohu.'));
    } finally {
      setLocationLoading(false);
    }
  };

  const cartGroups = useMemo(
    () => cart.reduce((acc, item) => {
      if (!acc[item.pestitelId]) acc[item.pestitelId] = { nazev: item.pestitelNazev, items: [] as typeof cart };
      acc[item.pestitelId].items.push(item);
      return acc;
    }, {} as Record<number, { nazev: string; items: typeof cart }>),
    [cart]
  );

  const showStatusCard = isAuthenticated && pestitelRowId !== null && activeMisto !== undefined;
  const isActive = showStatusCard && activeMisto !== null;

  if (!isSessionChecked) {
    return (
      <SafeAreaView style={[s.safeArea, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color="#4caf50" />
      </SafeAreaView>
    );
  }

  const prodejnaRoute = isAuthenticated
    ? (isMobile ? '/(tabs)/moje-prodejna/operativa' : '/(tabs)/moje-prodejna')
    : '/registrace';

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <SellingModeModal
        visible={showModal}
        mistoLoading={mistoLoading}
        modalLoading={modalLoading}
        locationLoading={locationLoading}
        geoError={geoError}
        farmerMista={farmerMista}
        onSelectStale={handleSelectStale}
        onActivateMobilni={handleActivateMobilni}
        onClose={() => { setShowModal(false); setGeoError(''); }}
      />

      {itemCount > 0 && (
        <TouchableOpacity style={s.cartButton} onPress={() => router.push('/kosik')}>
          <Text style={s.cartIcon}>🛒</Text>
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          Platform.OS === 'web' && { maxWidth: 720, alignSelf: 'center' as const, width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hlavička ──────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.betaBadge}>
            <Text style={s.betaBadgeText}>BETA</Text>
          </View>
          <Text style={s.appName}>Samopěstitelé</Text>
          <Text style={s.appTagline}>Čerstvé produkty přímo od lidí ve vašem okolí.</Text>
        </View>

        {/* ── Status karta (jen přihlášení farmáři) ─────── */}
        {showStatusCard && (
          <View style={s.statusSection}>
            <FarmerStatusCard
              isActive={isActive}
              activeMisto={activeMisto}
              isDesktop={isDesktop}
              defaultAdresa={farmerProfile?.adresa || farmerProfile?.mesto || undefined}
              onPress={handleCardPress}
            />
          </View>
        )}

        {/* ── Kontextové CTA (pokračovat u farmáře) ─────── */}
        {listItemCount > 0 && lastFarmer && !ctaDismissed && (
          <View style={s.continueBanner}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push(`/farmar/${lastFarmer.id}` as any)}
              activeOpacity={0.7}
            >
              <Text style={s.continueBannerText}>Pokračovat u: {lastFarmer.name} →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCtaDismissed(true)} style={s.continueBannerClose}>
              <Text style={s.continueBannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Košík summary ──────────────────────────────── */}
        {itemCount > 0 && (
          <View style={s.cartSection}>
            <TouchableOpacity style={s.cartRow} onPress={() => setCartExpanded(p => !p)} activeOpacity={0.7}>
              <Text style={s.cartLabel}>🛒 Vybrané produkty</Text>
              <View style={s.cartPill}>
                <Text style={s.cartPillText}>{itemCount}</Text>
              </View>
              <Text style={s.cartChevron}>{cartExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {cartExpanded && (
              <View style={s.cartList}>
                {Object.values(cartGroups).map((group, gi) => (
                  <View key={gi} style={gi > 0 ? s.cartGroupSep : undefined}>
                    <Text style={s.cartGroupName}>🧺 {group.nazev}</Text>
                    {group.items.map((item, i) => (
                      <Text key={i} style={s.cartGroupItem}>
                        • {item.nazev} — {formatMnozstvi(item.mnozstvi)} {item.jednotka}
                      </Text>
                    ))}
                  </View>
                ))}
                <TouchableOpacity style={s.cartGoBtn} onPress={() => router.push('/kosik')}>
                  <Text style={s.cartGoBtnText}>Přejít do košíku →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ══ TŘI HLAVNÍ KARTY ══════════════════════════════ */}
        <View style={[s.cards, isDesktop && s.cardsDesktop]}>

          {/* Karta 1 — Vyhledat produkty (primární) */}
          <TouchableOpacity
            style={[s.card, s.cardPrimary, isDesktop && s.cardDesktop]}
            onPress={() => router.push('/mapa')}
            activeOpacity={0.88}
          >
            <View style={s.cardTop}>
              <View style={s.cardIconPrimary}>
                <Text style={s.cardEmoji}>🗺</Text>
              </View>
              <View style={[s.cardChip, s.cardChipLight]}>
                <Text style={s.cardChipTextLight}>Bez registrace</Text>
              </View>
            </View>
            <Text style={[s.cardTitle, s.cardTitleLight]}>Vyhledat produkty</Text>
            <Text style={[s.cardDesc, s.cardDescLight]}>
              Najdu ovoce, zeleninu nebo další produkty v okolí.
            </Text>
            <View style={s.cardFooter}>
              <Text style={s.cardArrowLight}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Karta 2 — Chci si založit prodejnu */}
          <TouchableOpacity
            style={[s.card, s.cardSecondary, isDesktop && s.cardDesktop]}
            onPress={() => router.push(prodejnaRoute as any)}
            activeOpacity={0.88}
          >
            <View style={s.cardTop}>
              <View style={[s.cardIconSecondary, { backgroundColor: '#e8f5e9' }]}>
                <Text style={s.cardEmoji}>🏡</Text>
              </View>
              <View style={s.cardChip}>
                <Text style={s.cardChipText}>Pro pěstitele</Text>
              </View>
              {newOrdersCount > 0 && (
                <View style={s.newOrdersBadge}>
                  <Text style={s.newOrdersBadgeText}>{newOrdersCount} nových</Text>
                </View>
              )}
            </View>
            <Text style={s.cardTitle}>
              {isAuthenticated ? 'Moje prodejna' : 'Chci si založit prodejnu'}
            </Text>
            <Text style={s.cardDesc}>
              {isAuthenticated
                ? 'Spravuji produkty, objednávky a místo prodeje.'
                : 'Vytvořím si profil pěstitele a budu spravovat svoji nabídku.'}
            </Text>
            <View style={s.cardFooter}>
              <Text style={s.cardArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Karta 3 — Prodám bez registrace */}
          <TouchableOpacity
            style={[s.card, s.cardSecondary, isDesktop && s.cardDesktop]}
            onPress={() => router.push('/stanky/pridat')}
            activeOpacity={0.88}
          >
            <View style={s.cardTop}>
              <View style={[s.cardIconSecondary, { backgroundColor: '#fff8e1' }]}>
                <Text style={s.cardEmoji}>🌻</Text>
              </View>
              <View style={[s.cardChip, s.cardChipOrange]}>
                <Text style={[s.cardChipText, s.cardChipTextOrange]}>Rychlá nabídka</Text>
              </View>
            </View>
            <Text style={s.cardTitle}>Prodám bez registrace</Text>
            <Text style={s.cardDesc}>
              Rychle nabídnu přebytky bez zakládání plné prodejny.
            </Text>
            <View style={s.cardFooter}>
              <Text style={s.cardArrow}>→</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* ── Footer ─────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>samopestitele.cz · info@samopestitele.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center:   { justifyContent: 'center', alignItems: 'center' },
  scroll:   { flex: 1 },
  content:  { flexGrow: 1, paddingBottom: 40 },

  // ── Hlavička ─────────────────────────────────────────────
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  betaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  betaBadgeText: { color: '#4caf50', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  appName: { fontSize: 36, fontWeight: '800', color: '#1a1a1a', letterSpacing: -1, marginBottom: 8 },
  appTagline: { fontSize: 16, color: '#6b7280', lineHeight: 24 },

  // ── Status sekce (farmáři) ────────────────────────────────
  statusSection: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Kontextové CTA ────────────────────────────────────────
  continueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  continueBannerText: { fontSize: 13, color: '#f57c00', fontWeight: '600', flex: 1 },
  continueBannerClose: { padding: 4, marginLeft: 8 },
  continueBannerCloseText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  // ── Košík summary ─────────────────────────────────────────
  cartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cartRow: { flexDirection: 'row', alignItems: 'center' },
  cartLabel: { fontSize: 13, color: '#FF9800', fontWeight: '600', flex: 1 },
  cartPill: { backgroundColor: '#FF9800', borderRadius: 9, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginRight: 6 },
  cartPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cartChevron: { fontSize: 11, color: '#9ca3af' },
  cartList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupSep: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  cartGroupItem: { fontSize: 12, color: '#6b7280', marginLeft: 8, lineHeight: 18 },
  cartGoBtn: { marginTop: 10, backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  cartGoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Plovoucí košík tlačítko ───────────────────────────────
  cartButton: {
    position: 'absolute', top: 8, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#FF9800', borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cartIcon: { fontSize: 20 },

  // ── Karty ─────────────────────────────────────────────────
  cards: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },
  cardsDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  card: {
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDesktop: { flex: 1 },

  cardPrimary: { backgroundColor: '#4caf50' },
  cardSecondary: { backgroundColor: '#ffffff' },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardIconPrimary: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardIconSecondary: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardEmoji: { fontSize: 24 },

  cardChip: {
    backgroundColor: '#f1f8e9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardChipLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  cardChipOrange: { backgroundColor: '#fff3e0' },
  cardChipText: { fontSize: 11, color: '#2e7d32', fontWeight: '600' },
  cardChipTextLight: { fontSize: 11, color: '#ffffff', fontWeight: '600' },
  cardChipTextOrange: { color: '#f57c00' },

  newOrdersBadge: {
    backgroundColor: '#ffebee',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
  },
  newOrdersBadgeText: { fontSize: 11, color: '#c62828', fontWeight: '700' },

  cardTitle: { fontSize: 19, fontWeight: '800', color: '#1a1a1a', marginBottom: 6, letterSpacing: -0.3 },
  cardTitleLight: { color: '#ffffff' },
  cardDesc: { fontSize: 14, color: '#6b7280', lineHeight: 21 },
  cardDescLight: { color: 'rgba(255,255,255,0.85)' },

  cardFooter: { marginTop: 16, alignItems: 'flex-end' },
  cardArrow: { fontSize: 22, color: '#FF9800', fontWeight: '700' },
  cardArrowLight: { fontSize: 22, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  // ── Footer ────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: { fontSize: 12, color: '#c4c9d0' },
});
