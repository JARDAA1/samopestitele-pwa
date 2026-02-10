import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';
import { Feather } from '@expo/vector-icons';

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [pocetProduktu, setPocetProduktu] = useState(0);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

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
      const { data: objednavkyData, error: objednavkyError } = await supabase
        .from('objednavky')
        .select(`
          id, stav, created_at, datum_vyzvednuti, anon_customer_code,
          celkova_cena, zakaznik_telefon, poznamka_farmare
        `)
        .eq('pestitel_id', pestitelId)
        .in('stav', ['nova', 'cekajici_na_potvrzeni', 'potvrzena', 'zpracovana'])
        .order('created_at', { ascending: false });

      if (objednavkyError) {
        console.error('Chyba při načítání objednávek:', objednavkyError);
      } else if (objednavkyData) {
        // Pro každou objednávku načíst položky
        const objednavkyWithPolozky = await Promise.all(
          objednavkyData.map(async (obj) => {
            const { data: polozkyData } = await supabase
              .from('objednavky_polozky')
              .select('id, nazev_produktu, mnozstvi, jednotka, cena, stav_polozky')
              .eq('objednavka_id', obj.id);

            return {
              ...obj,
              polozky: polozkyData || []
            };
          })
        );

        setObjednavky(objednavkyWithPolozky);

        // Automaticky rozbalit nové objednávky
        const newExpanded = new Set<string>();
        objednavkyWithPolozky.forEach(obj => {
          if (obj.stav === 'nova' || obj.stav === 'cekajici_na_potvrzeni') {
            newExpanded.add(obj.id);
          }
        });
        setExpandedOrders(prev => new Set([...prev, ...newExpanded]));
      }

      // Načíst počet produktů
      const { count, error: produktyError } = await supabase
        .from('produkty')
        .select('*', { count: 'exact', head: true })
        .eq('pestitel_id', pestitelId)
        .eq('archivovano', false);

      if (!produktyError) {
        setPocetProduktu(count || 0);
      }
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

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const zmeniStavPolozky = async (polozkaId: string, novyStav: string, objednavkaId: string) => {
    try {
      const { error } = await supabase
        .from('objednavky_polozky')
        .update({ stav_polozky: novyStav })
        .eq('id', polozkaId);

      if (error) {
        console.error('Chyba při změně stavu položky:', error);
        return;
      }

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
          await supabase
            .from('objednavky')
            .update({ stav: 'zpracovana' })
            .eq('id', objednavkaId);

          setObjednavky(prev => prev.map(obj =>
            obj.id === objednavkaId ? { ...obj, stav: 'zpracovana' } : obj
          ));
        } else if (objednavka.stav === 'nova' || objednavka.stav === 'cekajici_na_potvrzeni') {
          // Alespoň jedna položka má stav -> objednávka je potvrzená (rozpracovaná)
          await supabase
            .from('objednavky')
            .update({ stav: 'potvrzena' })
            .eq('id', objednavkaId);

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
    // Zkontrolovat, jestli má alespoň jedna položka stav
    const maNejakyStav = objednavka.polozky.some(
      pol => pol.stav_polozky && pol.stav_polozky !== 'novy'
    );

    if (objednavka.stav === 'zpracovana') {
      return { text: 'HOTOVO', color: '#4CAF50' };
    } else if (maNejakyStav || objednavka.stav === 'potvrzena') {
      return { text: 'ROZPRACOVÁNO', color: '#FF9800' };
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
            <Feather name="user" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Nadpis objednávek */}
      <View style={styles.sectionHeader} testID="orders-section">
        <Text style={styles.sectionTitle}>📋 Objednávky ({objednavky.length})</Text>
      </View>

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
            const isExpanded = expandedOrders.has(objednavka.id);

            return (
              <View key={objednavka.id} style={styles.orderCard} testID="order-card">
                {/* Hlavička objednávky */}
                <TouchableOpacity
                  style={styles.orderHeader}
                  onPress={() => toggleExpanded(objednavka.id)}
                >
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

                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {/* Rozbalené položky */}
                {isExpanded && (
                  <View style={styles.polozkyContainer} testID="order-items">
                    {objednavka.polozky.map((polozka) => (
                      <View
                        key={polozka.id}
                        style={[
                          styles.polozkaRow,
                          polozka.stav_polozky && polozka.stav_polozky !== 'novy' && {
                            borderLeftWidth: 3,
                            borderLeftColor: getPolozkaStavColor(polozka.stav_polozky)
                          }
                        ]}
                      >
                        <View style={styles.polozkaInfo}>
                          <Text style={styles.polozkaNazev}>{polozka.nazev_produktu}</Text>
                          <Text style={styles.polozkaMnozstvi}>
                            {polozka.mnozstvi} {polozka.jednotka}
                            {polozka.cena ? ` • ${(polozka.cena * polozka.mnozstvi).toFixed(0)} Kč` : ''}
                          </Text>
                        </View>

                        <View style={styles.polozkaActions}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              styles.actionBtnGreen,
                              polozka.stav_polozky === 'pripraveno' && styles.actionBtnActive
                            ]}
                            onPress={() => zmeniStavPolozky(polozka.id, 'pripraveno', objednavka.id)}
                            testID="item-prepare-btn"
                            {...(polozka.stav_polozky === 'pripraveno' && { 'data-active': 'true' })}
                          >
                            <Text style={styles.actionBtnText}>✓</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              styles.actionBtnGray,
                              polozka.stav_polozky === 'neni_k_dispozici' && styles.actionBtnActive
                            ]}
                            onPress={() => zmeniStavPolozky(polozka.id, 'neni_k_dispozici', objednavka.id)}
                            testID="item-unavailable-btn"
                            {...(polozka.stav_polozky === 'neni_k_dispozici' && { 'data-active': 'true' })}
                          >
                            <Text style={styles.actionBtnText}>✗</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {/* Tlačítko pro detail */}
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${objednavka.id}`)}
                      testID="order-detail-btn"
                    >
                      <Text style={styles.detailButtonText}>📝 Detail objednávky</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
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
      </ScrollView>
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
    backgroundColor: '#6A1B9A'
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
    backgroundColor: '#6A1B9A',
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
    padding: 4,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Tlačítko Produkty
  produktyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9800',
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
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
});
