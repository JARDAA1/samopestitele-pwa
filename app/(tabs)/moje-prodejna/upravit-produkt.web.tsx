import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import {
  fetchProduktById,
  checkDuplicateExcluding,
  updateProdukt,
  archivujProdukt,
} from '@/features/produkty/services/produktyService';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

const KATEGORIE = ['Zelenina', 'Ovoce', 'Vejce', 'Mléčné výrobky', 'Med', 'Ostatní'];
const JEDNOTKY = ['kg', 'g', 'ks', 'l', 'balení'];

const ICONS = [
  '🍅','🥕','🥒','🌶️','🫑','🥔','🧅','🧄','🥬','🥦',
  '🍄','🌽','🥗','🍇','🍈','🍉','🍊','🍋','🍌','🍍',
  '🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🥥',
  '🥚','🥛','🧀','🧈','🥩','🍗','🐟','🍯','🍞','🌾',
];

function UpravitProduktContent() {
  const { farmar, logout } = useFarmarAuth();
  const params = useLocalSearchParams();
  const produktId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [nazev, setNazev] = useState('');
  const [popis, setPopis] = useState('');
  const [cena, setCena] = useState('');
  const [jednotka, setJednotka] = useState('kg');
  const [kategorie, setKategorie] = useState('Zelenina');
  const [dostupnost, setDostupnost] = useState(true);
  const [emoji, setEmoji] = useState('📦');
  const [archivovano, setArchivovano] = useState(false);
  const [originalNazev, setOriginalNazev] = useState('');

  useEffect(() => {
    if (!produktId) return;
    fetchProduktById(produktId)
      .then((data) => {
        setNazev(data.nazev);
        setOriginalNazev(data.nazev);
        setPopis(data.popis || '');
        setCena(data.jednotka === 'g'
          ? String(Math.round(data.cena * 100 * 100) / 100)
          : String(data.cena));
        setJednotka(data.jednotka);
        setKategorie(data.kategorie || 'Zelenina');
        setDostupnost(data.dostupnost);
        setEmoji(data.emoji || '📦');
        setArchivovano(data.archivovano || false);
      })
      .catch(() => {
        setError('Nepodařilo se načíst produkt');
      })
      .finally(() => setLoading(false));
  }, [produktId]);

  const handleUlozit = async () => {
    setError('');
    if (!nazev.trim()) { setError('Zadejte název produktu'); return; }
    if (!cena.trim() || isNaN(Number(cena))) { setError('Zadejte platnou cenu'); return; }
    if (!farmar?.id) { router.replace('/prihlaseni'); return; }

    setSaving(true);
    try {
      if (nazev.trim() !== originalNazev) {
        const dup = await checkDuplicateExcluding(farmar.id, nazev.trim(), produktId);
        if (dup) {
          setError(`Produkt "${dup.nazev}" již ve vaší nabídce existuje.`);
          setSaving(false);
          return;
        }
      }

      await updateProdukt(produktId, {
        nazev: nazev.trim(),
        popis: popis.trim() || null,
        cena: jednotka === 'g' ? Number(cena) / 100 : Number(cena),
        mnozstvi: null,
        jednotka,
        kategorie,
        dostupnost,
        emoji,
        archivovano,
      });

      setOriginalNazev(nazev.trim());
      router.push('/moje-prodejna/seznam-produktu');
    } catch (e: any) {
      setError(e.message || 'Nepodařilo se uložit změny');
      setSaving(false);
    }
  };

  const handleArchivovat = async () => {
    const akce = archivovano ? 'obnovit z archivu' : 'přesunout do archivu';
    const confirmed = window.confirm(
      archivovano
        ? 'Opravdu chcete obnovit tento produkt z archivu?'
        : 'Opravdu chcete přesunout tento produkt do archivu?'
    );
    if (!confirmed) return;

    try {
      await archivujProdukt(produktId, !archivovano);
      setArchivovano(!archivovano);
      alert(archivovano ? 'Produkt obnoven z archivu' : 'Produkt přesunut do archivu');
      router.push('/moje-prodejna/seznam-produktu');
    } catch (e: any) {
      alert(`Nepodařilo se ${akce} produkt.`);
    }
  };

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTop}>
        <Text style={s.brand}>🌿 Samopestitele</Text>
        <View style={s.nav}>
          {NAV.map((item, i) => {
            const active = item.label === 'Produkty';
            return (
              <TouchableOpacity key={i}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => router.push(item.route as any)}>
                <Text style={s.navIcon}>{item.icon}</Text>
                <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.sidebarBottom}>
        {farmar && (
          <Text style={s.farmName} numberOfLines={1}>
            {farmar.nazev_farmy || farmar.jmeno || 'Moje farma'}
          </Text>
        )}
        <TouchableOpacity style={s.logoutBtn} onPress={() => logout && logout()}>
          <Text style={s.logoutBtnText}>Odhlásit se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={s.previewCard}>
      <Text style={s.previewTitle}>Náhled produktu</Text>
      <View style={s.previewInner}>
        <Text style={s.previewEmoji}>{emoji}</Text>
        <Text style={s.previewName}>{nazev || 'Název produktu'}</Text>
        <View style={s.previewBadge}>
          <Text style={s.previewBadgeText}>{kategorie}</Text>
        </View>
        {popis ? <Text style={s.previewPopis}>{popis}</Text> : null}
        {cena ? (
          <Text style={s.previewCena}>
            {cena} Kč{jednotka === 'g' ? ' / 100g' : ` / ${jednotka}`}
          </Text>
        ) : (
          <Text style={s.previewCenaPlaceholder}>Cena nezadána</Text>
        )}
        <View style={[s.previewAvail, dostupnost ? s.previewAvailGreen : s.previewAvailRed]}>
          <Text style={s.previewAvailText}>{dostupnost ? '✓ Skladem' : '✗ Vyprodáno'}</Text>
        </View>
        {archivovano && (
          <View style={s.archivedBadge}>
            <Text style={s.archivedBadgeText}>📦 Archivováno</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.root}>
        {renderSidebar()}
        <View style={[s.main, s.centerContent]}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={s.loadingText}>Načítám produkt...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {renderSidebar()}

      <View style={s.main}>
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/moje-prodejna/seznam-produktu')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Zpět na produkty</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Upravit produkt</Text>
        </View>

        <View style={s.body}>
          {/* Form */}
          <ScrollView style={s.formArea} contentContainerStyle={s.formContent}
            showsVerticalScrollIndicator={false}>

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <View style={s.card}>
              <Text style={s.sectionTitle}>🎨 Ikona produktu</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={s.emojiScroll} contentContainerStyle={s.emojiScrollContent}>
                {ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[s.emojiBtn, emoji === ic && s.emojiBtnActive]}
                    onPress={() => setEmoji(ic)}>
                    <Text style={s.emojiText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={s.card}>
              <Text style={s.sectionTitle}>Detaily produktu</Text>

              <Text style={s.label}>Název produktu *</Text>
              <TextInput
                style={s.input}
                value={nazev}
                onChangeText={setNazev}
                placeholder="např. Rajčata cherry"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.label}>Popis</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={popis}
                onChangeText={setPopis}
                placeholder="Volitelný popis..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />

              <Text style={s.label}>{jednotka === 'g' ? 'Cena za 100g *' : 'Cena *'}</Text>
              <View style={s.priceRow}>
                <TextInput
                  style={[s.input, s.priceInput]}
                  value={cena}
                  onChangeText={setCena}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
                <Text style={s.currency}>{jednotka === 'g' ? 'Kč / 100g' : 'Kč'}</Text>
              </View>

              <Text style={s.label}>Kategorie</Text>
              <View style={s.chipRow}>
                {KATEGORIE.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, kategorie === cat && s.chipActive]}
                    onPress={() => setKategorie(cat)}>
                    <Text style={[s.chipText, kategorie === cat && s.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Jednotka</Text>
              <View style={s.chipRow}>
                {JEDNOTKY.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[s.chip, jednotka === u && s.chipActive]}
                    onPress={() => setJednotka(u)}>
                    <Text style={[s.chipText, jednotka === u && s.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Dostupnost</Text>
              <View style={s.availRow}>
                <TouchableOpacity
                  style={[s.availBtn, dostupnost && s.availBtnGreen]}
                  onPress={() => setDostupnost(true)}>
                  <Text style={[s.availBtnText, dostupnost && s.availBtnTextGreen]}>✓ Skladem</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.availBtn, !dostupnost && s.availBtnRed]}
                  onPress={() => setDostupnost(false)}>
                  <Text style={[s.availBtnText, !dostupnost && s.availBtnTextRed]}>✗ Vyprodáno</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[s.submitBtn, saving && s.submitBtnDisabled]}
                onPress={handleUlozit}
                disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={s.submitBtnText}>Uložit změny</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={archivovano ? s.restoreBtn : s.archiveBtn}
                onPress={handleArchivovat}>
                <Text style={archivovano ? s.restoreBtnText : s.archiveBtnText}>
                  {archivovano ? '📤 Obnovit z archivu' : '📦 Přesunout do archivu'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Preview */}
          <View style={s.previewArea}>
            {renderPreview()}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function UpravitProduktScreen() {
  return <ProtectedRoute><UpravitProduktContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },
  centerContent: { justifyContent: 'center', alignItems: 'center', gap: 12 },

  // Sidebar
  sidebar: {
    width: 260, backgroundColor: '#1a1a1a',
    flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 24,
  },
  sidebarTop: { flex: 1 },
  sidebarBottom: {
    paddingHorizontal: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  brand: { fontSize: 16, fontWeight: '800', color: '#ffffff', paddingHorizontal: 16, marginBottom: 24 },
  nav: { gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, marginHorizontal: 8, gap: 12,
  },
  navItemActive: { backgroundColor: 'rgba(76,175,80,0.15)' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  navLabelActive: { color: '#4caf50', fontWeight: '700' },
  farmName: { fontSize: 13, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, alignItems: 'center' },
  logoutBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  // Main
  main: { flex: 1 },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32,
    paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  loadingText: { fontSize: 14, color: '#6b7280' },

  body: { flex: 1, flexDirection: 'row' },
  formArea: { flex: 1, maxWidth: 620 as any },
  formContent: { padding: 24, paddingBottom: 48, gap: 16 },

  errorMsg: {
    backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 14,
    padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#dc2626',
  },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  emojiScroll: { maxHeight: 68 },
  emojiScrollContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  emojiBtn: {
    width: 52, height: 52, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  emojiBtnActive: { borderColor: '#4caf50', borderWidth: 2, backgroundColor: 'rgba(76,175,80,0.08)' },
  emojiText: { fontSize: 26 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#1a1a1a', backgroundColor: '#ffffff',
    outlineStyle: 'none' as any,
  },
  textArea: { minHeight: 80, paddingTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: { flex: 1 },
  currency: { fontSize: 15, fontWeight: '600', color: '#6b7280' },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#4caf50' },

  availRow: { flexDirection: 'row', gap: 10 },
  availBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  availBtnGreen: { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' },
  availBtnRed: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)' },
  availBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  availBtnTextGreen: { color: '#4caf50' },
  availBtnTextRed: { color: '#ef4444' },

  submitBtn: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  archiveBtn: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  archiveBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  restoreBtn: {
    backgroundColor: 'rgba(33,150,243,0.08)', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: '#2196F3',
  },
  restoreBtnText: { fontSize: 14, fontWeight: '600', color: '#2196F3' },

  // Preview
  previewArea: { width: 300, padding: 24 },
  previewCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  previewTitle: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af', marginBottom: 16,
    textTransform: 'uppercase' as any, letterSpacing: 0.5,
  },
  previewInner: { alignItems: 'center', gap: 8 },
  previewEmoji: { fontSize: 56, marginBottom: 4 },
  previewName: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  previewBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { fontSize: 12, color: '#4caf50', fontWeight: '600' },
  previewPopis: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  previewCena: { fontSize: 20, fontWeight: '800', color: '#4caf50' },
  previewCenaPlaceholder: { fontSize: 14, color: '#d1d5db' },
  previewAvail: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  previewAvailGreen: { backgroundColor: 'rgba(76,175,80,0.1)' },
  previewAvailRed: { backgroundColor: 'rgba(239,68,68,0.08)' },
  previewAvailText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  archivedBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  archivedBadgeText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
});
