import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ImageBackground, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { supabase } from '@/lib/supabaseClient';

const HERO_IMG = require('../../web-landing/back1.png');
const SPLASH_FALLBACK = require('../../assets/images/splash.png');

export default function HomeScreenWeb() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useFarmarAuth();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [distance, setDistance] = useState(20);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('pestitele')
      .select('id, nazev_farmy, jmeno, lokace, lat, lng, produkty')
      .ilike('produkty', `%${query}%`)
      .limit(10);
    setResults(data || []);
    setSearching(false);
  };

  const isMobile = !mounted || width < 768;
  const isMini = mounted && width < 390;
  const prodejnaRoute: any = isAuthenticated ? '/(tabs)/moje-prodejna' : '/registrace';

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>

      {/* ── HERO ── */}
      <ImageBackground
        source={HERO_IMG}
        defaultSource={SPLASH_FALLBACK}
        style={[s.hero, { height: isMini ? 220 : isMobile ? 300 : 500 }]}
        resizeMode="cover"
      >
        <View style={s.heroOverlay} />
        <View style={[s.heroInner, { paddingHorizontal: isMobile ? 16 : 24 }]}>
          <Text style={[s.heroTitle, {
            fontSize: isMini ? 24 : isMobile ? 28 : 56,
            textAlign: 'center',
            marginBottom: 6,
          }]}>Samopěstitelé</Text>
          <Text style={[s.heroTagline, {
            fontSize: isMini ? 13 : isMobile ? 15 : 22,
            textAlign: 'center',
          }]}>
            {isMobile ? 'Čerstvé produkty přímo od pěstitelů.' : 'Čerstvé produkty přímo od lidí ve vašem okolí.'}
          </Text>
          <Text style={[s.heroSub, {
            fontSize: 16,
            display: isMobile ? 'none' : 'flex',
          }]}>
            Vyhledejte, domluvte odběr nebo nabídněte vlastní přebytky.
          </Text>

          <View style={[s.searchWrap, isMobile
            ? { width: width - 32 }
            : { maxWidth: 560, width: '100%' as any }
          ]}>
            <TextInput
              style={s.searchInput}
              placeholder="Co hledáte? (např. vejce, rajčata, med...)"
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={searching}>
              {searching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.searchBtnText}>🔍</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* ── VÝSLEDKY HLEDÁNÍ ── */}
      {results.length > 0 && (
        <View style={[s.resultsWrap, { marginHorizontal: isMini ? 12 : isMobile ? 16 : 40 }]}>
          <View style={[s.resultsHeader, {
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
          }]}>
            <Text style={s.resultsTitle}>
              Nalezeno {results.length} pěstitelů · „{query}"
            </Text>
            <View style={s.distanceRow}>
              <Text style={s.distanceLabel}>do</Text>
              {[5, 10, 20, 50].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.distChip, distance === d && s.distChipActive]}
                  onPress={() => setDistance(d)}
                >
                  <Text style={[s.distChipText, distance === d && s.distChipTextActive]}>
                    {d} km
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.reSearchBtn} onPress={handleSearch}>
                <Text style={s.reSearchText}>Hledat znovu</Text>
              </TouchableOpacity>
            </View>
          </View>

          {results.map(item => (
            <TouchableOpacity
              key={item.id}
              style={s.resultItem}
              onPress={() => router.push(`/pestitele/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={s.resultIcon}>
                <Text style={{ fontSize: 24 }}>🌾</Text>
              </View>
              <View style={s.resultBody}>
                <Text style={s.resultName}>{item.nazev_farmy || item.jmeno}</Text>
                <Text style={s.resultMeta}>{item.produkty}{item.lokace ? ` · ${item.lokace}` : ''}</Text>
              </View>
              <View style={s.resultRight}>
                <Text style={s.resultLink}>Zobrazit prodejnu →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── KARTY ── */}
      {isMobile ? (
        /* ── MOBIL: nová hierarchie ── */
        <View style={[s.cardsOuter, { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20, marginTop: 0 }]}>

          {/* 1. Zákazníci – velká zelená karta */}
          <View style={s.mCard1}>
            <Text style={s.mCard1Title}>Hledat v okolí</Text>
            <Text style={s.mCard1Desc}>Filtrujte podle vzdálenosti, kategorie a sezóny.</Text>
            <TouchableOpacity style={s.mCard1Btn} onPress={() => router.push('/mapa')} activeOpacity={0.85}>
              <Text style={s.mCard1BtnText}>Otevřít mapu →</Text>
            </TouchableOpacity>
          </View>

          {/* 2. Dočasný stánek – střední karta s zeleným okrajem */}
          <View style={s.mCard2}>
            <Text style={s.mCard2Title}>Nabízím bez registrace</Text>
            <Text style={s.mCard2Desc}>Rychle nabídnu přebytky bez zakládání prodejny.</Text>
            <TouchableOpacity style={s.mCard2Btn} onPress={() => router.push('/stanky/pridat')} activeOpacity={0.85}>
              <Text style={s.mCard2BtnText}>Přidat nabídku →</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Trvalý stánek – jen řádek */}
          <TouchableOpacity style={s.mCard3Row} onPress={() => router.push(prodejnaRoute)} activeOpacity={0.7}>
            <Text style={s.mCard3Label}>Prodáváte pravidelně?</Text>
            <Text style={s.mCard3Link}>Založit stánek →</Text>
          </TouchableOpacity>

        </View>
      ) : (
        /* ── DESKTOP: původní 3 karty vedle sebe ── */
        <View style={[s.cardsOuter, { paddingHorizontal: 40, marginTop: -60 }]}>
          <View style={s.cardsRow}>

            {/* Karta 1 – Zákazníci */}
            <View style={[s.card, s.cardGreen, s.cardWide]}>
              <View style={[s.badge, s.badgeWhite]}>
                <Text style={s.badgeWhiteText}>Pokročilé hledání</Text>
              </View>
              <Text style={[s.cardTitle, s.cardTitleWhite]}>Zákazníci</Text>
              <Text style={[s.cardDesc, s.cardDescWhite]}>
                Filtrujte podle vzdálenosti, kategorie a sezóny.
              </Text>
              <TouchableOpacity style={s.btnWhite} onPress={() => router.push('/mapa')} activeOpacity={0.85}>
                <Text style={s.btnWhiteText}>Hledat na mapě</Text>
              </TouchableOpacity>
            </View>

            {/* Karta 2 – Moje prodejna */}
            <View style={[s.card, s.cardWhite, s.cardWide]}>
              <View style={[s.badge, s.badgeGray]}>
                <Text style={s.badgeGrayText}>Pro pěstitele</Text>
              </View>
              <Text style={s.cardTitle}>Prodáváte pravidelně?</Text>
              <Text style={s.cardDesc}>Založte si virtuální stánek</Text>
              <TouchableOpacity style={s.btnDark} onPress={() => router.push(prodejnaRoute)} activeOpacity={0.85}>
                <Text style={s.btnDarkText}>Založit stánek →</Text>
              </TouchableOpacity>
            </View>

            {/* Karta 3 – Nabízím bez registrace */}
            <View style={[s.card, s.cardWhite, s.cardWide]}>
              <View style={[s.badge, s.badgeOrange]}>
                <Text style={s.badgeOrangeText}>Jednorázová nabídka</Text>
              </View>
              <Text style={s.cardTitle}>Nabízím bez registrace</Text>
              <Text style={s.cardDesc}>Rychle nabídnu přebytky bez zakládání prodejny.</Text>
              <TouchableOpacity style={s.btnDark} onPress={() => router.push('/stanky/pridat')} activeOpacity={0.85}>
                <Text style={s.btnDarkText}>Přidat nabídku</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      )}

      {/* ── FOOTER ── */}
      <View style={s.footer}>
        <Text style={s.footerText}>© 2026 Samopěstitelé.cz</Text>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Hero
  hero: { width: '100%' as any, height: 500, justifyContent: 'center', alignItems: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  heroInner: { alignItems: 'center', width: '100%' as any, zIndex: 1 },
  heroTitle: {
    fontSize: 56, fontWeight: '800', color: '#ffffff',
    textAlign: 'center', marginBottom: 16,
  },
  heroTagline: {
    fontSize: 22, color: '#ffffff', textAlign: 'center',
    lineHeight: 32, marginBottom: 10,
  },
  heroSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 24,
  },

  // Cards outer
  cardsOuter: {
    width: '100%' as any, alignItems: 'center',
    paddingBottom: 48, paddingTop: 0,
    backgroundColor: '#ffffff', zIndex: 10,
  },
  cardsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    maxWidth: 1100, width: '100%' as any, gap: 20, justifyContent: 'center',
  },
  cardsRowNarrow: { flexDirection: 'column', alignItems: 'stretch' },

  // Card base
  card: {
    borderRadius: 16, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  cardWide: { flex: 1 },
  cardGreen: { backgroundColor: '#4caf50' },
  cardWhite: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },

  // Badges
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14, alignSelf: 'center' },
  badgeWhite: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeWhiteText: { fontSize: 12, color: '#ffffff', fontWeight: '600' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeGrayText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  badgeOrange: { backgroundColor: '#fff7ed' },
  badgeOrangeText: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },

  // Card text
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 10 },
  cardTitleWhite: { color: '#ffffff' },
  cardDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24, flex: 1 },
  cardDescWhite: { color: 'rgba(255,255,255,0.88)' },

  // Buttons
  btnWhite: {
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28, minWidth: 140, alignItems: 'center',
  },
  btnWhiteText: { fontSize: 15, fontWeight: '700', color: '#4caf50' },
  btnDark: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28, minWidth: 140, alignItems: 'center',
  },
  btnDarkText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // Footer
  footer: { paddingVertical: 24, alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  footerText: { fontSize: 13, color: '#9ca3af' },

  // Mobile cards
  mCard1: {
    backgroundColor: '#4caf50', borderRadius: 16, padding: 16, marginBottom: 8,
  },
  mCard1Title: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  mCard1Desc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 12 },
  mCard1Btn: {
    backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 10,
    paddingHorizontal: 16, alignSelf: 'flex-start' as any,
  },
  mCard1BtnText: { fontSize: 13, fontWeight: '700', color: '#4caf50' },

  mCard2: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 0,
    borderWidth: 2, borderColor: '#4caf50',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mCard2Title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  mCard2Desc: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  mCard2Btn: {
    backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 10,
    paddingHorizontal: 16, alignSelf: 'flex-start' as any,
  },
  mCard2BtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  mCard3Row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, marginTop: 8,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  mCard3Label: { fontSize: 13, color: '#6b7280' },
  mCard3Link: { fontSize: 13, color: '#4caf50', fontWeight: '600' },

  // Search
  searchWrap: {
    flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 12,
    padding: 4, marginTop: 16, marginHorizontal: 16, alignItems: 'center',
  },
  searchInput: {
    flex: 1, fontSize: 14, padding: 10, color: '#1a1a1a',
    outlineStyle: 'none' as any,
  },
  searchBtn: {
    backgroundColor: '#4caf50', borderRadius: 8,
    padding: 10, paddingHorizontal: 10, minWidth: 44, alignItems: 'center',
  },
  searchBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },

  // Results
  resultsWrap: {
    backgroundColor: '#ffffff', borderRadius: 16, marginTop: 12,
    overflow: 'hidden' as any, borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  resultsHeader: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 8,
  },
  resultsTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' as any },
  distanceLabel: { fontSize: 12, color: '#6b7280' },
  distChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  distChipActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  distChipText: { fontSize: 12, color: '#6b7280' },
  distChipTextActive: { color: '#ffffff' },
  reSearchBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#4caf50',
  },
  reSearchText: { fontSize: 12, color: '#4caf50', fontWeight: '500' },
  resultItem: {
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  resultIcon: {
    width: 40, height: 40, backgroundColor: '#f9fafb', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  resultBody: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  resultMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  resultRight: { alignItems: 'flex-end' },
  resultLink: { fontSize: 12, color: '#4caf50', textDecorationLine: 'underline' as any },
});
