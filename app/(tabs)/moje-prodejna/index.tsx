import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
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
import { Feather } from '@expo/vector-icons';
import { useLayoutMode } from '../../_components/AppLayout';
import { useRealtimeOrders } from '../../_utils/useRealtimeOrders';
import { formatKc, formatMnozstvi } from '../../_utils/formatKc';

interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
  stav_polozky?: string; // 'novy' | 'pripraveno' | 'neni_k_dispozici' | 'zruseno'
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
  const { farmar } = useFarmarAuth();
  const { mode } = useLayoutMode();
  const isDesktop = mode === 'desktop';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [pocetProduktu, setPocetProduktu] = useState(0);
  const [pocetProdejnichMist, setPocetProdejnichMist] = useState(0);
  const [casovaDostupnost, setCasovaDostupnost] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Handler pro novou realtime objednávku
  const handleNewOrder = useCallback((newOrder: any) => {
    // Přidat novou objednávku na začátek seznamu
    setObjednavky(prev => [{
      ...newOrder,
      polozky: [] // Položky se načtou při otevření detailu
    }, ...prev]);
  }, []);

  // Realtime subscription pro nové objednávky
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

      // Načíst objednávky s položkami
      const objednavkyWithPolozky = await fetchAktivniObjednavky(pestitelId);
      setObjednavky(objednavkyWithPolozky as Objednavka[]);

      // Načíst počet produktů
      const pocetProd = await fetchPocetAktivnichProduktu(pestitelId);
      setPocetProduktu(pocetProd);

      // Načíst počet prodejních míst
      const pocetMist = await fetchPocetProdejnichMist(Number(pestitelId));
      setPocetProdejnichMist(pocetMist);

      // Načíst časovou dostupnost z prvního aktivního prodejního místa
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

      // Aktualizovat lokální stav
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

      // Zkontrolovat, jestli jsou všechny položky vyřízené -> změnit stav objednávky
      const objednavka = objednavky.find(o => o.id === objednavkaId);
      if (objednavka) {
        const updatedPolozky = objednavka.polozky.map(pol =>
          pol.id === polozkaId ? { ...pol, stav_polozky: novyStav } : pol
        );

        const vsechnyVyrizene = updatedPolozky.every(
          pol => pol.stav_polozky && pol.stav_polozky !== 'novy'
        );

        if (vsechnyVyrizene) {
          // Všechny položky mají stav -> objednávka je zpracovaná
          await zmeniStavObjednavky(objednavkaId, 'zpracovana');

          setObjednavky(prev => prev.map(obj =>
            obj.id === objednavkaId ? { ...obj, stav: 'zpracovana' } : obj
          ));
        } else if (objednavka.stav === 'nova' || objednavka.stav === 'cekajici_na_potvrzeni') {
          // Alespoň jedna položka má stav -> objednávka je potvrzená (rozpracovaná)
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
      return { text: 'ČEKÁ NA VYZVEDNUTÍ', color: '#FF9800' };
    } else if (objednavka.stav === 'zpracovana' || objednavka.stav === 'dokoncena') {
      return { text: 'HOTOVO', color: '#4CAF50' };
    } else if (objednavka.stav === 'potvrzena') {
      return { text: 'POTVRZENA', color: '#2196F3' };
    } else {
      return { text: 'NOVÁ', color: '#F44336' };
    }
  };

  const getPolozkaStavColor = (stav?: string) => {
    switch (stav) {
      case 'pripraveno': return '#4CAF50';
      case 'neni_k_dispozici': return '#9E9E9E';
      case 'zruseno': return '#F44336';
      default: return 'transparent';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  // Mobile detection a počet nových objednávek
  const isMobile = !isDesktop;
  const newOrdersCount = objednavky.filter(
    o => o.stav === 'nova' || o.stav === 'cekajici_na_potvrzeni'
  ).length;

  // Vybraná objednávka pro detail panel (desktop)
  const selectedOrder = selectedOrderId
    ? objednavky.find(o => o.id === selectedOrderId)
    : null;

  // Minimální navigační položky pro mobil (místo velkých karet)
  const renderMobileNavItems = () => (
    <View style={styles.mobileNavItems}>
      <TouchableOpacity
        style={styles.mobileNavItem}
        onPress={() => router.push('/moje-prodejna/seznam-produktu')}
      >
        <Text style={styles.mobileNavItemText}>📦 Moje produkty</Text>
        <Text style={styles.mobileNavItemCount}>{pocetProduktu} aktivních →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mobileNavItem}
        onPress={() => router.push('/moje-prodejna/prodejni-mista')}
      >
        <Text style={styles.mobileNavItemText}>📍 Prodejní místa</Text>
        <Text style={styles.mobileNavItemCount}>{pocetProdejnichMist} míst →</Text>
      </TouchableOpacity>
    </View>
  );

  // Render navigačních tlačítek (Produkty, Místa) - desktop verze
  const renderNavButtons = () => (
    <View style={styles.navButtonsContainer}>
      {/* Tlačítko Moje produkty */}
      <TouchableOpacity
        style={styles.produktyButton}
        onPress={() => router.push('/moje-prodejna/seznam-produktu')}
        testID="nav-produkty"
      >
        <View style={styles.produktyButtonContent}>
          <Text style={styles.produktyIcon}>📦</Text>
          <View style={styles.produktyTextContainer}>
            <Text style={styles.produktyButtonText}>Moje produkty</Text>
            <Text style={styles.produktyCount}>{pocetProduktu} aktivních</Text>
          </View>
        </View>
        <Text style={styles.produktyArrow}>→</Text>
      </TouchableOpacity>

      {/* Tlačítko Prodejní místa */}
      <TouchableOpacity
        style={styles.mistaButton}
        onPress={() => router.push('/moje-prodejna/prodejni-mista')}
        testID="nav-mista"
      >
        <View style={styles.produktyButtonContent}>
          <Text style={styles.produktyIcon}>📍</Text>
          <View style={styles.produktyTextContainer}>
            <Text style={styles.mistaButtonText}>Prodejní místa</Text>
            <Text style={styles.produktyCount}>{pocetProdejnichMist} míst</Text>
            <Text style={styles.dostupnostText}>
              {casovaDostupnost
                ? `Otevřeno: ${casovaDostupnost.split('\n')[0]}`
                : 'Časová dostupnost není nastavena'}
            </Text>
          </View>
        </View>
        <Text style={styles.produktyArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );

  // Render priority boxu pro nové objednávky (pouze mobile)
  const renderPriorityBox = () => {
    if (!isMobile || newOrdersCount === 0) return null;

    return (
      <View style={styles.priorityBox}>
        <Text style={styles.priorityTitle}>
          🔔 Máte {newOrdersCount} {newOrdersCount === 1 ? 'novou objednávku' : newOrdersCount < 5 ? 'nové objednávky' : 'nových objednávek'}
        </Text>
        <Text style={styles.prioritySubtext}>Vyžadují vaši pozornost</Text>
      </View>
    );
  };

  // Render nadpisu objednávek
  const renderOrdersHeader = () => (
    <View style={styles.sectionHeader} testID="orders-section">
      <Text style={styles.sectionTitle}>📋 Objednávky ({objednavky.length})</Text>
    </View>
  );

  // Render seznamu objednávek (levý sloupec)
  const renderOrdersList = () => (
    <>
      {/* MOBILE: Priority box + Objednávky PRVNÍ, pak navigace */}
      {isMobile && (
        <>
          {renderPriorityBox()}
          {renderOrdersHeader()}
        </>
      )}

      {/* DESKTOP: Navigační tlačítka první */}
      {!isMobile && renderNavButtons()}

      {/* DESKTOP: Nadpis objednávek */}
      {!isMobile && renderOrdersHeader()}

      {/* Seznam objednávek */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#FF9800']}
          />
        }
      >
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
            const isSelected = isDesktop && selectedOrderId === objednavka.id;

            return (
              <TouchableOpacity
                key={objednavka.id}
                style={[
                  styles.orderCard,
                  isSelected && styles.orderCardSelected
                ]}
                testID="order-card"
                onPress={() => {
                  if (isDesktop) {
                    setSelectedOrderId(objednavka.id);
                  } else {
                    router.push(`/moje-prodejna/detail-objednavky?id=${objednavka.id}`);
                  }
                }}
              >
                {/* Hlavička objednávky */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerCode}>
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

                    <Text style={styles.orderDate}>
                      {formatCreatedAt(objednavka.created_at)} • {objednavka.polozky.length} položek
                    </Text>
                  </View>

                  {!isDesktop && (
                    <Text style={styles.expandIcon}>▶</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Odkaz na dokončené */}
        <TouchableOpacity
          style={styles.archiveLink}
          onPress={() => router.push('/moje-prodejna/dokoncene-objednavky')}
          testID="nav-dokoncene"
        >
          <Text style={styles.archiveLinkText}>📚 Zobrazit dokončené objednávky</Text>
        </TouchableOpacity>

        {/* MOBILE: Minimální navigační položky na konci */}
        {isMobile && (
          <View style={styles.mobileNavSection}>
            {renderMobileNavItems()}
          </View>
        )}
      </ScrollView>
    </>
  );

  // Render detail panelu (pravý sloupec na desktop)
  const renderDetailPanel = () => {
    if (!selectedOrder) {
      return (
        <View style={styles.detailEmptyContainer}>
          <Text style={styles.detailEmptyIcon}>📋</Text>
          <Text style={styles.detailEmptyText}>Vyberte objednávku</Text>
          <Text style={styles.detailEmptySubtext}>
            Klikněte na objednávku vlevo pro zobrazení detailu
          </Text>
        </View>
      );
    }

    const badge = getOrderBadge(selectedOrder);

    return (
      <ScrollView style={styles.detailPanel}>
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderTop}>
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

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Položky ({selectedOrder.polozky.length})</Text>
          {selectedOrder.polozky.map((polozka) => (
            <View
              key={polozka.id}
              style={[
                styles.detailPolozkaRow,
                polozka.stav_polozky && polozka.stav_polozky !== 'novy' && {
                  borderLeftWidth: 3,
                  borderLeftColor: getPolozkaStavColor(polozka.stav_polozky)
                }
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
                    polozka.stav_polozky === 'pripraveno' && styles.actionBtnActive
                  ]}
                  onPress={() => zmeniStavPolozky(polozka.id, 'pripraveno', selectedOrder.id)}
                >
                  <Text style={styles.actionBtnText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnGray,
                    polozka.stav_polozky === 'neni_k_dispozici' && styles.actionBtnActive
                  ]}
                  onPress={() => zmeniStavPolozky(polozka.id, 'neni_k_dispozici', selectedOrder.id)}
                >
                  <Text style={styles.actionBtnText}>✗</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.detailFullButton}
          onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${selectedOrder.id}`)}
        >
          <Text style={styles.detailFullButtonText}>📝 Otevřít plný detail</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/')}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} testID="page-title">Moje prodejna</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/muj-profil')}
            testID="nav-profil"
          >
            <Feather name="user" size={20} color="#FFFFFF" />
            <Text style={styles.profileLabel}>Profil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hlavní obsah - dvousloupcový na desktop */}
      {isDesktop ? (
        <View style={styles.desktopLayout}>
          <View style={styles.desktopLeftColumn}>
            {renderOrdersList()}
          </View>
          <View style={styles.desktopRightColumn}>
            {renderDetailPanel()}
          </View>
        </View>
      ) : (
        renderOrdersList()
      )}
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
    backgroundColor: '#33691e'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },

  // Header
  header: {
    backgroundColor: '#33691e',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  menuButton: {
    padding: 4,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 6
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },
  profileLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Priority box pro nové objednávky (mobile)
  priorityBox: {
    backgroundColor: '#F44336',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  prioritySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Mobile nav section (na konci scrollu)
  mobileNavSection: {
    marginTop: 8,
    marginBottom: 16,
  },

  // Mobilní minimální navigační položky
  mobileNavItems: {
    paddingHorizontal: 12,
    gap: 2,
  },
  mobileNavItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginBottom: 2,
  },
  mobileNavItemText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  mobileNavItemCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  // Navigační tlačítka
  navButtonsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  produktyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  mistaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mistaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  produktyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  produktyIcon: {
    fontSize: 24,
  },
  produktyTextContainer: {
    gap: 2,
  },
  produktyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  produktyCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  dostupnostText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  produktyArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  // Order cards
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  orderInfo: {
    flex: 1,
    gap: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  customerCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
  },
  orderPhone: {
    fontSize: 13,
    color: '#4FC3F7',
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  expandIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },

  // Položky
  polozkyContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  polozkaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  polozkaInfo: {
    flex: 1,
  },
  polozkaNazev: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  polozkaMnozstvi: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  polozkaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnGreen: {
    backgroundColor: 'rgba(76,175,80,0.3)',
  },
  actionBtnGray: {
    backgroundColor: 'rgba(158,158,158,0.3)',
  },
  actionBtnActive: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  actionBtnText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },

  detailButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Archive link
  archiveLink: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  archiveLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },

  // Desktop dvousloupcový layout
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopLeftColumn: {
    flex: 40,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  desktopRightColumn: {
    flex: 60,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  orderCardSelected: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },

  // Detail panel (pravý sloupec)
  detailEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  detailEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  detailEmptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  detailPanel: {
    flex: 1,
    padding: 16,
  },
  detailHeader: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailPhone: {
    fontSize: 14,
    color: '#4FC3F7',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  detailSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  detailPolozkaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  detailFullButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  detailFullButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Stánek banner
  stanekBannerBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  stanekBannerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  stanekBannerActive: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: 'rgba(46,125,50,0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  stanekBannerActiveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stanekBannerLink: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '700',
  },
});
