import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, useWindowDimensions, ImageBackground,
} from 'react-native';
import { router } from 'expo-router';

const BG_IMG = require('../../assets/images/Registrace_zahradka.png');

export default function RegistraceRozcestnikWeb() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ImageBackground source={BG_IMG} style={s.bg} resizeMode="cover">
      <View style={s.overlay} pointerEvents="none" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Zpět nahoře vlevo ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.push('/')} activeOpacity={0.8}>
            <Text style={s.backBtnText}>← Zpět</Text>
          </TouchableOpacity>
        </View>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerEmoji}>🌾</Text>
          <Text style={[s.headerTitle, isMobile && { fontSize: 32 }]}>Samopěstitelé</Text>
          <Text style={[s.headerSub, isMobile && { fontSize: 18 }]}>Jak chcete začít?</Text>
        </View>

        {/* ── 3 karty ── */}
        <View style={[s.cardsRow, isMobile && s.cardsRowMobile]}>

          {/* Karta 1: Přihlásit se */}
          <View style={[s.card, s.cardWhite, !isMobile && s.cardDesktop]}>
            <View style={[s.badge, s.badgeBlue]}>
              <Text style={s.badgeBlueText}>Mám už účet</Text>
            </View>
            <Text style={s.cardTitleDark}>Přihlásit se</Text>
            <Text style={s.cardDescGray}>
              Přihlaste se ke své stávající prodejně a spravujte nabídku.
            </Text>
            <TouchableOpacity
              style={s.btnGreen}
              onPress={() => router.push('/prihlaseni')}
              activeOpacity={0.85}
            >
              <Text style={s.btnGreenText}>Přihlásit →</Text>
            </TouchableOpacity>
          </View>

          {/* Karta 2: Rychlý start */}
          <View style={[s.card, s.cardGreen, !isMobile && s.cardDesktop]}>
            <View style={s.badgeGreenCard}>
              <Text style={s.badgeGreenCardText}>Doporučeno</Text>
            </View>
            <Text style={s.cardTitleWhite}>Rychlý start</Text>
            <Text style={s.cardDescWhite}>
              Základní údaje a začněte hned prodávat. Jméno, telefon, místo prodeje.
            </Text>
            <TouchableOpacity
              style={s.btnWhite}
              onPress={() => router.push('/registrace/rychly-start' as any)}
              activeOpacity={0.85}
            >
              <Text style={s.btnWhiteText}>Začít →</Text>
            </TouchableOpacity>
          </View>

          {/* Karta 3: Detailní registrace */}
          <View style={[s.card, s.cardWhite, !isMobile && s.cardDesktop]}>
            <View style={[s.badge, s.badgeGray]}>
              <Text style={s.badgeGrayText}>Kompletní profil</Text>
            </View>
            <Text style={s.cardTitleDark}>Detailní registrace</Text>
            <Text style={s.cardDescGray}>
              Kompletní údaje, fotky, certifikáty. E-mail. Poloha farmy. Souhlas s podmínkami.
            </Text>
            <TouchableOpacity
              style={s.btnDark}
              onPress={() => router.push('/registrace/detail' as any)}
              activeOpacity={0.85}
            >
              <Text style={s.btnDarkText}>Pokračovat →</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={s.footerLink}>← Zpět na úvodní stránku</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  topBar: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  backBtnText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },

  header: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 36, paddingBottom: 40,
  },
  headerEmoji: { fontSize: 64, marginBottom: 12 },
  headerTitle: {
    fontSize: 42, fontWeight: '800', color: '#ffffff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8, marginBottom: 10,
  },
  headerSub: { fontSize: 22, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },

  cardsRow: {
    flexDirection: 'row', paddingHorizontal: 24, gap: 16,
    maxWidth: 1100 as any, width: '100%' as any, alignSelf: 'center' as any,
  },
  cardsRowMobile: { flexDirection: 'column' },
  cardDesktop: { flex: 1, minWidth: 280 },

  card: {
    borderRadius: 20, padding: 28, alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 15,
  },
  cardWhite: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  cardGreen: { backgroundColor: '#6aa84f', borderWidth: 1, borderColor: '#5a9440' },

  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeBlueText: { fontSize: 12, color: '#1d4ed8', fontWeight: '700' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeGrayText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  badgeGreenCard: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
  },
  badgeGreenCardText: { fontSize: 12, color: '#ffffff', fontWeight: '700' },

  cardTitleDark: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  cardTitleWhite: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 10 },
  cardDescGray: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24, flex: 1 },
  cardDescWhite: { fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 22, marginBottom: 24, flex: 1 },

  btnGreen: {
    backgroundColor: '#6aa84f', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28, alignSelf: 'stretch' as any, alignItems: 'center',
  },
  btnGreenText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  btnWhite: {
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28, alignSelf: 'stretch' as any, alignItems: 'center',
  },
  btnWhiteText: { fontSize: 15, fontWeight: '700', color: '#6aa84f' },
  btnDark: {
    backgroundColor: '#111827', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28, alignSelf: 'stretch' as any, alignItems: 'center',
  },
  btnDarkText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  footer: { paddingVertical: 40, alignItems: 'center' },
  footerLink: {
    fontSize: 14, color: '#ffffff',
    textDecorationLine: 'underline' as any,
  },
});
