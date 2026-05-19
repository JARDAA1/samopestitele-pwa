import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ActivityIndicator, ImageBackground,
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

const HERO_IMAGE = require('../../assets/images/hero-krajina.jpg');

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

export default function HomeScreenWeb() {
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

  const isWide = isMounted && width >= 768;

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
  const prodejnaRoute: any = isAuthenticated ? '/(tabs)/moje-prodejna' : '/registrace';

  if (!isSessionChecked) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

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

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════════════════════
            HERO – celá šířka, 500px, krajinný obrázek
        ══════════════════════════════════════════════════ */}
        <ImageBackground source={HERO_IMAGE} style={s.hero} resizeMode="cover">
          <View style={s.heroOverlay} />
          <View style={s.heroInner}>
            <Text style={s.heroTitle}>Samopěstitelé</Text>
            <Text style={s.heroTagline}>
              Čerstvé produkty přímo od lidí ve vašem okolí.
            </Text>
            <Text style={s.heroSub}>
              Vyhledejte, domluvte odběr nebo nabídněte vlastní přebytky.
            </Text>
          </View>
        </ImageBackground>

        {/* ══════════════════════════════════════════════════
            3 KARTY – maxWidth 1100, margin auto
        ══════════════════════════════════════════════════ */}
        <View style={s.cardsOuter}>
          <View style={[s.cardsRow, !isWide && s.cardsRowNarrow]}>

            {/* Karta 1 – Zákazníci (zelená) */}
            <TouchableOpacity
              style={[s.card, s.cardGreen, isWide && s.cardWide]}
              onPress={() => router.push('/mapa')}
              activeOpacity={0.88}
            >
              <View style={s.cardIconCircle}>
                <Text style={s.cardIcon}>🔍</Text>
              </View>
              <View style={[s.badge, s.badgeWhite]}>
                <Text style={s.badgeTextWhite}>Bez registrace</Text>
              </View>
              <Text style={[s.cardTitle, s.cardTitleWhite]}>Zákazníci</Text>
              <Text style={[s.cardDesc, s.cardDescWhite]}>
                Najděte čerstvé produkty v okolí.
              </Text>
              <TouchableOpacity
                style={s.btnOutlineWhite}
                onPress={() => router.push('/mapa')}
                activeOpacity={0.85}
              >
                <Text style={s.btnOutlineWhiteText}>Vyhledat</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Karta 2 – Moje prodejna (bílá) */}
            <TouchableOpacity
              style={[s.card, s.cardWhite, isWide && s.cardWide]}
              onPress={() => router.push(prodejnaRoute)}
              activeOpacity={0.88}
            >
              <View style={s.cardIconCircleGray}>
                <Text style={s.cardIcon}>🏡</Text>
              </View>
              <View style={[s.badge, s.badgeGray]}>
                <Text style={s.badgeTextGray}>Pro registrované pěstitele</Text>
              </View>
              <Text style={s.cardTitle}>Moje prodejna</Text>
              <Text style={s.cardDesc}>
                {isAuthenticated
                  ? 'Správa prodejny, produktů a objednávek.'
                  : 'Přihlášení a správa prodejny pěstitele.'}
              </Text>
              {newOrdersCount > 0 && (
                <View style={s.newOrdersBadge}>
                  <Text style={s.newOrdersBadgeText}>{newOrdersCount} nových objednávek</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.btnDark}
                onPress={() => router.push(prodejnaRoute)}
                activeOpacity={0.85}
              >
                <Text style={s.btnDarkText}>Přejít</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Karta 3 – Nabízím bez registrace (bílá) */}
            <TouchableOpacity
              style={[s.card, s.cardWhite, isWide && s.cardWide]}
              onPress={() => router.push('/stanky/pridat')}
              activeOpacity={0.88}
            >
              <View style={s.cardIconCircleGray}>
                <Text style={s.cardIcon}>📦</Text>
              </View>
              <View style={[s.badge, s.badgeOrange]}>
                <Text style={s.badgeTextOrange}>Jednorázová nabídka</Text>
              </View>
              <Text style={s.cardTitle}>Nabízím bez registrace</Text>
              <Text style={s.cardDesc}>
                Rychle nabídnu přebytky bez zakládání prodejny.
              </Text>
              <TouchableOpacity
                style={s.btnDark}
                onPress={() => router.push('/stanky/pridat')}
                activeOpacity={0.85}
              >
                <Text style={s.btnDarkText}>Přidat nabídku</Text>
              </TouchableOpacity>
            </TouchableOpacity>

          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            FARMER STATUS (jen přihlášení farmáři)
        ══════════════════════════════════════════════════ */}
        {showStatusCard && (
          <View style={s.statusSection}>
            <FarmerStatusCard
              isActive={isActive}
              activeMisto={activeMisto}
              isDesktop
              defaultAdresa={farmerProfile?.adresa || farmerProfile?.mesto || undefined}
              onPress={handleCardPress}
            />
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            POKRAČOVAT U FARMÁŘE
        ══════════════════════════════════════════════════ */}
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

        {/* ══════════════════════════════════════════════════
            KOŠÍK SUMMARY
        ══════════════════════════════════════════════════ */}
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

        {/* ══════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════ */}
        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 Samopěstitelé.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  safeArea:    { flex: 1, backgroundColor: '#f9fafb' },
  scroll:      { flex: 1, backgroundColor: '#f9fafb' },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    width: '100%' as any,
    height: 500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroInner: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTagline: {
    fontSize: 22,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Karty ────────────────────────────────────────────────────
  cardsOuter: {
    width: '100%' as any,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
    backgroundColor: '#f9fafb',
  },
  cardsRow: {
    flexDirection: 'row',
    maxWidth: 1100,
    width: '100%' as any,
    gap: 20,
    justifyContent: 'center',
  },
  cardsRowNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  cardWide: { flex: 1 },
  cardGreen: { backgroundColor: '#4caf50' },
  cardWhite: { backgroundColor: '#ffffff' },

  cardIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  cardIconCircleGray: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  cardIcon: { fontSize: 28 },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 14,
    alignSelf: 'center',
  },
  badgeWhite: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeGray:  { backgroundColor: '#f3f4f6' },
  badgeOrange: { backgroundColor: '#fff7ed' },

  badgeTextWhite:  { fontSize: 12, color: '#ffffff', fontWeight: '600' },
  badgeTextGray:   { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  badgeTextOrange: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },

  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardTitleWhite: { color: '#ffffff' },

  cardDesc: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    flex: 1,
  },
  cardDescWhite: { color: 'rgba(255,255,255,0.88)' },

  newOrdersBadge: {
    backgroundColor: '#ffebee',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 16, alignSelf: 'center',
  },
  newOrdersBadgeText: { fontSize: 12, color: '#c62828', fontWeight: '700' },

  // Tlačítka
  btnOutlineWhite: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28,
    alignSelf: 'center',
    minWidth: 140,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  btnOutlineWhiteText: {
    fontSize: 15, fontWeight: '700', color: '#4caf50',
  },
  btnDark: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28,
    alignSelf: 'center',
    minWidth: 140,
    alignItems: 'center',
  },
  btnDarkText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // ── Farmer status ────────────────────────────────────────────
  statusSection: {
    maxWidth: 1100,
    width: '100%' as any,
    alignSelf: 'center' as any,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ── Pokračovat u farmáře ─────────────────────────────────────
  continueBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff3e0',
    maxWidth: 1100, width: '100%' as any,
    alignSelf: 'center' as any,
    marginBottom: 16,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
  },
  continueBannerText: { fontSize: 14, color: '#f57c00', fontWeight: '600', flex: 1 },
  continueBannerClose: { padding: 4, marginLeft: 8 },
  continueBannerCloseText: { fontSize: 15, color: '#9ca3af', fontWeight: '600' },

  // ── Košík summary ────────────────────────────────────────────
  cartSection: {
    backgroundColor: '#ffffff',
    maxWidth: 1100, width: '100%' as any,
    alignSelf: 'center' as any,
    marginBottom: 16,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  cartRow: { flexDirection: 'row', alignItems: 'center' },
  cartLabel: { fontSize: 14, color: '#FF9800', fontWeight: '600', flex: 1 },
  cartPill: {
    backgroundColor: '#FF9800', borderRadius: 9,
    minWidth: 22, height: 22, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 5, marginRight: 6,
  },
  cartPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cartChevron: { fontSize: 11, color: '#9ca3af' },
  cartList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupSep: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  cartGroupItem: { fontSize: 13, color: '#6b7280', marginLeft: 8, lineHeight: 20 },
  cartGoBtn: { marginTop: 12, backgroundColor: '#FF9800', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cartGoBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: { fontSize: 13, color: '#9ca3af' },
});
