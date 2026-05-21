import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';

// ── Produkty k výběru ────────────────────────────────────────────
const PRODUKTY = [
  { id: 'zelenina', label: 'Zelenina',         emoji: '🥦' },
  { id: 'ovoce',   label: 'Ovoce',             emoji: '🍎' },
  { id: 'vejce',   label: 'Vajíčka',           emoji: '🥚' },
  { id: 'mlecne',  label: 'Mléčné výrobky',   emoji: '🥛' },
];

// ── Pomocné funkce ───────────────────────────────────────────────
function generateUsername(jmeno: string): string {
  const clean = jmeno
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${clean.slice(0, 12)}_${suffix}`;
}

function generatePassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  let pwd = 'A' + digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 7; i++) {
    const pool = lower + digits;
    pwd += pool[Math.floor(Math.random() * pool.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// ── Hlavní komponenta ────────────────────────────────────────────
export default function RegistraceRozcestnikWeb() {
  const { register } = useFarmarAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Rychlý start state
  const [jmeno, setJmeno] = useState('');
  const [kontakt, setKontakt] = useState('');
  const [misto, setMisto] = useState('');
  const [selectedProdukty, setSelectedProdukty] = useState<string[]>([]);
  const [volnyPopis, setVolnyPopis] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleProdukt = (id: string) => {
    setSelectedProdukty(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRychlyStart = async () => {
    setErrorMsg('');
    if (!jmeno.trim())   { setErrorMsg('Zadejte jméno a příjmení'); return; }
    if (!kontakt.trim()) { setErrorMsg('Zadejte telefon nebo e-mail'); return; }
    if (!misto.trim())   { setErrorMsg('Zadejte místo prodeje'); return; }

    const isEmail  = kontakt.includes('@');
    const email    = isEmail ? kontakt.trim() : `auto_${generateUsername(jmeno)}@samopestitele.local`;
    const telefon  = isEmail ? '+420000000000' : kontakt.trim();
    const username = generateUsername(jmeno);
    const pin      = generatePassword();
    const firstName = jmeno.trim().split(' ')[0];

    setLoading(true);
    try {
      const result = await register({
        telefon,
        nazev_farmy: `${firstName}ova farma`,
        jmeno: jmeno.trim(),
        email,
        pin,
        username,
        mesto: misto.trim(),
      });

      if (result.success) {
        router.replace('/(tabs)/moje-prodejna');
      } else {
        setErrorMsg(result.error || 'Nepodařilo se vytvořit prodejnu');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Nepodařilo se vytvořit prodejnu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={s.backLink}>← Zpět na úvodní stránku</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/prihlaseni')}>
          <Text style={s.loginTopLink}>Přihlásit se</Text>
        </TouchableOpacity>
      </View>

      {/* ── Nadpis ── */}
      <View style={s.titleSection}>
        <Text style={[s.mainTitle, isMobile && { fontSize: 26 }]}>🌾 Jak chcete začít?</Text>
        <Text style={s.mainSubtitle}>Vyberte co vám vyhovuje</Text>
      </View>

      {/* ── Karty ── */}
      <View style={[s.cardsRow, isMobile && s.cardsRowMobile]}>

        {/* ─── Karta 1: Rychlý start ─── */}
        <View style={[s.card, s.cardGreen, !isMobile && s.cardHalf]}>

          <View style={s.cardHead}>
            <Text style={s.cardEmoji}>⚡</Text>
            <View style={s.badgeGreenCard}>
              <Text style={s.badgeGreenCardText}>Doporučeno</Text>
            </View>
          </View>

          <Text style={s.cardTitleWhite}>Rychlý start</Text>
          <Text style={s.cardDescWhite}>Základní údaje, začnu hned prodávat.</Text>

          {/* Chybová hláška */}
          {errorMsg ? (
            <View style={s.errorBanner}>
              <Text style={s.errorBannerText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Form */}
          <Text style={s.formLabel}>Jméno a příjmení</Text>
          <TextInput
            style={s.formInput}
            value={jmeno}
            onChangeText={t => { setJmeno(t); setErrorMsg(''); }}
            placeholder="Jan Novák"
            placeholderTextColor="rgba(255,255,255,0.45)"
          />

          <Text style={s.formLabel}>Telefon nebo e-mail</Text>
          <TextInput
            style={s.formInput}
            value={kontakt}
            onChangeText={t => { setKontakt(t); setErrorMsg(''); }}
            placeholder="+420 123 456 789 nebo email@"
            placeholderTextColor="rgba(255,255,255,0.45)"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.formLabel}>Místo prodeje</Text>
          <TextInput
            style={s.formInput}
            value={misto}
            onChangeText={t => { setMisto(t); setErrorMsg(''); }}
            placeholder="Obec, město nebo adresa"
            placeholderTextColor="rgba(255,255,255,0.45)"
          />

          <Text style={s.formLabel}>Co nabízím</Text>
          <View style={s.checkboxGroup}>
            {PRODUKTY.map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.checkboxRow}
                onPress={() => toggleProdukt(p.id)}
                activeOpacity={0.75}
              >
                <View style={[s.checkbox, selectedProdukty.includes(p.id) && s.checkboxChecked]}>
                  {selectedProdukty.includes(p.id) && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.checkboxLabel}>{p.emoji} {p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={s.volnyPopisInput}
            value={volnyPopis}
            onChangeText={setVolnyPopis}
            placeholder="Co dalšího nabízíte? (např. med, džemy, bylinky...)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[s.btnWhite, loading && s.btnDisabled]}
            onPress={handleRychlyStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#6aa84f" />
              : <Text style={s.btnWhiteText}>Vytvořit prodejnu →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ─── Karta 2: Detailní registrace ─── */}
        <View style={[s.card, s.cardWhite, !isMobile && s.cardHalf]}>

          <View style={s.cardHead}>
            <Text style={s.cardEmoji}>📋</Text>
            <View style={s.badgeGray}>
              <Text style={s.badgeGrayText}>Kompletní profil</Text>
            </View>
          </View>

          <Text style={s.cardTitleDark}>Detailní registrace</Text>
          <Text style={s.cardDescGray}>
            Všechny údaje, fotky, certifikáty, popis farmy.
          </Text>

          <View style={s.detailPoints}>
            {[
              '👤 Uživatelské jméno a heslo',
              '📧 E-mail pro obnovení přístupu',
              '🗺️ Poloha farmy na mapě',
              '📜 Souhlas s podmínkami',
            ].map((item, i) => (
              <Text key={i} style={s.detailPoint}>{item}</Text>
            ))}
          </View>

          <View style={{ flex: 1 }} />

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
        <Text style={s.footerText}>© 2026 Samopěstitelé.cz</Text>
      </View>
    </ScrollView>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f1e8' },
  scrollContent: { paddingBottom: 60 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4,
  },
  backLink: { fontSize: 14, color: '#9ca3af' },
  loginTopLink: { fontSize: 16, fontWeight: '700', color: '#4caf50' },

  titleSection: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 28, paddingBottom: 28,
  },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  mainSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },

  cardsRow: {
    flexDirection: 'row', paddingHorizontal: 24,
    gap: 20, alignItems: 'flex-start',
    maxWidth: 1100 as any, width: '100%' as any, alignSelf: 'center' as any,
  },
  cardsRowMobile: { flexDirection: 'column' },
  cardHalf: { flex: 1 },

  card: { borderRadius: 20, padding: 28 },
  cardGreen: { backgroundColor: '#6aa84f' },
  cardWhite: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },

  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardEmoji: { fontSize: 34 },

  badgeGreenCard: {
    backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeGreenCardText: { fontSize: 12, color: '#ffffff', fontWeight: '700' },

  badgeGray: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGrayText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  cardTitleWhite: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  cardDescWhite: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 20, lineHeight: 20 },
  cardTitleDark: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  cardDescGray: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },

  detailPoints: { gap: 10, marginBottom: 28 },
  detailPoint: { fontSize: 14, color: '#374151', lineHeight: 20 },

  errorBanner: {
    backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 10,
    padding: 10, marginBottom: 14,
  },
  errorBannerText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  formLabel: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6, marginTop: 14,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#ffffff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    outlineStyle: 'none' as any,
  },

  checkboxGroup: { gap: 10, marginTop: 4, marginBottom: 12 },
  volnyPopisInput: {
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, fontSize: 14, color: '#1a1a1a',
    minHeight: 72 as any, textAlignVertical: 'top' as any,
    outlineStyle: 'none' as any,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  checkboxChecked: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  checkmark: { fontSize: 13, color: '#6aa84f', fontWeight: '800' },
  checkboxLabel: { fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '500' },

  btnWhite: {
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 22,
  },
  btnWhiteText: { fontSize: 15, fontWeight: '700', color: '#6aa84f' },
  btnDark: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDarkText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  btnDisabled: { opacity: 0.6 },

  footer: { paddingVertical: 32, alignItems: 'center' },
  footerText: { fontSize: 14, color: '#9ca3af' },
});
