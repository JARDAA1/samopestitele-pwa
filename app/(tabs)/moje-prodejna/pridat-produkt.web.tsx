import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import {
  fetchPredefinovaneProdukty,
  checkDuplicateProdukt,
  insertProdukt,
} from '@/features/produkty/services/produktyService';
import type { PredefinedProduct } from '@/features/produkty/types';
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

function PridatProduktContent() {
  const { farmar, logout } = useFarmarAuth();
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [predefined, setPredefined] = useState<PredefinedProduct[]>([]);
  const [selected, setSelected] = useState<PredefinedProduct | null>(null);
  const [popis, setPopis] = useState('');
  const [cena, setCena] = useState('');
  const [jednotka, setJednotka] = useState('kg');
  const [dostupnost, setDostupnost] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPredefinovaneProdukty()
      .then(setPredefined)
      .catch(() => setError('Nepodařilo se načíst seznam produktů'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handlePridat = async () => {
    setError('');
    if (!selected) { setError('Vyberte produkt ze seznamu'); return; }
    if (!cena.trim() || isNaN(Number(cena))) { setError('Zadejte platnou cenu'); return; }
    if (!farmar?.id) { router.replace('/prihlaseni'); return; }

    setLoading(true);
    try {
      const dup = await checkDuplicateProdukt(farmar.id, selected.nazev);
      if (dup) {
        setError(`Produkt "${dup.nazev}" již ve vaší nabídce existuje.`);
        setLoading(false);
        return;
      }

      await insertProdukt({
        pestitel_id: Number(farmar.id),
        nazev: selected.nazev,
        popis: popis.trim() || null,
        cena: jednotka === 'g' ? Number(cena) / 100 : Number(cena),
        mnozstvi: null,
        jednotka,
        kategorie: selected.kategorie,
        dostupnost,
        emoji: selected.emoji,
        archivovano: false,
      });

      setSelected(null);
      setPopis('');
      setCena('');
      setJednotka('kg');
      setDostupnost(true);
      setSuccessMsg('Produkt byl přidán! Můžete přidat další.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Nepodařilo se přidat produkt');
    } finally {
      setLoading(false);
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
        <Text style={s.previewEmoji}>{selected?.emoji || '📦'}</Text>
        <Text style={s.previewName}>{selected?.nazev || 'Název produktu'}</Text>
        {selected?.kategorie && (
          <View style={s.previewBadge}>
            <Text style={s.previewBadgeText}>{selected.kategorie}</Text>
          </View>
        )}
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
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      {renderSidebar()}

      <View style={s.main}>
        {/* Header */}
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/moje-prodejna/seznam-produktu')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Zpět na produkty</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Přidat produkt</Text>
        </View>

        <View style={s.body}>
          {/* Left: form */}
          <ScrollView style={s.formArea} contentContainerStyle={s.formContent}
            showsVerticalScrollIndicator={false}>

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}
            {successMsg ? (
              <View style={s.successBox}>
                <Text style={s.successText}>✓ {successMsg}</Text>
                <TouchableOpacity onPress={() => router.push('/moje-prodejna/seznam-produktu')}>
                  <Text style={s.successLink}>Zobrazit produkty →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={s.card}>
              <Text style={s.sectionTitle}>📦 Vyberte produkt</Text>
              <Text style={s.hint}>Název, ikona a kategorie se vyplní automaticky.</Text>

              {loadingProducts ? (
                <View style={s.loadingBox}>
                  <ActivityIndicator color="#4caf50" />
                  <Text style={s.loadingText}>Načítám...</Text>
                </View>
              ) : selected ? (
                <View style={s.selectedBox}>
                  <Text style={s.selectedEmoji}>{selected.emoji}</Text>
                  <View style={s.selectedInfo}>
                    <Text style={s.selectedName}>{selected.nazev}</Text>
                    <Text style={s.selectedCat}>{selected.kategorie}</Text>
                  </View>
                  <TouchableOpacity style={s.changeBtn} onPress={() => setSelected(null)}>
                    <Text style={s.changeBtnText}>Změnit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {KATEGORIE.map((kat) => {
                    const products = predefined.filter(p => p.kategorie === kat);
                    if (!products.length) return null;
                    return (
                      <View key={kat}>
                        <Text style={s.catHeader}>{kat}</Text>
                        <View style={s.productGrid}>
                          {products.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={s.productChip}
                              onPress={() => setSelected(p)}>
                              <Text style={s.productChipEmoji}>{p.emoji}</Text>
                              <Text style={s.productChipName}>{p.nazev}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>

            {selected && (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Detaily produktu</Text>

                <Text style={s.label}>Popis (volitelné)</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Volitelný popis produktu..."
                  placeholderTextColor="#9ca3af"
                  value={popis}
                  onChangeText={setPopis}
                  multiline
                  numberOfLines={3}
                />

                <Text style={s.label}>
                  {jednotka === 'g' ? 'Cena za 100g *' : 'Cena *'}
                </Text>
                <View style={s.priceRow}>
                  <TextInput
                    style={[s.input, s.priceInput]}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={cena}
                    onChangeText={setCena}
                    keyboardType="numeric"
                  />
                  <Text style={s.currency}>
                    {jednotka === 'g' ? 'Kč / 100g' : 'Kč'}
                  </Text>
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
                  style={[s.submitBtn, loading && s.submitBtnDisabled]}
                  onPress={handlePridat}
                  disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#ffffff" />
                    : <Text style={s.submitBtnText}>Přidat produkt</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.cancelLink}
                  onPress={() => router.push('/moje-prodejna/seznam-produktu')}>
                  <Text style={s.cancelLinkText}>Zrušit a vrátit se</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Right: preview */}
          <View style={s.previewArea}>
            {renderPreview()}
            <View style={s.previewInfoCard}>
              <Text style={s.previewInfoTitle}>💡 Tipy</Text>
              <Text style={s.previewInfoText}>
                • Přesnou cenu lze kdykoli upravit{'\n'}
                • Produkt můžete dočasně skrýt jako "Vyprodáno"{'\n'}
                • Archivace produkt skryje, ale zachová historii objednávek
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function PridatProduktScreen() {
  return <ProtectedRoute><PridatProduktContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },

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

  body: { flex: 1, flexDirection: 'row' },

  // Form area
  formArea: { flex: 1, maxWidth: 600 as any },
  formContent: { padding: 24, paddingBottom: 48, gap: 16 },

  errorMsg: {
    backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 14,
    padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#dc2626',
  },
  successBox: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#4caf50', gap: 6,
  },
  successText: { fontSize: 14, color: '#166534', fontWeight: '600' },
  successLink: { fontSize: 13, color: '#4caf50', fontWeight: '700' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  loadingText: { fontSize: 13, color: '#6b7280' },

  selectedBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14,
    borderWidth: 2, borderColor: '#4caf50',
  },
  selectedEmoji: { fontSize: 36, marginRight: 12 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  selectedCat: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  changeBtn: { backgroundColor: '#4caf50', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  changeBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  catHeader: { fontSize: 13, fontWeight: '700', color: '#4caf50', marginTop: 16, marginBottom: 8 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productChip: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 10,
    alignItems: 'center', width: 90,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  productChipEmoji: { fontSize: 28, marginBottom: 4 },
  productChipName: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500' },

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
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
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
  cancelLink: { alignItems: 'center', marginTop: 12 },
  cancelLinkText: { fontSize: 14, color: '#9ca3af' },

  // Preview area
  previewArea: { width: 320, padding: 24, gap: 16 },
  previewCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', marginBottom: 16, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
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
  previewInfoCard: {
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  previewInfoTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  previewInfoText: { fontSize: 12, color: '#78350f', lineHeight: 20 },
});
