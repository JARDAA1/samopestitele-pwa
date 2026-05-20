import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { useProdukty } from '@/features/produkty/hooks/useProdukty';
import { formatCenaJednotka } from '../../_utils/formatKc';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

function SeznamProduktContent() {
  const { farmar, logout } = useFarmarAuth();
  const { loading, produkty, archivovaneProdukty } = useProdukty();
  const [activeTab, setActiveTab] = useState<'aktivni' | 'archivovane'>('aktivni');

  const displayed = activeTab === 'aktivni' ? produkty : archivovaneProdukty;

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

  return (
    <View style={s.root}>
      {renderSidebar()}

      <View style={s.main}>
        {/* Page header */}
        <View style={s.pageHeader}>
          <View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Zpět</Text>
            </TouchableOpacity>
            <Text style={s.pageTitle}>Moje produkty</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push('/moje-prodejna/pridat-produkt')}>
            <Text style={s.addBtnText}>+ Přidat produkt</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'aktivni' && s.tabActive]}
            onPress={() => setActiveTab('aktivni')}>
            <Text style={[s.tabText, activeTab === 'aktivni' && s.tabTextActive]}>
              Aktivní ({produkty.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'archivovane' && s.tabActive]}
            onPress={() => setActiveTab('archivovane')}>
            <Text style={[s.tabText, activeTab === 'archivovane' && s.tabTextActive]}>
              Archiv ({archivovaneProdukty.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color="#4caf50" />
              <Text style={s.loadingText}>Načítám produkty...</Text>
            </View>
          ) : displayed.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>{activeTab === 'aktivni' ? '📦' : '🗃️'}</Text>
              <Text style={s.emptyText}>
                {activeTab === 'aktivni'
                  ? 'Zatím nemáte žádné aktivní produkty'
                  : 'Žádné archivované produkty'}
              </Text>
              {activeTab === 'aktivni' && (
                <TouchableOpacity
                  style={s.addBtnEmpty}
                  onPress={() => router.push('/moje-prodejna/pridat-produkt')}>
                  <Text style={s.addBtnEmptyText}>+ Přidat první produkt</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.grid}>
              {displayed.map((p) => (
                <View
                  key={p.id}
                  style={[s.card, activeTab === 'archivovane' && s.cardArchived]}>
                  <View style={s.cardTop}>
                    <Text style={s.cardEmoji}>{p.emoji || '📦'}</Text>
                    <View style={[
                      s.availBadge,
                      activeTab === 'archivovane' ? s.badgeArchive
                        : p.dostupnost ? s.badgeAvail : s.badgeUnavail,
                    ]}>
                      <Text style={s.availText}>
                        {activeTab === 'archivovane' ? '📦' : p.dostupnost ? '✓' : '✗'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.cardName} numberOfLines={2}>{p.nazev}</Text>
                  <Text style={s.cardPrice}>{formatCenaJednotka(p.cena, p.jednotka)}</Text>
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={s.editCardBtn}
                      onPress={() =>
                        router.push(`/moje-prodejna/upravit-produkt?id=${p.id}` as any)
                      }>
                      <Text style={s.editCardBtnText}>✏️ Upravit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export default function SeznamProduktScreen() {
  return <ProtectedRoute><SeznamProduktContent /></ProtectedRoute>;
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
  brand: {
    fontSize: 16, fontWeight: '800', color: '#ffffff',
    paddingHorizontal: 16, marginBottom: 24,
  },
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
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  logoutBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  // Main
  main: { flex: 1 },
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: '#ffffff', paddingHorizontal: 32,
    paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 4 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  addBtn: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  addBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    paddingHorizontal: 32, gap: 4,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4caf50' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#4caf50' },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 48 },

  // Loading/Empty
  loadingBox: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280' },
  emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyIcon: { fontSize: 64 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  addBtnEmpty: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  addBtnEmptyText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  // Product grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 20, width: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardArchived: { opacity: 0.55 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  cardEmoji: { fontSize: 40 },
  availBadge: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeAvail: { backgroundColor: 'rgba(76,175,80,0.12)' },
  badgeUnavail: { backgroundColor: 'rgba(244,67,54,0.10)' },
  badgeArchive: { backgroundColor: '#f3f4f6' },
  availText: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
  cardName: {
    fontSize: 15, fontWeight: '700', color: '#1a1a1a',
    marginBottom: 6, lineHeight: 20,
  },
  cardPrice: { fontSize: 14, fontWeight: '600', color: '#4caf50', marginBottom: 16 },
  cardActions: {},
  editCardBtn: {
    backgroundColor: '#f9fafb', borderRadius: 8, padding: 9, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  editCardBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
});
