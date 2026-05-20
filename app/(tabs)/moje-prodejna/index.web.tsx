import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchAktivniObjednavky, zmeniStavPolozky as zmeniStavPolozkyService, zmeniStavObjednavky } from '@/features/objednavky/services/objednavkyService';
import { fetchPocetAktivnichProduktu } from '@/features/produkty/services/produktyService';
import {
  fetchPocetProdejnichMist,
  fetchCasovaDostupnostMist,
} from '@/features/prodejni-mista/services/locationService';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import { useRealtimeOrders } from '../../_utils/useRealtimeOrders';
import { formatKc, formatMnozstvi } from '../../_utils/formatKc';

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

function MojeProdejnaScreenContent() {
  const { farmar, logout } = useFarmarAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [pocetProduktu, setPocetProduktu] = useState(0);
  const [pocetProdejnichMist, setPocetProdejnichMist] = useState(0);
  const [casovaDostupnost, setCasovaDostupnost] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleNewOrder = useCallback((newOrder: any) => {
    setObjednavky(prev => [{
      ...newOrder,
      polozky: []
    }, ...prev]);
  }, []);

  useRealtimeOrders(farmar?.id, handleNewOrder);

  useFocusEffect(
    useCallback(() => {
      if (farmar?.id) {
        loadData(farmar.id);
      } else {
        setLoading(false);
      }
    }, [farmar])
  );

  const loadData = async (pestitelId: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const objednavkyWithPolozky = await fetchAktivniObjednavky(pestitelId);
      setObjednavky(objednavkyWithPolozky as Objednavka[]);

      const pocetProd = await fetchPocetAktivnichProduktu(pestitelId);
      setPocetProduktu(pocetProd);

      const pocetMist = await fetchPocetProdejnichMist(Number(pestitelId));
      setPocetProdejnichMist(pocetMist);

      const cas = await fetchCasovaDostupnostMist(Number(pestitelId));
      setCasovaDostupnost(cas);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (farmar?.id) {
      loadData(farmar.id, true);
    }
  }, [farmar]);

  const zmeniStavPolozky = async (polozkaId: string, novyStav: string, objednavkaId: string) => {
    try {
      await zmeniStavPolozkyService(polozkaId, novyStav);

      setObjednavky(prev => prev.map(obj => {
        if (obj.id === objednavkaId) {
          return {
            ...obj,
            polozky: obj.polozky.map(pol =>
              pol.id === polozkaId ? { ...pol, stav_polozky: novyStav } : pol
            )
          };
        }
        return obj;
      }));

      const objednavka = objednavky.find(o => o.id === objednavkaId);
      if (objednavka) {
        const updatedPolozky = objednavka.polozky.map(pol =>
          pol.id === polozkaId ? { ...pol, stav_polozky: novyStav } : pol
        );

        const vsechnyVyrizene = updatedPolozky.every(
          pol => pol.stav_polozky && pol.stav_polozky !== 'novy'
        );

        if (vsechnyVyrizene) {
          await zmeniStavObjednavky(objednavkaId, 'zpracovana');
          setObjednavky(prev => prev.map(obj =>
            obj.id === objednavkaId ? { ...obj, stav: 'zpracovana' } : obj
          ));
        } else if (objednavka.stav === 'nova' || objednavka.stav === 'cekajici_na_potvrzeni') {
          await zmeniStavObjednavky(objednavkaId, 'potvrzena');
          setObjednavky(prev => prev.map(obj =>
            obj.id === objednavkaId ? { ...obj, stav: 'potvrzena' } : obj
          ));
        }
      }
    } catch (error) {
      console.error('Chyba:', error);
    }
  };

  const formatCreatedAt = (datum: string) => {
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderBadge = (objednavka: Objednavka) => {
    if (objednavka.stav === 'ceka_na_vyzvednuti') {
      return { text: 'ČEKÁ', color: '#FF9800' };
    } else if (objednavka.stav === 'zpracovana' || objednavka.stav === 'dokoncena') {
      return { text: 'HOTOVO', color: '#4caf50' };
    } else if (objednavka.stav === 'potvrzena') {
      return { text: 'POTVRZENA', color: '#2196F3' };
    } else {
      return { text: 'NOVÁ', color: '#F44336' };
    }
  };

  const getPolozkaStavColor = (stav?: string) => {
    switch (stav) {
      case 'pripraveno': return '#4caf50';
      case 'neni_k_dispozici': return '#9E9E9E';
      case 'zruseno': return '#F44336';
      default: return 'transparent';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  const newOrdersCount = objednavky.filter(
    o => o.stav === 'nova' || o.stav === 'cekajici_na_potvrzeni'
  ).length;

  const selectedOrder = selectedOrderId
    ? objednavky.find(o => o.id === selectedOrderId)
    : null;

  const navItems = [
    { icon: '📋', label: 'Objednávky', active: true, onPress: () => {} },
    { icon: '📦', label: 'Produkty', active: false, onPress: () => router.push('/moje-prodejna/seznam-produktu') },
    { icon: '📍', label: 'Prodejní místa', active: false, onPress: () => router.push('/moje-prodejna/prodejni-mista') },
    { icon: '⚡', label: 'Operativa', active: false, onPress: () => router.push('/moje-prodejna/operativa') },
    { icon: '📚', label: 'Dokončené', active: false, onPress: () => router.push('/moje-prodejna/dokoncene-objednavky') },
    { icon: '👤', label: 'Profil', active: false, onPress: () => router.push('/profil') },
  ];

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarTop}>
        <Text style={styles.sidebarBrand}>🌿 Samopestitele</Text>
        <View style={styles.sidebarNav}>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.navItem, item.active && styles.navItemActive]}
              onPress={item.onPress}
            >
              <Text style={styles.navItemIcon}>{item.icon}</Text>
              <Text style={[styles.navItemLabel, item.active && styles.navItemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sidebarBottom}>
        {farmar && (
          <View style={styles.sidebarFarmInfo}>
            <Text style={styles.sidebarFarmName} numberOfLines={1}>
              {farmar.nazev_farmy || farmar.jmeno || 'Moje farma'}
            </Text>
            <Text style={styles.sidebarFarmStats}>
              {pocetProduktu} produktů • {pocetProdejnichMist} míst
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => logout && logout()}
        >
          <Text style={styles.logoutButtonText}>Odhlásit se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMiddlePanel = () => (
    <View style={styles.middlePanel}>
      {/* Panel header */}
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Objednávky ({objednavky.length})</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>{refreshing ? '...' : '↺'}</Text>
        </TouchableOpacity>
      </View>

      {/* New orders alert */}
      {newOrdersCount > 0 && (
        <View style={styles.newOrdersAlert}>
          <Text style={styles.newOrdersAlertText}>
            🔔 {newOrdersCount} {newOrdersCount === 1 ? 'nová objednávka' : newOrdersCount < 5 ? 'nové objednávky' : 'nových objednávek'}
          </Text>
        </View>
      )}

      {/* Orders list */}
      <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
        {objednavky.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Žádné aktivní objednávky</Text>
            <Text style={styles.emptySubtext}>
              Jakmile vám někdo pošle objednávku, zobrazí se zde
            </Text>
          </View>
        ) : (
          objednavky.map((objednavka) => {
            const badge = getOrderBadge(objednavka);
            const isSelected = selectedOrderId === objednavka.id;

            return (
              <TouchableOpacity
                key={objednavka.id}
                style={[
                  styles.orderCard,
                  isSelected && styles.orderCardSelected,
                ]}
                onPress={() => setSelectedOrderId(objednavka.id)}
              >
                <View style={styles.orderCardInner}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.customerCode} numberOfLines={1}>
                      {objednavka.poznamka_farmare ||
                        (objednavka.anon_customer_code
                          ? `Zákazník ${objednavka.anon_customer_code}`
                          : 'Zákazník')}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: badge.color }]}>
                      <Text style={styles.badgeText}>{badge.text}</Text>
                    </View>
                  </View>

                  {objednavka.zakaznik_telefon && (
                    <Text style={styles.orderPhone}>
                      📱 {objednavka.zakaznik_telefon}
                    </Text>
                  )}

                  <Text style={styles.orderMeta}>
                    {formatCreatedAt(objednavka.created_at)} • {objednavka.polozky.length} položek
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.archiveLink}
          onPress={() => router.push('/moje-prodejna/dokoncene-objednavky')}
        >
          <Text style={styles.archiveLinkText}>📚 Zobrazit dokončené objednávky</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderRightPanel = () => {
    if (!selectedOrder) {
      return (
        <View style={styles.rightPanelEmpty}>
          <Text style={styles.detailEmptyIcon}>📋</Text>
          <Text style={styles.detailEmptyText}>Vyberte objednávku ze seznamu</Text>
          <Text style={styles.detailEmptySubtext}>
            Klikněte na objednávku vlevo pro zobrazení detailu
          </Text>
        </View>
      );
    }

    const badge = getOrderBadge(selectedOrder);

    return (
      <ScrollView style={styles.rightPanel} showsVerticalScrollIndicator={false}>
        {/* Detail header */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderTopRow}>
            <Text style={styles.detailTitle}>
              {selectedOrder.poznamka_farmare ||
                (selectedOrder.anon_customer_code
                  ? `Zákazník ${selectedOrder.anon_customer_code}`
                  : 'Zákazník')}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          </View>

          {selectedOrder.zakaznik_telefon && (
            <Text style={styles.detailPhone}>📱 {selectedOrder.zakaznik_telefon}</Text>
          )}
          <Text style={styles.detailDate}>
            Vytvořeno: {formatCreatedAt(selectedOrder.created_at)}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>
            Položky ({selectedOrder.polozky.length})
          </Text>

          {selectedOrder.polozky.map((polozka) => (
            <View
              key={polozka.id}
              style={[
                styles.polozkaRow,
                polozka.stav_polozky && polozka.stav_polozky !== 'novy'
                  ? { borderLeftWidth: 3, borderLeftColor: getPolozkaStavColor(polozka.stav_polozky) }
                  : {}
              ]}
            >
              <View style={styles.polozkaInfo}>
                <Text style={styles.polozkaNazev}>{polozka.nazev_produktu}</Text>
                <Text style={styles.polozkaMnozstvi}>
                  {formatMnozstvi(polozka.mnozstvi)} {polozka.jednotka}
                  {polozka.cena ? ` • ${formatKc(polozka.cena * polozka.mnozstvi)} Kč` : ''}
                </Text>
              </View>

              <View style={styles.polozkaActions}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnGreen,
                    polozka.stav_polozky === 'pripraveno' && styles.actionBtnActiveGreen,
                  ]}
                  onPress={() => zmeniStavPolozky(polozka.id, 'pripraveno', selectedOrder.id)}
                >
                  <Text style={styles.actionBtnText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnGray,
                    polozka.stav_polozky === 'neni_k_dispozici' && styles.actionBtnActiveGray,
                  ]}
                  onPress={() => zmeniStavPolozky(polozka.id, 'neni_k_dispozici', selectedOrder.id)}
                >
                  <Text style={styles.actionBtnTextGray}>✗</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Full detail button */}
        <TouchableOpacity
          style={styles.detailFullButton}
          onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${selectedOrder.id}`)}
        >
          <Text style={styles.detailFullButtonText}>Otevřít plný detail</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>🌿 Moje prodejna</Text>
        <TouchableOpacity style={styles.profileHeaderButton} onPress={() => router.push('/profil')}>
          <Text style={styles.profileHeaderButtonText}>👤 Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Three-panel layout */}
      <View style={styles.mainLayout}>
        {renderSidebar()}
        {renderMiddlePanel()}
        {selectedOrder ? renderRightPanel() : (
          <View style={styles.rightPanelEmpty}>
            <Text style={styles.detailEmptyIcon}>📋</Text>
            <Text style={styles.detailEmptyText}>Vyberte objednávku ze seznamu</Text>
            <Text style={styles.detailEmptySubtext}>
              Klikněte na objednávku vlevo pro zobrazení detailu
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function MojeProdejnaScreen() {
  return (
    <ProtectedRoute>
      <MojeProdejnaScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },

  // Top header
  topHeader: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  profileHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  profileHeaderButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },

  // Three-panel layout
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },

  // Left sidebar
  sidebar: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  sidebarTop: {
    flex: 1,
  },
  sidebarBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarNav: {
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#4caf50',
  },
  navItemIcon: {
    fontSize: 18,
  },
  navItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  navItemLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  sidebarBottom: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    gap: 12,
  },
  sidebarFarmInfo: {
    gap: 4,
  },
  sidebarFarmName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sidebarFarmStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Middle panel
  middlePanel: {
    width: 380,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    flexDirection: 'column',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  refreshButtonText: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: '600',
  },
  newOrdersAlert: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  newOrdersAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Order cards
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  orderCardSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  orderCardInner: {
    padding: 14,
    gap: 4,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  customerCode: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  orderPhone: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  orderMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },

  archiveLink: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  archiveLinkText: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // Right panel
  rightPanelEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  detailEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.4,
  },
  detailEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailEmptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },

  // Detail header
  detailHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
    gap: 6,
  },
  detailHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  detailTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  detailPhone: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  detailDate: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Detail section
  detailSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  // Polozky
  polozkaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  polozkaInfo: {
    flex: 1,
    gap: 2,
  },
  polozkaNazev: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  polozkaMnozstvi: {
    fontSize: 12,
    color: '#6b7280',
  },
  polozkaActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  actionBtnGray: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnActiveGreen: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  actionBtnActiveGray: {
    backgroundColor: '#6b7280',
    borderColor: '#6b7280',
  },
  actionBtnText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '700',
  },
  actionBtnTextGray: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '700',
  },

  // Full detail button
  detailFullButton: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  detailFullButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
