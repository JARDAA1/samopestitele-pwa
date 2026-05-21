import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  ScrollView, ImageBackground, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

const HERO_IMG = require('../../web-landing/back1.png');
const SPLASH_FALLBACK = require('../../assets/images/splash.png');

export default function HomeScreenWeb() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useFarmarAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isMobile = !mounted || width < 768;
  const isMini = mounted && width < 390;
  const prodejnaRoute: any = isAuthenticated ? '/(tabs)/moje-prodejna' : '/registrace';

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>

      {/* ── HERO ── */}
      <ImageBackground
        source={HERO_IMG}
        defaultSource={SPLASH_FALLBACK}
        style={[s.hero, { height: isMini ? 220 : isMobile ? 280 : 500, overflow: 'hidden' }]}
        resizeMode="cover"
      >
        <View style={s.heroOverlay} />
        <View style={[s.heroInner, {
          paddingHorizontal: 20,
          alignItems: isMobile ? 'flex-start' : 'center',
        }]}>
          <Text style={[s.heroTitle, {
            fontSize: isMini ? 24 : isMobile ? 28 : 56,
            textAlign: isMobile ? 'left' : 'center',
            marginBottom: 6,
          }]}>Samopěstitelé</Text>
          <Text style={[s.heroTagline, {
            fontSize: isMini ? 13 : isMobile ? 15 : 22,
            textAlign: isMobile ? 'left' : 'center',
          }]}>
            {isMobile ? 'Čerstvé produkty přímo od pěstitelů.' : 'Čerstvé produkty přímo od lidí ve vašem okolí.'}
          </Text>
          <Text style={[s.heroSub, {
            fontSize: isMobile ? 13 : 16,
            display: isMobile ? 'none' : 'flex',
          }]}>
            Vyhledejte, domluvte odběr nebo nabídněte vlastní přebytky.
          </Text>
        </View>
      </ImageBackground>

      {/* ── KARTY ── */}
      <View style={[s.cardsOuter, {
        paddingHorizontal: isMini ? 12 : isMobile ? 16 : 40,
        marginTop: isMobile ? 20 : -60,
      }]}>
        <View style={[s.cardsRow, isMobile && s.cardsRowNarrow,
          isMobile && { gap: isMini ? 8 : 12 }]}>

          {/* Karta 1 – Zákazníci */}
          <View style={[s.card, s.cardGreen, !isMobile && s.cardWide,
            isMobile && { padding: isMini ? 14 : 16, borderRadius: 16, marginBottom: isMini ? 8 : 12 }]}>
            <View style={[s.badge, s.badgeWhite]}>
              <Text style={[s.badgeWhiteText, isMobile && { fontSize: 11 }]}>Bez registrace</Text>
            </View>
            <Text style={[s.cardTitle, s.cardTitleWhite,
              isMobile && { fontSize: 20 }]}>Zákazníci</Text>
            <Text style={[s.cardDesc, s.cardDescWhite,
              isMobile && { fontSize: 13 }]}>
              Najděte čerstvé produkty v okolí.
            </Text>
            <TouchableOpacity
              style={s.btnWhite}
              onPress={() => router.push('/mapa')}
              activeOpacity={0.85}
            >
              <Text style={s.btnWhiteText}>Vyhledat</Text>
            </TouchableOpacity>
          </View>

          {/* Karta 2 – Moje prodejna */}
          <View style={[s.card, s.cardWhite, !isMobile && s.cardWide,
            isMobile && { padding: isMini ? 14 : 16, borderRadius: 16, marginBottom: isMini ? 8 : 12 }]}>
            <View style={[s.badge, s.badgeGray]}>
              <Text style={[s.badgeGrayText, isMobile && { fontSize: 11 }]}>Pro registrované pěstitele</Text>
            </View>
            <Text style={[s.cardTitle, isMobile && { fontSize: 20 }]}>Moje prodejna</Text>
            <Text style={[s.cardDesc, isMobile && { fontSize: 13 }]}>
              Přihlášení a správa prodejny pěstitele.
            </Text>
            <TouchableOpacity
              style={s.btnDark}
              onPress={() => router.push(prodejnaRoute)}
              activeOpacity={0.85}
            >
              <Text style={s.btnDarkText}>Přejít</Text>
            </TouchableOpacity>
          </View>

          {/* Karta 3 – Nabízím bez registrace */}
          <View style={[s.card, s.cardWhite, !isMobile && s.cardWide,
            isMobile && { padding: isMini ? 14 : 16, borderRadius: 16, marginBottom: isMini ? 8 : 12 }]}>
            <View style={[s.badge, s.badgeOrange]}>
              <Text style={[s.badgeOrangeText, isMobile && { fontSize: 11 }]}>Jednorázová nabídka</Text>
            </View>
            <Text style={[s.cardTitle, isMobile && { fontSize: 20 }]}>Nabízím bez registrace</Text>
            <Text style={[s.cardDesc, isMobile && { fontSize: 13 }]}>
              Rychle nabídnu přebytky bez zakládání prodejny.
            </Text>
            <TouchableOpacity
              style={s.btnDark}
              onPress={() => router.push('/stanky/pridat')}
              activeOpacity={0.85}
            >
              <Text style={s.btnDarkText}>Přidat nabídku</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

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
  heroInner: { alignItems: 'center', paddingHorizontal: 24, zIndex: 1 },
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
});
