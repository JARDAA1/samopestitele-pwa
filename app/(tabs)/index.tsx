import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ActivityIndicator, Platform, ImageBackground,
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

// TODO: doplnit hero obrázek krajiny / vinohradu / aleje
// Příklad: const HERO_IMAGE = require('../../../assets/images/hero-krajina.jpg');
// nebo:    const HERO_IMAGE = { uri: 'https://cdn.samopestitele.cz/hero.jpg' };
const HERO_IMAGE: any = null;

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

  const prodejnaRoute: any = isAuthenticated
    ? (isMobile ? '/(tabs)/moje-prodejna/operativa' : '/(tabs)/moje-prodejna')
    : '/registrace';

  const heroContent = (
    <>
      {/* Overlay ztmavení */}
      <View style={s.heroOverlay} />

      {/* Obsah hero */}
      <View style={s.heroContent}>
        <View style={s.betaBadge}>
          <Text style={s.betaBadgeText}>BETA</Text>
        </View>
        <Text style={[s.heroTitle, isDesktop && s.heroTitleDesktop]}>Samopěstitelé</Text>
        <Text style={[s.heroTagline, isDesktop && s.heroTaglineDesktop]}>
          Čerstvé produkty přímo od lidí ve vašem okolí.
        </Text>
        <Text style={s.heroSub}>
          Vyhledejte, domluvte odběr nebo nabídněte vlastní přebytky.
        </Text>
      </View>
    </>
  );

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
          Platform.OS === 'web' && { maxWidth: 900, alignSelf: 'center' as const, width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <View style={[s.heroWrapper, isDesktop && s.heroWrapperDesktop]}>

          {HERO_IMAGE ? (
            <ImageBackground
              source={HERO_IMAGE}
              style={[s.heroBg, isDesktop && s.heroBgDesktop]}
              resizeMode="cover"
            >
              {heroContent}
            </ImageBackground>
          ) : (
            // TODO: nahradit View za ImageBackground s hero obrázkem krajiny/vinohradu/aleje
            <View style={[s.heroBg, s.heroBgPlaceholder, isDesktop && s.heroBgDesktop]}>
              {/* Dekorativní vrstvy pro atmosféru než bude obrázek */}
              <View style={s.heroBgLayer1} />
              <View style={s.heroBgLayer2} />
              {heroContent}
            </View>
          )}

          {/* ══ TŘI KARTY (překrývají spodek hero) ═══════════════ */}
          <View style={[s.cards, isDesktop && s.cardsDesktop]}>

            {/* Karta 1 — Zákazníci (primární) */}
            <TouchableOpacity
              style={[s.card, s.cardPrimary, isDesktop && s.cardDesktop]}
              onPress={() => router.push('/mapa')}
              activeOpacity={0.88}
            >
              <View style={s.cardIconWrap}>
                <Text style={s.cardIconEmoji}>🍎</Text>
              </View>
              <Text style={[s.cardTitle, s.cardTitlePrimary]}>Zákazníci</Text>
              <Text style={[s.cardDesc, s.cardDescPrimary]}>
                Najděte čerstvé produkty v okolí.
              </Text>
              <View style={[s.cardBadge, s.cardBadgePrimary]}>
                <Text style={[s.cardBadgeText, s.cardBadgeTextPrimary]}>Bez registrace</Text>
              </View>
              <View style={s.cardBtn}>
                <Text style={[s.cardBtnText, s.cardBtnTextPrimary]}>Vyhledat →</Text>
              </View>
            </TouchableOpacity>

            {/* Karta 2 — Moje prodejna */}
            <TouchableOpacity
              style={[s.card, isDesktop && s.cardDesktop]}
              onPress={() => router.push(prodejnaRoute)}
              activeOpacity={0.88}
            >
              <View style={s.cardIconWrap}>
                <Text style={s.cardIconEmoji}>🏡</Text>
              </View>
              <Text style={s.cardTitle}>Moje prodejna</Text>
              <Text style={s.cardDesc}>
                {isAuthenticated
                  ? 'Správa prodejny, produktů a objednávek.'
                  : 'Přihlášení a správa prodejny pěstitele.'}
              </Text>
              <View style={s.cardBadge}>
                <Text style={s.cardBadgeText}>Pro registrované pěstitele</Text>
              </View>
              {newOrdersCount > 0 && (
                <View style={s.newOrdersBadge}>
                  <Text style={s.newOrdersBadgeText}>{newOrdersCount} nových objednávek</Text>
                </View>
              )}
              <View style={s.cardBtn}>
                <Text style={s.cardBtnText}>Přejít →</Text>
              </View>
            </TouchableOpacity>

            {/* Karta 3 — Nabízím bez registrace */}
            <TouchableOpacity
              style={[s.card, isDesktop && s.cardDesktop]}
              onPress={() => router.push('/stanky/pridat')}
              activeOpacity={0.88}
            >
              <View style={s.cardIconWrap}>
                <Text style={s.cardIconEmoji}>📦</Text>
              </View>
              <Text style={s.cardTitle}>Nabízím bez registrace</Text>
              <Text style={s.cardDesc}>
                Rychle nabídnu přebytky bez zakládání prodejny.
              </Text>
              <View style={[s.cardBadge, s.cardBadgeOrange]}>
                <Text style={[s.cardBadgeText, s.cardBadgeTextOrange]}>Jednorázová nabídka</Text>
              </View>
              <View style={s.cardBtn}>
                <Text style={s.cardBtnText}>Přidat nabídku →</Text>
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* ══ FARMER STATUS (jen přihlášení farmáři) ═══════════ */}
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

        {/* ══ KONTEXTOVÉ CTA (pokračovat u farmáře) ════════════ */}
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

        {/* ══ KOŠÍK SUMMARY ════════════════════════════════════ */}
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

        {/* ══ FOOTER ══════════════════════════════════════════ */}
        <View style={s.footer}>
          <Text style={s.footerText}>samopestitele.cz · info@samopestitele.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const HERO_HEIGHT = 300;
const HERO_HEIGHT_DESKTOP = 400;
const CARDS_OVERLAP = 72;

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center:   { justifyContent: 'center', alignItems: 'center' },
  scroll:   { flex: 1 },
  content:  { flexGrow: 1, paddingBottom: 40 },

  // ── Hero wrapper — zajišťuje overlap karet přes hero ─────────
  heroWrapper: {
    // Na mobilu: hero + karty pod sebou, karty přesahují hero dolů
    marginBottom: CARDS_OVERLAP,
  },
  heroWrapperDesktop: {
    marginBottom: CARDS_OVERLAP + 20,
  },

  heroBg: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroBgDesktop: {
    height: HERO_HEIGHT_DESKTOP,
  },

  // TODO: nahradit placeholderové pozadí hero obrázkem
  heroBgPlaceholder: {
    backgroundColor: '#1c3a1c',
  },
  // Dekorativní vrstvy pro placeholderový gradient efekt
  heroBgLayer1: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#2a5c2a',
    opacity: 0.5,
  },
  heroBgLayer2: {
    position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0,
    backgroundColor: '#1a3a1a',
    opacity: 0.6,
    borderTopLeftRadius: 200,
  },

  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: CARDS_OVERLAP + 18,
    zIndex: 1,
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
  betaBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTitleDesktop: { fontSize: 58 },
  heroTagline: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 26,
    marginBottom: 8,
    fontWeight: '500',
  },
  heroTaglineDesktop: { fontSize: 21 },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },

  // ── Tři karty překrývající hero ──────────────────────────────
  cards: {
    position: 'absolute',
    bottom: -CARDS_OVERLAP,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardsDesktop: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    bottom: -(CARDS_OVERLAP + 20),
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    alignItems: 'center',
  },
  cardDesktop: { flex: 1 },
  cardPrimary: { backgroundColor: '#4caf50' },

  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconEmoji: { fontSize: 26 },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardTitlePrimary: { color: '#ffffff' },

  cardDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardDescPrimary: { color: 'rgba(255,255,255,0.88)' },

  cardBadge: {
    backgroundColor: '#f1f8e9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  cardBadgePrimary: { backgroundColor: 'rgba(255,255,255,0.22)' },
  cardBadgeOrange: { backgroundColor: '#fff3e0' },
  cardBadgeText: { fontSize: 11, color: '#2e7d32', fontWeight: '600' },
  cardBadgeTextPrimary: { color: '#ffffff' },
  cardBadgeTextOrange: { color: '#f57c00' },

  newOrdersBadge: {
    backgroundColor: '#ffebee',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  newOrdersBadgeText: { fontSize: 11, color: '#c62828', fontWeight: '700' },

  cardBtn: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  cardBtnText: { fontSize: 14, fontWeight: '700', color: '#FF9800' },
  cardBtnTextPrimary: { color: '#ffffff' },

  // ── Farmer status ────────────────────────────────────────────
  statusSection: {
    paddingHorizontal: 14,
    paddingTop: 16,
    marginTop: CARDS_OVERLAP + 8,
  },

  // ── Kontextové CTA ───────────────────────────────────────────
  continueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  continueBannerText: { fontSize: 13, color: '#f57c00', fontWeight: '600', flex: 1 },
  continueBannerClose: { padding: 4, marginLeft: 8 },
  continueBannerCloseText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  // ── Košík summary ────────────────────────────────────────────
  cartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 14,
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

  // ── Plovoucí košík tlačítko ──────────────────────────────────
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

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: { fontSize: 12, color: '#c4c9d0' },
});
