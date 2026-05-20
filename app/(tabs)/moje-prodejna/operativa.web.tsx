import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import {
  fetchVsechnyAktivniObjednavky,
  potvrditObjednavku,
  odmitnoutObjednavku,
  poslatSMSPotvrzeni,
} from '@/features/objednavky/services/objednavkyService';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa', active: true },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

interface Objednavka {
  id: string;
  stav: string;
  jmeno_zakaznika?: string;
  anon_customer_code?: string;
  datum_vyzvednuti?: string;
  created_at: string;
  zakaznik_telefon?: string;
  celkova_cena?: number;
  poznamka_farmare?: string;
}

function getBadge(stav: string): { bg: string; label: string } {
  switch (stav) {
    case 'nova': return { bg: '#ef4444', label: 'Nová' };
    case 'cekajici_na_potvrzeni': return { bg: '#f97316', label: 'Čeká na potvrzení' };
    case 'potvrzena': return { bg: '#3b82f6', label: 'Potvrzená' };
    case 'ceka_na_vyzvednuti': return { bg: '#f59e0b', label: 'K vyzvednutí' };
    case 'zpracovana': return { bg: '#4caf50', label: 'Zpracovaná' };
    default: return { bg: '#9ca3af', label: stav };
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function OperativaContent() {
  const { farmar, logout } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!farmar?.id) return;
    try {
      const data = await fetchVsechnyAktivniObjednavky(farmar.id);
      setObjednavky((data as Objednavka[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmar?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handlePotvrdit = async (o: Objednavka) => {
    setActionLoading(o.id);
    try {
      await potvrditObjednavku(o.id);
      if (o.zakaznik_telefon) {
        if (window.confirm('Chcete odeslat zákazníkovi SMS potvrzení?')) {
          await poslatSMSPotvrzeni(o.zakaznik_telefon);
        }
      }
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleOdmitnout = async (o: Objednavka) => {
    if (!window.confirm('Opravdu chcete odmítnout tuto objednávku?')) return;
    setActionLoading(o.id);
    try {
      await odmitnoutObjednavku(o.id);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

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

  const novychCount = objednavky.filter(
    o => o.stav === 'nova' || o.stav === 'cekajici_na_potvrzeni'
  ).length;

  return (
    <View style={s.root}>
      {renderSidebar()}
      <View style={s.main}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>
            {novychCount > 0 ? `⚡ Operativa — ${novychCount} nová` : '⚡ Operativa'}
          </Text>
          <TouchableOpacity style={s.refreshBtn} onPress={() => { setRefreshing(true); load(); }}>
            <Text style={s.refreshBtnText}>🔄 Obnovit</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={s.loadingText}>Načítám objednávky...</Text>
          </View>
        ) : objednavky.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyTitle}>Vše vyřízeno!</Text>
            <Text style={s.emptySubtitle}>Nemáte žádné aktivní objednávky.</Text>
            <TouchableOpacity style={s.dashBtn} onPress={() => router.push('/(tabs)/moje-prodejna')}>
              <Text style={s.dashBtnText}>Přejít do správy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={s.listScroll} contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}>
            {objednavky.map(o => {
              const badge = getBadge(o.stav);
              const isPending = o.stav === 'nova' || o.stav === 'cekajici_na_potvrzeni';
              const isLoading = actionLoading === o.id;
              return (
                <View key={o.id} style={[s.card, isPending && s.cardNew]}>
                  <View style={s.cardHeader}>
                    <View style={s.cardInfo}>
                      <Text style={s.customerName}>
                        {o.poznamka_farmare || o.anon_customer_code
                          ? `Zákazník ${o.anon_customer_code || ''}`
                          : 'Zákazník'}
                      </Text>
                      <Text style={s.orderTime}>
                        Přijato: {formatTime(o.created_at)} • {new Date(o.created_at).toLocaleDateString('cs-CZ')}
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: badge.bg + '20' }]}>
                      <Text style={[s.badgeText, { color: badge.bg }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={s.cardMeta}>
                    {o.datum_vyzvednuti && (
                      <Text style={s.metaText}>
                        📅 {new Date(o.datum_vyzvednuti).toLocaleDateString('cs-CZ')}
                      </Text>
                    )}
                    {o.celkova_cena && o.celkova_cena > 0 && (
                      <Text style={s.metaText}>💰 {o.celkova_cena} Kč</Text>
                    )}
                    {o.zakaznik_telefon && (
                      <Text style={s.metaText}>📱 {o.zakaznik_telefon}</Text>
                    )}
                  </View>

                  {isPending ? (
                    <View style={s.actionBtns}>
                      <TouchableOpacity
                        style={[s.confirmBtn, isLoading && s.btnDisabled]}
                        onPress={() => handlePotvrdit(o)}
                        disabled={isLoading}
                      >
                        <Text style={s.confirmBtnText}>
                          {isLoading ? 'Ukládám...' : '✓ Potvrdit'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.rejectBtn, isLoading && s.btnDisabled]}
                        onPress={() => handleOdmitnout(o)}
                        disabled={isLoading}
                      >
                        <Text style={s.rejectBtnText}>✗ Odmítnout</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.detailBtn}
                      onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${o.id}` as any)}
                    >
                      <Text style={s.detailBtnText}>Otevřít detail →</Text>
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

export default function OperativaScreen() {
  return <ProtectedRoute><OperativaContent /></ProtectedRoute>;
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
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  refreshBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  refreshBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  dashBtn: {
    backgroundColor: '#4caf50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  dashBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  listScroll: { flex: 1 },
  listContent: { padding: 24, gap: 16 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardNew: { borderColor: '#ef4444', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  customerName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  orderTime: { fontSize: 13, color: '#9ca3af' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' as any },
  metaText: { fontSize: 14, color: '#374151' },
  actionBtns: { flexDirection: 'row', gap: 12 },
  confirmBtn: {
    flex: 1, backgroundColor: '#4caf50', paddingVertical: 13,
    borderRadius: 8, alignItems: 'center',
  },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#fef2f2', paddingVertical: 13,
    borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#fca5a5',
  },
  rejectBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  detailBtn: {
    backgroundColor: '#f9fafb', paddingVertical: 11, borderRadius: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  detailBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
