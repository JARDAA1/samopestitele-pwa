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

      <ScrollView
        style={s.container}
        contentContainerStyle={[
          s.content,
          Platform.OS === 'web' && { maxWidth: 680, alignSelf: 'center' as const, width: '100%' },
        ]}
      >

        {/* ══ HERO ══════════════════════════════════════════ */}
        <View style={s.hero}>
          <View style={s.betaBadge}>
            <Text style={s.betaBadgeText}>BETA</Text>
          </View>
          <Text style={[s.appName, isDesktop && s.appNameDesktop]}>Samopěstitelé</Text>
          <Text style={[s.heroSubtitle, isDesktop && s.heroSubtitleDesktop]}>
            Najděte čerstvé produkty přímo od pěstitelů ve vašem okolí.
          </Text>
          <Text style={[s.heroDesc, isDesktop && s.heroDescDesktop]}>
            Vyberete si, domluvíte odběr a vyzvednete u pěstitele.{'\n'}Bez skladu, bez dopravy, napřímo.
          </Text>

          {!isAuthenticated && (
            <View style={s.heroCtas}>
              <TouchableOpacity
                style={s.ctaPrimary}
                onPress={() => router.push('/mapa')}
                activeOpacity={0.85}
              >
                <Text style={s.ctaPrimaryText}>Hledat produkty v okolí</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.ctaSecondary}
                onPress={() => router.push('/moje-prodejna')}
                activeOpacity={0.75}
              >
                <Text style={s.ctaSecondaryText}>Jsem pěstitel →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ══ TRUST STRIP (jen nepřihlášení) ════════════════ */}
        {!isAuthenticated && (
          <View style={s.trustStrip}>
            {(['Žádná doprava', 'Bez anonymního skladu', 'Přímý kontakt', 'Lokální a sezónní'] as const).map(t => (
              <View key={t} style={s.trustChip}>
                <Text style={s.trustChipText}>✓ {t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ══ FEATURE CARDS (jen nepřihlášení) ══════════════ */}
        {!isAuthenticated && (
          <View style={s.featureSection}>
            <Text style={s.featureSectionTitle}>Nejsme e-shop. Jsme sousedé.</Text>
            {[
              { emoji: '📦', title: 'Bez anonymního skladu', desc: 'Každý produkt má konkrétního pěstitele s adresou a tváří.' },
              { emoji: '🤝', title: 'Odběr přímo u pěstitele', desc: 'Přijdete si pro zboží osobně – žádná doprava, žádné balíkové centrum.' },
              { emoji: '🌱', title: 'Lokální a sezónní', desc: 'Nabídka odráží to, co právě roste – čerstvé, bez zbytečné cesty.' },
            ].map(item => (
              <View key={item.title} style={s.featureCard}>
                <View style={s.featureIconWrap}>
                  <Text style={s.featureEmoji}>{item.emoji}</Text>
                </View>
                <View style={s.featureBody}>
                  <Text style={s.featureCardTitle}>{item.title}</Text>
                  <Text style={s.featureCardDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ SEKCE A: CHCI NAKOUPIT ════════════════════════ */}
        <View style={s.roleSection}>
          <View style={s.roleSectionHeader}>
            <Text style={s.roleSectionTitle}>Chci nakoupit</Text>
            <Text style={s.roleSectionDesc}>Najděte pěstitele a produkty ve svém okolí.</Text>
          </View>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/mapa')} activeOpacity={0.85}>
            <View style={s.actionCardInner}>
              <View style={[s.actionCardIcon, { backgroundColor: '#e8f5e9' }]}>
                <Text style={s.actionCardEmoji}>🗺</Text>
              </View>
              <View style={s.actionCardBody}>
                <Text style={s.actionCardTitle}>Hledat na mapě</Text>
                <Text style={s.actionCardSub}>Bez registrace.</Text>
              </View>
              {listItemCount > 0 && (
                <View style={[s.pill, { backgroundColor: '#FF9800' }]}>
                  <Text style={s.pillText}>{listItemCount > 99 ? '99+' : listItemCount}</Text>
                </View>
              )}
              <Text style={s.actionCardArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {listItemCount > 0 && lastFarmer && !ctaDismissed && (
            <View style={s.continueCta}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push(`/farmar/${lastFarmer.id}` as any)}
                activeOpacity={0.7}
              >
                <Text style={s.continueCtaText}>Pokračovat u: {lastFarmer.name} →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.continueCtaClose} onPress={() => setCtaDismissed(true)}>
                <Text style={s.continueCtaCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {itemCount > 0 && (
            <View style={s.cartSummary}>
              <TouchableOpacity style={s.cartSummaryRow} onPress={() => setCartExpanded(p => !p)} activeOpacity={0.7}>
                <Text style={s.cartSummaryLabel}>🛒 Již vybráno</Text>
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
            </View>
          )}
        </View>

        {/* ══ SEKCE B: CHCI PRODÁVAT ════════════════════════ */}
        <View style={[s.roleSection, s.roleSectionBorder]}>
          <View style={s.roleSectionHeader}>
            <Text style={s.roleSectionTitle}>Chci prodávat</Text>
            <Text style={s.roleSectionDesc}>Spravujte svoji prodejnu, produkty a aktuální místo prodeje.</Text>
          </View>

          {showStatusCard && (
            <FarmerStatusCard
              isActive={isActive}
              activeMisto={activeMisto}
              isDesktop={isDesktop}
              defaultAdresa={farmerProfile?.adresa || farmerProfile?.mesto || undefined}
              onPress={handleCardPress}
            />
          )}

          <TouchableOpacity
            style={[s.actionCard, showStatusCard && s.actionCardMuted]}
            onPress={() => router.push(
              isAuthenticated
                ? (isMobile ? '/(tabs)/moje-prodejna/operativa' : '/(tabs)/moje-prodejna')
                : '/moje-prodejna'
            )}
            activeOpacity={0.85}
          >
            <View style={s.actionCardInner}>
              <View style={[s.actionCardIcon, { backgroundColor: '#e8f5e9' }]}>
                <Text style={s.actionCardEmoji}>🏠</Text>
              </View>
              <View style={s.actionCardBody}>
                <Text style={[s.actionCardTitle, showStatusCard && s.actionCardTitleMuted]}>
                  Moje prodejna
                </Text>
                <Text style={s.actionCardSub}>
                  {isAuthenticated ? 'Spravovat produkty a objednávky' : 'Pro registrované pěstitele.'}
                </Text>
              </View>
              {newOrdersCount > 0 && (
                <View style={[s.pill, { backgroundColor: '#F44336' }]}>
                  <Text style={s.pillText}>{newOrdersCount}</Text>
                </View>
              )}
              <Text style={s.actionCardArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ══ SEKCE C: PŘÍLEŽITOSTNÍ PRODEJ ════════════════ */}
        <View style={[s.roleSection, s.roleSectionBorder]}>
          <View style={s.roleSectionHeader}>
            <Text style={[s.roleSectionTitle, { color: '#f57c00' }]}>Prodávám tady dnes</Text>
            <Text style={s.roleSectionDesc}>Bez registrace, jen foto a poloha. Zmizí o půlnoci.</Text>
          </View>
          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/stanky/pridat')} activeOpacity={0.85}>
            <View style={s.actionCardInner}>
              <View style={[s.actionCardIcon, { backgroundColor: '#fff8e1' }]}>
                <Text style={s.actionCardEmoji}>🌻</Text>
              </View>
              <View style={s.actionCardBody}>
                <Text style={s.actionCardTitle}>Přidat stánek</Text>
                <Text style={s.actionCardSub}>Bez registrace.</Text>
              </View>
              <Text style={s.actionCardArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ══ STÁNKY DNES ═══════════════════════════════════ */}
        <StankyDnesSection isDesktop={isDesktop} />

        {/* ══ FOOTER ════════════════════════════════════════ */}
        <View style={s.footer}>
          <Text style={s.footerText}>Spojujeme pěstitele s lidmi, kteří chtějí jíst zdravě a lokálně</Text>
          <Text style={s.footerEmail}>info@samopestitele.cz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // ── Základ ─────────────────────────────────────────────────
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flexGrow: 1, paddingBottom: 40 },

  // ── Hero ───────────────────────────────────────────────────
  hero: {
    backgroundColor: '#ffffff',
    paddingTop: 28,
    paddingBottom: 28,
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
    marginBottom: 14,
  },
  betaBadgeText: { color: '#4caf50', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  appName: { fontSize: 38, fontWeight: '800', color: '#1a1a1a', letterSpacing: -1, marginBottom: 10 },
  appNameDesktop: { fontSize: 52 },
  heroSubtitle: { fontSize: 17, fontWeight: '500', color: '#374151', lineHeight: 26, marginBottom: 8 },
  heroSubtitleDesktop: { fontSize: 20 },
  heroDesc: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24 },
  heroDescDesktop: { fontSize: 16, lineHeight: 26 },
  heroCtas: { gap: 10 },
  ctaPrimary: {
    backgroundColor: '#4caf50',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  ctaSecondary: { paddingVertical: 12, alignItems: 'center' },
  ctaSecondaryText: { color: '#4caf50', fontSize: 15, fontWeight: '600' },

  // ── Trust strip ────────────────────────────────────────────
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trustChip: {
    backgroundColor: '#f1f8e9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trustChipText: { fontSize: 12, color: '#2e7d32', fontWeight: '500' },

  // ── Feature cards ──────────────────────────────────────────
  featureSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 4,
  },
  featureSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f8e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureEmoji: { fontSize: 22 },
  featureBody: { flex: 1 },
  featureCardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  featureCardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 19 },

  // ── Role sekce ─────────────────────────────────────────────
  roleSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 8,
  },
  roleSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  roleSectionHeader: { marginBottom: 16 },
  roleSectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  roleSectionDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  // ── Action card (klikatelná CTA karta) ─────────────────────
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  actionCardMuted: { backgroundColor: '#f9fafb' },
  actionCardInner: { flexDirection: 'row', alignItems: 'center' },
  actionCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardEmoji: { fontSize: 26 },
  actionCardBody: { flex: 1, marginLeft: 14 },
  actionCardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  actionCardTitleMuted: { color: '#9ca3af' },
  actionCardSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  actionCardArrow: { fontSize: 20, color: '#FF9800', marginLeft: 8 },

  // ── Kontextové CTA (pokračovat u farmáře) ─────────────────
  continueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  continueCtaText: { fontSize: 13, color: '#f57c00', fontWeight: '600', flex: 1 },
  continueCtaClose: { padding: 4, marginLeft: 8 },
  continueCtaCloseText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },

  // ── Košík summary ──────────────────────────────────────────
  cartSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cartSummaryRow: { flexDirection: 'row', alignItems: 'center' },
  cartSummaryLabel: { fontSize: 13, color: '#FF9800', fontWeight: '600', flex: 1 },
  cartList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  groupSep: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  groupName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  groupItem: { fontSize: 12, color: '#6b7280', marginLeft: 8, lineHeight: 18 },
  goBtn: { marginTop: 10, backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  goBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Sdílené ────────────────────────────────────────────────
  pill: { borderRadius: 9, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginRight: 4 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 11, color: '#9ca3af' },

  // ── Plovoucí košík ─────────────────────────────────────────
  cartButton: {
    position: 'absolute', top: 8, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 22, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: '#FF9800',
    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cartIcon: { fontSize: 20 },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 12,
  },
  footerText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  footerEmail: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
});
