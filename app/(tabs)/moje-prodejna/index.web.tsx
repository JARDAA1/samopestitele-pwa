import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, useWindowDimensions, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import {
  fetchAktivniObjednavky,
  zmeniStavPolozky as zmeniStavPolozkyService,
  zmeniStavObjednavky,
} from '@/features/objednavky/services/objednavkyService';
import { fetchPocetAktivnichProduktu } from '@/features/produkty/services/produktyService';
import {
  fetchPocetProdejnichMist,
  fetchCasovaDostupnostMist,
} from '@/features/prodejni-mista/services/locationService';
import { useRealtimeOrders } from '../../_utils/useRealtimeOrders';
import { formatKc, formatMnozstvi } from '../../_utils/formatKc';

// ── Typy ────────────────────────────────────────────────────────
interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
  stav_polozky?: string;
}
interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
  polozky: ObjednavkaPolozka[];
}

// ── Nav items ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: 'receipt' as const,             label: 'Objednávky',     route: '/(tabs)/moje-prodejna' },
  { icon: 'basket-outline' as const,      label: 'Produkty',       route: '/(tabs)/moje-prodejna/seznam-produktu' },
  { icon: 'location-outline' as const,    label: 'Prodejní místa', route: '/(tabs)/moje-prodejna/prodejni-mista' },
  { icon: 'settings-outline' as const,    label: 'Operativa',      route: '/(tabs)/moje-prodejna/operativa' },
  { icon: 'document-text-outline' as const, label: 'Dokončené',   route: '/(tabs)/moje-prodejna/dokoncene-objednavky' },
  { icon: 'person-outline' as const,      label: 'Profil',         route: '/profil' },
];

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(datum: string) {
  return new Date(datum).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getOrderBadge(stav: string) {
  if (stav === 'ceka_na_vyzvednuti')              return { text: 'ČEKÁ',     color: '#f59e0b' };
  if (stav === 'zpracovana' || stav === 'dokoncena') return { text: 'HOTOVO', color: '#4caf50' };
  if (stav === 'potvrzena')                       return { text: 'POTVRZENA', color: '#3b82f6' };
  return { text: 'NOVÁ', color: '#ef4444' };
}

// ── Nepřihlášený stav ────────────────────────────────────────────
function UnauthScreen() {
  return (
    <View style={s.unauthRoot}>
      <View style={s.unauthCard}>
        <Ionicons name="storefront-outline" size={56} color="#6aa84f" style={{ marginBottom: 20 }} />
        <Text style={s.unauthTitle}>Moje prodejna</Text>
        <Text style={s.unauthSub}>
          Pro přístup k prodejně se přihlaste nebo si vytvořte nový účet.
        </Text>
        <TouchableOpacity style={s.unauthBtnGreen} onPress={() => router.push('/prihlaseni')}>
          <Text style={s.unauthBtnGreenText}>Přihlásit se</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.unauthBtnWhite} onPress={() => router.push('/registrace')}>
          <Text style={s.unauthBtnWhiteText}>Registrovat se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Hlavní komponenta ────────────────────────────────────────────
export default function MojeProdejnaWeb() {
  const { farmar, logout, isAuthenticated, isSessionChecked } = useFarmarAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [objednavky, setObjednavky]           = useState<Objednavka[]>([]);
  const [pocetProduktu, setPocetProduktu]     = useState(0);
  const [pocetMist, setPocetMist]             = useState(0);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [selectedId, setSelectedId]           = useState<string | null>(null);

  const handleNewOrder = useCallback((o: any) => {
    setObjednavky(prev => [{ ...o, polozky: [] }, ...prev]);
  }, []);
  useRealtimeOrders(farmar?.id, handleNewOrder);

  useFocusEffect(useCallback(() => {
    if (farmar?.id) loadData(farmar.id);
    else            setLoading(false);
  }, [farmar]));

  async function loadData(id: string, isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [objs, prod, mist] = await Promise.all([
        fetchAktivniObjednavky(id),
        fetchPocetAktivnichProduktu(id),
        fetchPocetProdejnichMist(Number(id)),
      ]);
      setObjednavky(objs as Objednavka[]);
      setPocetProduktu(prod);
      setPocetMist(mist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function zmeniStav(polozkaId: string, novyStav: string, objednavkaId: string) {
    try {
      await zmeniStavPolozkyService(polozkaId, novyStav);
      setObjednavky(prev => prev.map(obj => {
        if (obj.id !== objednavkaId) return obj;
        const updated = obj.polozky.map(p => p.id === polozkaId ? { ...p, stav_polozky: novyStav } : p);
        const vsechnyVyrizene = updated.every(p => p.stav_polozky && p.stav_polozky !== 'novy');
        if (vsechnyVyrizene) zmeniStavObjednavky(objednavkaId, 'zpracovana');
        else if (obj.stav === 'nova' || obj.stav === 'cekajici_na_potvrzeni')
          zmeniStavObjednavky(objednavkaId, 'potvrzena');
        return { ...obj, polozky: updated };
      }));
    } catch (e) { console.error(e); }
  }

  // ── Stavy před renderem ──────────────────────────────────────
  if (!isSessionChecked) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }
  if (!isAuthenticated) return <UnauthScreen />;
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={s.loadingText}>Načítám...</Text>
      </View>
    );
  }

  const selectedOrder = objednavky.find(o => o.id === selectedId) ?? null;
  const newCount = objednavky.filter(o => o.stav === 'nova' || o.stav === 'cekajici_na_potvrzeni').length;

  // ── Sidebar ──────────────────────────────────────────────────
  const Sidebar = () => (
    <View style={s.sidebar}>
      {/* Logo */}
      <View style={s.sidebarLogo}>
        <Text style={s.sidebarLogoText}>🌾 Samopěstitelé</Text>
        <Text style={s.sidebarLogoSub}>Moje prodejna</Text>
      </View>

      {/* Nav */}
      <ScrollView style={s.sidebarNav} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const active = item.route === '/(tabs)/moje-prodejna';
          return (
            <TouchableOpacity
              key={item.route}
              style={[s.navItem, active && s.navItemActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? '#ffffff' : '#6b7280'}
              />
              <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stats + logout */}
      <View style={s.sidebarBottom}>
        {farmar && (
          <View style={s.farmStats}>
            <Text style={s.farmStatsName} numberOfLines={1}>
              {farmar.nazev_farmy || farmar.jmeno || 'Moje farma'}
            </Text>
            <Text style={s.farmStatsSub}>{pocetProduktu} produktů · {pocetMist} prodejních míst</Text>
          </View>
        )}
        <TouchableOpacity style={s.logoutBtn} onPress={() => logout && logout()} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={s.logoutText}>Odhlásit se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Hlavní obsah ─────────────────────────────────────────────
  const MainContent = () => (
    <ScrollView style={s.main} contentContainerStyle={s.mainContent} showsVerticalScrollIndicator={false}>

      {/* Nadpis */}
      <View style={s.mainHeader}>
        <Text style={s.mainTitle}>Objednávky ({objednavky.length})</Text>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => farmar?.id && loadData(farmar.id, true)}
          disabled={refreshing}
        >
          <Ionicons name="refresh-outline" size={20} color={refreshing ? '#9ca3af' : '#4caf50'} />
        </TouchableOpacity>
      </View>

      {/* Nové objednávky alert */}
      {newCount > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="notifications" size={16} color="#dc2626" />
          <Text style={s.alertText}>
            {newCount} {newCount === 1 ? 'nová objednávka' : newCount < 5 ? 'nové objednávky' : 'nových objednávek'}
          </Text>
        </View>
      )}

      {/* Prázdný stav */}
      {objednavky.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="receipt-outline" size={52} color="#9ca3af" style={{ marginBottom: 16 }} />
          <Text style={s.emptyTitle}>Zatím žádné objednávky</Text>
          <Text style={s.emptySub}>Jakmile vám někdo pošle objednávku, zobrazí se zde.</Text>

          <TouchableOpacity
            style={s.ctaGreen}
            onPress={() => router.push('/(tabs)/moje-prodejna/pridat-produkt' as any)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text style={s.ctaGreenText}>Přidat první produkt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.ctaWhite}
            onPress={() => Share.share({ message: `Podívej se na moji prodejnu! ${farmar?.nazev_farmy ?? ''}` })}
          >
            <Ionicons name="share-outline" size={18} color="#1a1a1a" />
            <Text style={s.ctaWhiteText}>Sdílet prodejnu</Text>
          </TouchableOpacity>

          <View style={s.helpLinks}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna/prodejni-mista' as any)}>
              <Text style={s.helpLink}>📍 Nastavit prodejní místo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna/seznam-produktu' as any)}>
              <Text style={s.helpLink}>🧺 Spravovat produkty</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Seznam objednávek */
        objednavky.map((obj) => {
          const badge = getOrderBadge(obj.stav);
          const isSelected = selectedId === obj.id;
          return (
            <TouchableOpacity
              key={obj.id}
              style={[s.orderCard, isSelected && s.orderCardSelected]}
              onPress={() => setSelectedId(isSelected ? null : obj.id)}
              activeOpacity={0.85}
            >
              <View style={s.orderTopRow}>
                <Text style={s.orderCustomer} numberOfLines={1}>
                  {obj.poznamka_farmare || (obj.anon_customer_code ? `Zákazník ${obj.anon_customer_code}` : 'Zákazník')}
                </Text>
                <View style={[s.orderBadge, { backgroundColor: badge.color }]}>
                  <Text style={s.orderBadgeText}>{badge.text}</Text>
                </View>
              </View>
              {obj.zakaznik_telefon && (
                <Text style={s.orderPhone}>📱 {obj.zakaznik_telefon}</Text>
              )}
              <Text style={s.orderMeta}>{formatDate(obj.created_at)} · {obj.polozky.length} položek</Text>

              {isSelected && obj.polozky.map((pol) => (
                <View key={pol.id} style={s.polozkaRow}>
                  <View style={s.polozkaInfo}>
                    <Text style={s.polozkaNazev}>{pol.nazev_produktu}</Text>
                    <Text style={s.polozkaMeta}>
                      {formatMnozstvi(pol.mnozstvi)} {pol.jednotka}
                      {pol.cena ? ` · ${formatKc(pol.cena * pol.mnozstvi)} Kč` : ''}
                    </Text>
                  </View>
                  <View style={s.polozkaActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, pol.stav_polozky === 'pripraveno' && s.actionBtnActiveGreen]}
                      onPress={() => zmeniStav(pol.id, 'pripraveno', obj.id)}
                    >
                      <Ionicons name="checkmark" size={18}
                        color={pol.stav_polozky === 'pripraveno' ? '#ffffff' : '#4caf50'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtnGray, pol.stav_polozky === 'neni_k_dispozici' && s.actionBtnActiveGray]}
                      onPress={() => zmeniStav(pol.id, 'neni_k_dispozici', obj.id)}
                    >
                      <Ionicons name="close" size={18}
                        color={pol.stav_polozky === 'neni_k_dispozici' ? '#ffffff' : '#9ca3af'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {isSelected && (
                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${obj.id}` as any)}
                >
                  <Text style={s.detailBtnText}>Otevřít plný detail →</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })
      )}

      {objednavky.length > 0 && (
        <TouchableOpacity
          style={s.archiveLink}
          onPress={() => router.push('/(tabs)/moje-prodejna/dokoncene-objednavky' as any)}
        >
          <Ionicons name="document-text-outline" size={14} color="#9ca3af" />
          <Text style={s.archiveLinkText}>Zobrazit dokončené objednávky</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ── Bottom nav (mobil) ───────────────────────────────────────
  const BottomNav = () => (
    <View style={s.bottomNav}>
      {NAV_ITEMS.slice(0, 5).map((item) => {
        const active = item.route === '/(tabs)/moje-prodejna';
        return (
          <TouchableOpacity
            key={item.route}
            style={s.bottomNavItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={active ? '#4caf50' : '#9ca3af'} />
            <Text style={[s.bottomNavLabel, active && s.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerHome} onPress={() => router.push('/')} activeOpacity={0.8}>
          <Ionicons name="home-outline" size={20} color="#6b7280" />
        </TouchableOpacity>

        <Text style={s.headerTitle} numberOfLines={1}>
          {farmar?.nazev_farmy || 'Moje prodejna'}
        </Text>

        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerIconBtn} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color="#6b7280" />
            {newCount > 0 && <View style={s.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.headerIconBtn} onPress={() => router.push('/profil')}>
            <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Layout ── */}
      <View style={s.body}>
        {isDesktop && <Sidebar />}
        <MainContent />
      </View>

      {/* ── Bottom nav (mobil) ── */}
      {!isDesktop && <BottomNav />}
    </View>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f1e8' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#6b7280' },

  // Unauth
  unauthRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 24 },
  unauthCard: {
    width: '100%' as any, maxWidth: 400, backgroundColor: '#ffffff',
    borderRadius: 20, padding: 36, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  unauthTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  unauthSub: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  unauthBtnGreen: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 14,
    width: '100%' as any, alignItems: 'center', marginBottom: 12,
  },
  unauthBtnGreenText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  unauthBtnWhite: {
    backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 14,
    width: '100%' as any, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  unauthBtnWhiteText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },

  // Header
  header: {
    height: 60, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
  },
  headerHome: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', paddingHorizontal: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
  },

  // Body
  body: { flex: 1, flexDirection: 'row' },

  // Sidebar
  sidebar: {
    width: 240, backgroundColor: '#ffffff',
    borderRightWidth: 1, borderRightColor: '#e5e7eb',
    flexDirection: 'column',
  },
  sidebarLogo: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sidebarLogoText: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  sidebarLogoSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  sidebarNav: { flex: 1, paddingTop: 10, paddingHorizontal: 10 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, height: 46, borderRadius: 10, marginBottom: 2,
  },
  navItemActive: { backgroundColor: '#4caf50' },
  navLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563' },
  navLabelActive: { color: '#ffffff', fontWeight: '700' },
  sidebarBottom: {
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 12,
  },
  farmStats: { gap: 3 },
  farmStatsName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  farmStatsSub: { fontSize: 12, color: '#9ca3af' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fff5f5',
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  // Main
  main: { flex: 1, backgroundColor: '#f5f1e8' },
  mainContent: { padding: 24, paddingBottom: 48 },
  mainHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  mainTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  alertText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },

  // Empty state
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 36,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  ctaGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4caf50', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 24,
    width: '100%' as any, justifyContent: 'center', marginBottom: 12,
  },
  ctaGreenText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  ctaWhite: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 24,
    width: '100%' as any, justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24,
  },
  ctaWhiteText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  helpLinks: { gap: 12, width: '100%' as any },
  helpLink: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  // Order cards
  orderCard: {
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  orderCardSelected: { borderLeftWidth: 4, borderLeftColor: '#4caf50', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderCustomer: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  orderBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  orderPhone: { fontSize: 12, color: '#2563eb', marginBottom: 4 },
  orderMeta: { fontSize: 12, color: '#9ca3af' },

  // Polozky
  polozkaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 8,
  },
  polozkaInfo: { flex: 1 },
  polozkaNazev: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  polozkaMeta: { fontSize: 12, color: '#6b7280' },
  polozkaActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnActiveGreen: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  actionBtnGray: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnActiveGray: { backgroundColor: '#6b7280', borderColor: '#6b7280' },
  detailBtn: {
    marginTop: 12, paddingVertical: 10, backgroundColor: '#f0fdf4',
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0',
  },
  detailBtnText: { fontSize: 13, fontWeight: '600', color: '#4caf50' },

  archiveLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', paddingVertical: 16,
  },
  archiveLinkText: { fontSize: 13, color: '#9ca3af' },

  // Bottom nav
  bottomNav: {
    height: 64, backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center',
  },
  bottomNavItem: { flex: 1, alignItems: 'center', gap: 3 },
  bottomNavLabel: { fontSize: 10, color: '#9ca3af' },
  bottomNavLabelActive: { color: '#4caf50', fontWeight: '600' },
});
