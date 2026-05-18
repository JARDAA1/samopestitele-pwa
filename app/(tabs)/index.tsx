import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ActivityIndicator,
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
import StankyDnesSection from '../_components/StankyDnesSection';

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

  // Farmer status
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
    // Parallel: farmer profile + active selling spot
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
        <ActivityIndicator size="large" color="#FF9800" />
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
          <View style={s.badge}>
            <Text style={s.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={s.container} contentContainerStyle={s.content}>

        {/* Hero */}
        <View style={[s.hero, isDesktop && s.heroDesktop]}>
          <View style={s.betaBadge}>
            <Text style={s.betaBadgeText}>BETA</Text>
          </View>
          <Text style={[s.appName, isDesktop && s.appNameDesktop]}>
            Samopěstitelé
          </Text>
          <Text style={[s.title, isDesktop && s.titleDesktop]}>
            Čerstvé produkty přímo od pěstitelů v okolí
          </Text>
          <Text style={[s.subtitle, isDesktop && s.subtitleDesktop]}>
            Objednej online, vyzvedni u pěstitele.{'\n'}
            Sezonní ovoce, zelenina a produkty farmy přímo ze zdroje.
          </Text>
          <Text style={[s.subtitleSecondary, isDesktop && s.subtitleSecondaryDesktop]}>
            Ideální pro návštěvníky regionu, chalupáře i místní.
          </Text>
        </View>

        {/* ─── HERO BANNER (jen nepřihlášení) ─────────────── */}
        {!isAuthenticated && (
          <View style={s.heroBanner}>
            <Text style={s.heroTitle}>Nejsme e-shop. Jsme sousedé.</Text>
            <View style={s.heroGrid}>
              <View style={s.heroItem}>
                <Text style={s.heroEmoji}>🏡</Text>
                <Text style={s.heroItemTitle}>Pro chalupáře</Text>
                <Text style={s.heroItemText}>Přebytek ze zahrady nabídni sousedům bez vývozu.</Text>
              </View>
              <View style={s.heroItem}>
                <Text style={s.heroEmoji}>🚶</Text>
                <Text style={s.heroItemTitle}>Pro návštěvníky</Text>
                <Text style={s.heroItemText}>Najdi co se právě sklízí přímo u pěstitelů v okolí.</Text>
              </View>
              <View style={s.heroItem}>
                <Text style={s.heroEmoji}>🌿</Text>
                <Text style={s.heroItemTitle}>Pro místní</Text>
                <Text style={s.heroItemText}>Kup přímo od souseda co roste za jeho plotem.</Text>
              </View>
            </View>
            <Text style={s.heroTagline}>Žádný košík. Žádná doprava. Jen živý kontakt.</Text>
          </View>
        )}

        {/* ─── 1. ZÁKAZNÍCI ────────────────────────────────── */}
        <View style={[s.zone, isDesktop && s.zoneDesktop]}>
          <Text style={[s.zoneLabel, { color: '#66BB6A' }]}>🍎 Zákazníci</Text>

          <View style={[s.card, s.cardCustomer]}>
            <TouchableOpacity onPress={() => router.push('/mapa')} activeOpacity={0.7}>
              <View style={s.cardRow}>
                <Text style={s.emoji}>🍎</Text>
                <View style={s.cardContent}>
                  <Text style={s.cardTitle}>Hledám produkty v okolí</Text>
                  <Text style={s.cardDesc}>Najít pěstitele na mapě</Text>
                </View>
                {listItemCount > 0 && (
                  <View style={[s.pill, { backgroundColor: '#FF9800' }]}>
                    <Text style={s.pillText}>{listItemCount > 99 ? '99+' : listItemCount}</Text>
                  </View>
                )}
                <Text style={s.arrow}>→</Text>
              </View>
            </TouchableOpacity>

            {listItemCount > 0 && lastFarmer && !ctaDismissed && (
              <>
                <View style={s.divider} />
                <View style={s.ctaRow}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/farmar/${lastFarmer.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.ctaText}>Pokračovat u: {lastFarmer.name} →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ctaClose} onPress={() => setCtaDismissed(true)}>
                    <Text style={s.ctaCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {itemCount > 0 && (
              <>
                <View style={s.divider} />
                <TouchableOpacity style={s.cardRow} onPress={() => setCartExpanded(p => !p)} activeOpacity={0.7}>
                  <Text style={s.cartLabel}>🛒 Již vybráno</Text>
                  <View style={[s.pill, { backgroundColor: '#FF9800' }]}>
                    <Text style={s.pillText}>{itemCount}</Text>
                  </View>
                  <Text style={s.chevron}>{cartExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {cartExpanded && (
                  <View style={s.cartList}>
                    {Object.values(cartGroups).map((group, gi) => (
                      <View key={gi} style={gi > 0 ? s.groupSep : undefined}>
                        <Text style={s.groupName}>🧺 {group.nazev}</Text>
                        {group.items.map((item, i) => (
                          <Text key={i} style={s.groupItem}>
                            • {item.nazev} — {formatMnozstvi(item.mnozstvi)} {item.jednotka}
                          </Text>
                        ))}
                      </View>
                    ))}
                    <TouchableOpacity style={s.goBtn} onPress={() => router.push('/kosik')}>
                      <Text style={s.goBtnText}>Přejít do košíku →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* ─── 2. FARMÁŘI A PĚSTITELÉ ─────────────────────── */}
        <View style={[s.zone, s.zoneSep, isDesktop && s.zoneDesktop]}>
          <Text style={[s.zoneLabel, { color: '#3a7a18' }]}>🧺 Farmáři a pěstitelé</Text>

          {/* Status karta — přepínač Prodávám / Neprodávám (jen registrovaní) */}
          {showStatusCard && (
            <FarmerStatusCard
              isActive={isActive}
              activeMisto={activeMisto}
              isDesktop={isDesktop}
              defaultAdresa={farmerProfile?.adresa || farmerProfile?.mesto || undefined}
              onPress={handleCardPress}
            />
          )}

          {/* Moje prodejna — hlavní pro neregistrované, sekundární pro registrované */}
          <TouchableOpacity
            style={[s.card, s.cardFarmer, showStatusCard && s.cardSecondary]}
            onPress={() => router.push(
              isAuthenticated
                ? (isMobile ? '/(tabs)/moje-prodejna/operativa' : '/(tabs)/moje-prodejna')
                : '/moje-prodejna'
            )}
          >
            <View style={s.cardRow}>
              <Text style={s.emoji}>🏠</Text>
              <View style={s.cardContent}>
                <Text style={[s.cardTitle, showStatusCard && s.cardTitleMuted]}>Moje prodejna</Text>
                <Text style={s.cardDesc}>
                  {isAuthenticated
                    ? 'Spravovat produkty a objednávky'
                    : 'Jen doplnění a správa profilu'}
                </Text>
              </View>
              {newOrdersCount > 0 && (
                <View style={[s.pill, { backgroundColor: '#F44336' }]}>
                  <Text style={s.pillText}>{newOrdersCount}</Text>
                </View>
              )}
              <Text style={s.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── 3. PŘÍLEŽITOSTNÍ PRODEJCI ───────────────────── */}
        <View style={[s.zone, s.zoneSep, isDesktop && s.zoneDesktop]}>
          <Text style={[s.zoneLabel, { color: '#FFA726' }]}>🌻 Prodejci bez registrace</Text>
          <TouchableOpacity
            style={[s.card, s.cardSeller]}
            onPress={() => router.push('/stanky/pridat')}
            activeOpacity={0.75}
          >
            <View style={s.cardRow}>
              <Text style={s.emoji}>🌻</Text>
              <View style={s.cardContent}>
                <Text style={s.cardTitle}>Prodávám tady dnes</Text>
                <Text style={s.cardDesc}>Bez registrace · foto + poloha · zmizí o půlnoci</Text>
              </View>
              <Text style={s.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stánky dnes — kdo dnes prodává v okolí */}
        <StankyDnesSection isDesktop={isDesktop} />

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Spojujeme pěstitele s lidmi, kteří chtějí jíst zdravě a lokálně</Text>
          <Text style={s.footerEmail}>info@samopestitele.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4fae8' },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f4fae8' },
  content: { flexGrow: 1 },

  // Hero
  betaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26,58,26,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(26,58,26,0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  betaBadgeText: {
    color: '#4a6a3a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  hero: { paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  heroDesktop: { paddingTop: 40, paddingBottom: 32, paddingHorizontal: 80, alignItems: 'center' },
  appName: { fontSize: 32, fontWeight: '800', color: '#1a3a1a', letterSpacing: 0.5, marginBottom: 4 },
  appNameDesktop: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '400', color: '#4a6a3a', lineHeight: 22, marginBottom: 8 },
  titleDesktop: { fontSize: 20, lineHeight: 28, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4a6a3a', lineHeight: 22, marginBottom: 8 },
  subtitleDesktop: { fontSize: 17, textAlign: 'center', lineHeight: 26, marginBottom: 12 },
  subtitleSecondary: { fontSize: 13, color: '#6a8a6a', fontStyle: 'italic', marginBottom: 16 },
  subtitleSecondaryDesktop: { fontSize: 15, textAlign: 'center', marginBottom: 24 },

  // Zóny (tři sekce: zákazníci / farmáři / prodejci)
  zone: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  zoneSep: { borderTopWidth: 1, borderTopColor: '#d1e8c4', paddingTop: 24, marginTop: 8 },
  zoneDesktop: { maxWidth: 720, alignSelf: 'center', width: '100%', paddingHorizontal: 40 },
  zoneLabel: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 2,
  },

  // Karty
  card: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#d1e8c4',
  },
  cardSecondary: { backgroundColor: '#f0f7e8', borderColor: '#d1e8c4' },
  cardCustomer: { borderLeftWidth: 3, borderLeftColor: '#66BB6A' },
  cardFarmer:   { borderLeftWidth: 3, borderLeftColor: '#3a7a18' },
  cardSeller:   { borderLeftWidth: 3, borderLeftColor: '#FFA726' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 12 },
  emoji: { fontSize: 32 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a3a1a', marginBottom: 2 },
  cardTitleMuted: { fontSize: 14, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#4a6a3a' },
  arrow: { fontSize: 18, color: '#FF9800', marginLeft: 8 },

  // Shared pill badge (used for cart, list count, new orders)
  pill: { borderRadius: 9, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginRight: 4 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Cart summary
  divider: { height: 1, backgroundColor: '#d1e8c4', marginTop: 10, marginBottom: 4 },
  cartLabel: { fontSize: 13, color: '#FF9800', fontWeight: '600', flex: 1 },
  chevron: { fontSize: 11, color: '#6a8a6a' },
  cartList: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#d1e8c4' },
  groupSep: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d1e8c4' },
  groupName: { fontSize: 13, fontWeight: '600', color: '#1a3a1a', marginBottom: 3 },
  groupItem: { fontSize: 12, color: '#4a6a3a', marginLeft: 8, lineHeight: 18 },
  goBtn: { marginTop: 10, backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  goBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Cart floating button
  cartButton: {
    position: 'absolute', top: 8, right: 16, zIndex: 10,
    backgroundColor: 'rgba(26,58,26,0.08)', borderRadius: 22, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: '#FF9800',
    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cartIcon: { fontSize: 20 },

  // CTA
  ctaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  ctaText: { fontSize: 13, color: '#FF9800', fontWeight: '600' },
  ctaClose: { padding: 4, marginLeft: 8 },
  ctaCloseText: { fontSize: 14, color: '#6a8a6a', fontWeight: '600' },

  // Hero banner (nepřihlášení)
  heroBanner: { backgroundColor: '#f4fae8', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#a8d87a' },
  heroTitle: { fontSize: 18, fontWeight: '600', color: '#1a3a1a', textAlign: 'center', marginBottom: 12 },
  heroGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  heroItem: { flex: 1, alignItems: 'center' },
  heroEmoji: { fontSize: 24, marginBottom: 4 },
  heroItemTitle: { fontSize: 11, fontWeight: '600', color: '#1a3a1a', textAlign: 'center', marginBottom: 2 },
  heroItemText: { fontSize: 10, color: '#4a6a3a', textAlign: 'center', lineHeight: 14 },
  heroTagline: { fontSize: 13, fontWeight: '600', color: '#3a7a18', textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#d1e8c4', marginTop: 24, marginBottom: 8 },
  footerText: { fontSize: 12, color: '#4a6a3a', textAlign: 'center' },
  footerEmail: { fontSize: 12, color: '#6a8a6a', textAlign: 'center', marginTop: 8 },
});
