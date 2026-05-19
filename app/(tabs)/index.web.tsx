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
const HERO_HEIGHT = 420;
const CARDS_OVERLAP = 80;

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

  const isDesktop = isMounted && width >= 900;

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
      <SafeAreaView style={[s.safeArea, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color="#4caf50" />
      </SafeAreaView>
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
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ──────────────────────────────────────────────── */}
        <ImageBackground
          source={HERO_IMAGE}
          style={s.heroBg}
          resizeMode="cover"
        >
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <View style={s.betaBadge}>
              <Text style={s.betaBadgeText}>BETA</Text>
            </View>
            <Text style={[s.heroTitle, isDesktop && s.heroTitleDesktop]}>
              Samopěstitelé
            </Text>
            <Text style={[s.heroTagline, isDesktop && s.heroTaglineDesktop]}>
              Čerstvé produkty přímo od lidí ve vašem okolí.
            </Text>
            <Text style={s.heroSub}>
              Vyhledejte, domluvte odběr nebo nabídněte vlastní přebytky.
            </Text>
          </View>
        </ImageBackground>

        {/* ── TŘI KARTY (překrývají spodek hero přes záporný marginTop) ─ */}
        <View style={[s.cards, isDesktop && s.cardsDesktop]}>

          <TouchableOpacity
            style={[s.card, s.cardPrimary, isDesktop && s.cardFlex]}
            onPress={() => router.push('/mapa')}
            activeOpacity={0.88}
          >
            <Text style={s.cardEmoji}>🍎</Text>
            <Text style={[s.cardTitle, s.cardTitleWhite]}>Zákazníci</Text>
            <Text style={[s.cardDesc, s.cardDescWhite]}>
              Najděte čerstvé produkty v okolí.
            </Text>
            <View style={s.cardTagWhite}>
              <Text style={s.cardTagTextWhite}>Bez registrace</Text>
            </View>
            <View style={s.cardCta}>
              <Text style={s.cardCtaTextWhite}>Vyhledat →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, isDesktop && s.cardFlex]}
            onPress={() => router.push(prodejnaRoute)}
            activeOpacity={0.88}
          >
            <Text style={s.cardEmoji}>🏡</Text>
            <Text style={s.cardTitle}>Moje prodejna</Text>
            <Text style={s.cardDesc}>
              {isAuthenticated ? 'Správa prodejny, produktů a objednávek.' : 'Přihlášení a správa prodejny pěstitele.'}
            </Text>
            <View style={s.cardTag}>
              <Text style={s.cardTagText}>Pro registrované pěstitele</Text>
            </View>
            {newOrdersCount > 0 && (
              <View style={s.cardTagRed}>
                <Text style={s.cardTagTextRed}>{newOrdersCount} nových objednávek</Text>
              </View>
            )}
            <View style={s.cardCta}>
              <Text style={s.cardCtaText}>Přejít →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, isDesktop && s.cardFlex]}
            onPress={() => router.push('/stanky/pridat')}
            activeOpacity={0.88}
          >
            <Text style={s.cardEmoji}>📦</Text>
            <Text style={s.cardTitle}>Nabízím bez registrace</Text>
            <Text style={s.cardDesc}>
              Rychle nabídnu přebytky bez zakládání prodejny.
            </Text>
            <View style={s.cardTagOrange}>
              <Text style={s.cardTagTextOrange}>Jednorázová nabídka</Text>
            </View>
            <View style={s.cardCta}>
              <Text style={s.cardCtaText}>Přidat nabídku →</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* ── FARMER STATUS ─────────────────────────────────────── */}
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

        {/* ── POKRAČOVAT U FARMÁŘE ──────────────────────────────── */}
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

        {/* ── KOŠÍK SUMMARY ─────────────────────────────────────── */}
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

        <View style={s.footer}>
          <Text style={s.footerText}>samopestitele.cz · info@samopestitele.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: '#f9fafb' },
  center:      { justifyContent: 'center', alignItems: 'center' },
  scroll:      { flex: 1 },
  scrollContent: { maxWidth: 1200, alignSelf: 'center' as any, width: '100%', flexGrow: 1, paddingBottom: 60 },

  heroBg: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },

  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  heroContent: {
    paddingTop: 52,
    paddingHorizontal: 40,
    paddingBottom: 20,
  },

  betaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 14,
  },
  betaBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  heroTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTitleDesktop: { fontSize: 64 },

  heroTagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 28,
    marginBottom: 8,
    fontWeight: '500',
  },
  heroTaglineDesktop: { fontSize: 22 },

  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 21,
  },

  cards: {
    marginTop: -CARDS_OVERLAP,
    zIndex: 10,
    paddingHorizontal: 24,
    gap: 14,
  },
  cardsDesktop: {
    flexDirection: 'row',
    paddingHorizontal: 40,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
  },
  cardFlex: { flex: 1 },
  cardPrimary: { backgroundColor: '#4caf50' },

  cardEmoji: { fontSize: 28, marginBottom: 10 },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardTitleWhite: { color: '#fff' },

  cardDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardDescWhite: { color: 'rgba(255,255,255,0.88)' },

  cardTag: {
    backgroundColor: '#f1f8e9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  cardTagText: { fontSize: 11, color: '#2e7d32', fontWeight: '600' },

  cardTagWhite: {
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  cardTagTextWhite: { fontSize: 11, color: '#fff', fontWeight: '600' },

  cardTagOrange: {
    backgroundColor: '#fff3e0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  cardTagTextOrange: { fontSize: 11, color: '#f57c00', fontWeight: '600' },

  cardTagRed: {
    backgroundColor: '#ffebee', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  cardTagTextRed: { fontSize: 11, color: '#c62828', fontWeight: '700' },

  cardCta: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 20,
    alignItems: 'center', minWidth: 120,
  },
  cardCtaText: { fontSize: 14, fontWeight: '700', color: '#FF9800' },
  cardCtaTextWhite: { fontSize: 14, fontWeight: '700', color: '#fff' },

  statusSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },

  continueBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff3e0',
    marginHorizontal: 24, marginTop: 14,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  continueBannerText: { fontSize: 13, color: '#f57c00', fontWeight: '600', flex: 1 },
  continueBannerClose: { padding: 4, marginLeft: 8 },
  continueBannerCloseText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  cartSection: {
    backgroundColor: '#fff',
    marginHorizontal: 24, marginTop: 14,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  cartRow: { flexDirection: 'row', alignItems: 'center' },
  cartLabel: { fontSize: 13, color: '#FF9800', fontWeight: '600', flex: 1 },
  cartPill: {
    backgroundColor: '#FF9800', borderRadius: 9,
    minWidth: 20, height: 20, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 5, marginRight: 6,
  },
  cartPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cartChevron: { fontSize: 11, color: '#9ca3af' },
  cartList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupSep: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cartGroupName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  cartGroupItem: { fontSize: 12, color: '#6b7280', marginLeft: 8, lineHeight: 18 },
  cartGoBtn: { marginTop: 10, backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  cartGoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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

  footer: {
    paddingHorizontal: 40, paddingVertical: 40,
    alignItems: 'center', marginTop: 20,
  },
  footerText: { fontSize: 12, color: '#c4c9d0' },
});
