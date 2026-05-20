import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { fetchMojeObjednavkyByAnonId } from '@/features/objednavky/services/objednavkyService';
import { getOrCreateCustomerId } from '../_utils/customerIdentity';

interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  celkova_cena?: number;
  anon_customer_code?: string;
  pestitele?: { nazev_farmy?: string; jmeno?: string; mesto?: string };
}

function getStavInfo(stav: string): { bg: string; text: string; label: string } {
  switch (stav) {
    case 'nova': return { bg: '#eff6ff', text: '#1d4ed8', label: 'Nová' };
    case 'cekajici_na_potvrzeni': return { bg: '#fff7ed', text: '#c2410c', label: 'Čeká na potvrzení' };
    case 'potvrzena': return { bg: '#eff6ff', text: '#1d4ed8', label: 'Potvrzená' };
    case 'ceka_na_vyzvednuti': return { bg: '#fefce8', text: '#a16207', label: 'Připraveno k vyzvednutí' };
    case 'zpracovana': return { bg: '#f0fdf4', text: '#166534', label: 'Zpracovaná' };
    case 'dokoncena': return { bg: '#f0fdf4', text: '#166534', label: 'Dokončená ✓' };
    case 'odmitnuta': return { bg: '#fee2e2', text: '#991b1b', label: 'Odmítnutá' };
    case 'zrusena': return { bg: '#fee2e2', text: '#991b1b', label: 'Zrušená' };
    default: return { bg: '#f3f4f6', text: '#6b7280', label: stav };
  }
}

export default function MojeObjednavkyScreen() {
  const [loading, setLoading] = useState(true);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [activeTab, setActiveTab] = useState<'aktivni' | 'archiv'>('aktivni');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { id: customerId } = await getOrCreateCustomerId();
      const data = await fetchMojeObjednavkyByAnonId(customerId);
      setObjednavky((data as Objednavka[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const aktivni = objednavky.filter(
    o => !['dokoncena', 'zrusena', 'odmitnuta', 'archivovana'].includes(o.stav)
  );
  const archiv = objednavky.filter(
    o => ['dokoncena', 'zrusena', 'odmitnuta', 'archivovana'].includes(o.stav)
  );
  const displayed = activeTab === 'aktivni' ? aktivni : archiv;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={s.logoBtn}>
          <Text style={s.logo}>🌿 Samopestitele</Text>
        </TouchableOpacity>
        <View style={s.headerNav}>
          <TouchableOpacity onPress={() => router.push('/mapa')} style={s.navLink}>
            <Text style={s.navLinkText}>Mapa farmářů</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.content}>
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>📋 Moje objednávky</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'aktivni' && s.tabActive]}
            onPress={() => setActiveTab('aktivni')}
          >
            <Text style={[s.tabText, activeTab === 'aktivni' && s.tabTextActive]}>
              Aktivní {aktivni.length > 0 ? `(${aktivni.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'archiv' && s.tabActive]}
            onPress={() => setActiveTab('archiv')}
          >
            <Text style={[s.tabText, activeTab === 'archiv' && s.tabTextActive]}>
              Archiv {archiv.length > 0 ? `(${archiv.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={s.loadingText}>Načítám objednávky...</Text>
          </View>
        ) : displayed.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyIcon}>{activeTab === 'aktivni' ? '📭' : '📚'}</Text>
            <Text style={s.emptyTitle}>
              {activeTab === 'aktivni' ? 'Žádné aktivní objednávky' : 'Archiv je prázdný'}
            </Text>
            <Text style={s.emptySubtitle}>
              {activeTab === 'aktivni'
                ? 'Vaše objednávky se zobrazí zde.'
                : 'Dokončené objednávky se zobrazí zde.'}
            </Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/mapa')}>
              <Text style={s.ctaBtnText}>Najít farmáře v okolí →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={s.list} contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}>
            {displayed.map(o => {
              const info = getStavInfo(o.stav);
              const farmarName = o.pestitele?.nazev_farmy || o.pestitele?.jmeno || 'Farmář';
              return (
                <View key={o.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.cardLeft}>
                      <Text style={s.farmarName}>{farmarName}</Text>
                      {o.pestitele?.mesto && (
                        <Text style={s.farmarMesto}>📍 {o.pestitele.mesto}</Text>
                      )}
                    </View>
                    <View style={[s.stavBadge, { backgroundColor: info.bg }]}>
                      <Text style={[s.stavBadgeText, { color: info.text }]}>{info.label}</Text>
                    </View>
                  </View>

                  <View style={s.cardMeta}>
                    <Text style={s.metaText}>
                      Objednáno: {new Date(o.created_at).toLocaleDateString('cs-CZ', {
                        day: 'numeric', month: 'numeric', year: 'numeric',
                      })}
                    </Text>
                    {o.datum_vyzvednuti && (
                      <Text style={s.metaText}>
                        📅 Vyzvednutí: {new Date(o.datum_vyzvednuti).toLocaleDateString('cs-CZ')}
                      </Text>
                    )}
                    {o.celkova_cena && o.celkova_cena > 0 ? (
                      <Text style={s.priceText}>{o.celkova_cena} Kč</Text>
                    ) : null}
                  </View>

                  {o.anon_customer_code && (
                    <TouchableOpacity
                      style={s.detailBtn}
                      onPress={() => router.push(`/vyzvednuti/${o.anon_customer_code}` as any)}
                    >
                      <Text style={s.detailBtnText}>Zobrazit detail →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#ffffff', paddingHorizontal: 40, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  logoBtn: {},
  logo: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  headerNav: { flexDirection: 'row', gap: 24 },
  navLink: {},
  navLinkText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  content: { flex: 1, maxWidth: 760 as any, width: '100%' as any, alignSelf: 'center' as any, paddingHorizontal: 40 },
  titleRow: { paddingTop: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },

  tabs: {
    flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', marginBottom: 24,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#4caf50' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#4caf50' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  ctaBtn: {
    backgroundColor: '#4caf50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  ctaBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  list: { flex: 1 },
  listContent: { gap: 12, paddingBottom: 48 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flex: 1, marginRight: 12 },
  farmarName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  farmarMesto: { fontSize: 13, color: '#6b7280' },
  stavBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stavBadgeText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' as any, marginBottom: 12 },
  metaText: { fontSize: 13, color: '#374151' },
  priceText: { fontSize: 14, fontWeight: '700', color: '#4caf50' },
  detailBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  detailBtnText: { color: '#166534', fontSize: 14, fontWeight: '600' },
});
