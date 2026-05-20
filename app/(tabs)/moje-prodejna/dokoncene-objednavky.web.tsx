import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import { supabase } from '@/lib/supabaseClient';
import { formatKc } from '../../_utils/formatKc';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky', active: true },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

interface Objednavka {
  id: string;
  stav: string;
  anon_customer_code?: string;
  datum_vyzvednuti?: string;
  created_at: string;
  zakaznik_telefon?: string;
  celkova_cena?: number;
  poznamka_farmare?: string;
  objednavky_polozky?: { id: string; nazev_produktu: string; mnozstvi: number; jednotka: string }[];
}

function getStavInfo(stav: string): { bg: string; text: string; label: string } {
  switch (stav) {
    case 'dokoncena': return { bg: '#dcfce7', text: '#166534', label: 'Dokončená' };
    case 'archivovana': return { bg: '#f3f4f6', text: '#6b7280', label: 'Archivovaná' };
    case 'odmitnuta': return { bg: '#fee2e2', text: '#991b1b', label: 'Odmítnutá' };
    case 'zrusena': return { bg: '#fee2e2', text: '#991b1b', label: 'Zrušená' };
    default: return { bg: '#f3f4f6', text: '#6b7280', label: stav };
  }
}

function DokonceneContent() {
  const { farmar, logout } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [filter, setFilter] = useState<'vse' | 'dokoncena' | 'odmitnuta'>('vse');

  const load = useCallback(async () => {
    if (!farmar?.id) return;
    try {
      const { data, error } = await supabase
        .from('objednavky')
        .select('*, objednavky_polozky(*)')
        .eq('farmar_id', Number(farmar.id))
        .in('stav', ['dokoncena', 'archivovana', 'odmitnuta', 'zrusena'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) setObjednavky(data as Objednavka[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [farmar?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = filter === 'vse'
    ? objednavky
    : objednavky.filter(o => o.stav === filter);

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTop}>
        <Text style={s.brand}>🌿 Samopestitele</Text>
        <View style={s.nav}>
          {NAV.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.navItem, item.active && s.navItemActive]}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={s.navIcon}>{item.icon}</Text>
              <Text style={[s.navLabel, item.active && s.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
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

  return (
    <View style={s.root}>
      {renderSidebar()}
      <View style={s.main}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>📚 Dokončené objednávky</Text>
          <View style={s.filterRow}>
            {(['vse', 'dokoncena', 'odmitnuta'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterBtn, filter === f && s.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>
                  {f === 'vse' ? 'Vše' : f === 'dokoncena' ? 'Dokončené' : 'Odmítnuté'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={s.loadingText}>Načítám...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>Žádné záznamy</Text>
            <Text style={s.emptySubtitle}>Dokončené objednávky se zobrazí zde.</Text>
          </View>
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={s.countLabel}>{filtered.length} záznamů</Text>
            {filtered.map(o => {
              const info = getStavInfo(o.stav);
              const polozky = o.objednavky_polozky || [];
              return (
                <TouchableOpacity
                  key={o.id}
                  style={s.card}
                  onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${o.id}` as any)}
                >
                  <View style={s.cardTop}>
                    <View style={s.cardLeft}>
                      <Text style={s.customerLabel}>
                        {o.poznamka_farmare || (o.anon_customer_code
                          ? `Zákazník ${o.anon_customer_code}`
                          : 'Zákazník')}
                      </Text>
                      <Text style={s.cardDate}>
                        {new Date(o.created_at).toLocaleDateString('cs-CZ', {
                          day: 'numeric', month: 'numeric', year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={[s.stavBadge, { backgroundColor: info.bg }]}>
                      <Text style={[s.stavBadgeText, { color: info.text }]}>{info.label}</Text>
                    </View>
                  </View>

                  <View style={s.cardMeta}>
                    {polozky.length > 0 && (
                      <Text style={s.polozkyText}>
                        {polozky.length} {polozky.length === 1 ? 'položka' : polozky.length < 5 ? 'položky' : 'položek'}
                        {' — '}
                        {polozky.slice(0, 3).map(p => p.nazev_produktu).join(', ')}
                        {polozky.length > 3 ? '...' : ''}
                      </Text>
                    )}
                    <View style={s.cardMetaRow}>
                      {o.datum_vyzvednuti && (
                        <Text style={s.metaText}>
                          📅 {new Date(o.datum_vyzvednuti).toLocaleDateString('cs-CZ')}
                        </Text>
                      )}
                      {o.celkova_cena && o.celkova_cena > 0 && (
                        <Text style={s.priceText}>{formatKc(o.celkova_cena)} Kč</Text>
                      )}
                    </View>
                  </View>

                  <Text style={s.detailLink}>Zobrazit detail →</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default function DokonceneObjednavkyScreen() {
  return <ProtectedRoute><DokonceneContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },

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

  main: { flex: 1, flexDirection: 'column' },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as any,
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterBtnTextActive: { color: '#ffffff' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 24, gap: 12 },
  countLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 4, fontWeight: '500' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1, marginRight: 12 },
  customerLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  cardDate: { fontSize: 13, color: '#9ca3af' },
  stavBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  stavBadgeText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' as any },
  polozkyText: { fontSize: 13, color: '#6b7280' },
  metaText: { fontSize: 13, color: '#374151' },
  priceText: { fontSize: 13, fontWeight: '700', color: '#4caf50' },
  detailLink: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
});
