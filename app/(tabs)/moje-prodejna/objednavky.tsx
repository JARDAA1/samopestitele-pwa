import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
}

export default function ObjednavkyScreen() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [activeTab, setActiveTab] = useState<'cekajici' | 'ostatni'>('cekajici');

  useFocusEffect(
    useCallback(() => {
      if (farmar?.id) {
        loadObjednavky(farmar.id);
      } else {
        setLoading(false);
      }
    }, [farmar])
  );

  const loadObjednavky = async (pestitelId: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('objednavky')
        .select('*')
        .eq('pestitel_id', pestitelId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Chyba při načítání objednávek:', error);
        return;
      }

      setObjednavky(data || []);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (farmar?.id) {
      loadObjednavky(farmar.id, true);
    }
  }, [farmar]);

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
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

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return '#FF9800'; // Oranžová - vyžaduje akci
      case 'potvrzena':
        return '#2196F3'; // Modrá
      case 'odmitnuta':
        return '#F44336'; // Červená
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#9C27B0'; // Fialová
      case 'dokoncena':
        return '#4CAF50'; // Zelená
      case 'zrusena':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return 'Čeká na potvrzení';
      case 'potvrzena':
        return 'Potvrzená';
      case 'odmitnuta':
        return 'Odmítnutá';
      case 'nova':
        return 'Nová';
      case 'zpracovana':
        return 'Zpracovaná';
      case 'dokoncena':
        return 'Dokončená';
      case 'zrusena':
        return 'Zrušená';
      default:
        return stav;
    }
  };

  // Rozdělit objednávky na čekající a ostatní
  const cekajiciObjednavky = objednavky.filter(o => o.stav === 'cekajici_na_potvrzeni');
  const ostatniObjednavky = objednavky.filter(o => o.stav !== 'cekajici_na_potvrzeni');

  const displayedObjednavky = activeTab === 'cekajici' ? cekajiciObjednavky : ostatniObjednavky;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Objednávky ({objednavky.length})</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cekajici' && styles.activeTab]}
          onPress={() => setActiveTab('cekajici')}
        >
          <Text style={[styles.tabText, activeTab === 'cekajici' && styles.activeTabText]}>
            🟡 Čekající ({cekajiciObjednavky.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ostatni' && styles.activeTab]}
          onPress={() => setActiveTab('ostatni')}
        >
          <Text style={[styles.tabText, activeTab === 'ostatni' && styles.activeTabText]}>
            Ostatní ({ostatniObjednavky.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám objednávky...</Text>
        </View>
      ) : (
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
          {displayedObjednavky.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{activeTab === 'cekajici' ? '✅' : '📋'}</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'cekajici'
                  ? 'Žádné objednávky nečekají na potvrzení'
                  : 'Zatím nemáte žádné zpracované objednávky'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'cekajici'
                  ? 'Jakmile vám někdo pošle žádost, zobrazí se zde'
                  : 'Potvrzené objednávky se zobrazí zde'}
              </Text>
            </View>
          ) : (
            displayedObjednavky.map((objednavka) => (
              <TouchableOpacity
                key={objednavka.id}
                style={[
                  styles.orderCard,
                  objednavka.stav === 'cekajici_na_potvrzeni' && styles.orderCardUrgent
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/moje-prodejna/detail-objednavky',
                    params: { id: objednavka.id }
                  })
                }
              >
                <View style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerCode}>
                        {objednavka.anon_customer_code
                          ? `Zákazník ${objednavka.anon_customer_code}`
                          : 'Zákazník'}
                      </Text>
                      {objednavka.stav === 'cekajici_na_potvrzeni' && (
                        <Text style={styles.urgentBadge}>NOVÁ</Text>
                      )}
                    </View>
                    <Text style={styles.orderDate}>
                      Přijato: {formatCreatedAt(objednavka.created_at)}
                    </Text>
                    {objednavka.datum_vyzvednuti && (
                      <Text style={styles.orderPickup}>
                        Vyzvednutí: {formatDatum(objednavka.datum_vyzvednuti)}
                      </Text>
                    )}
                    {objednavka.celkova_cena && objednavka.celkova_cena > 0 && (
                      <Text style={styles.orderPrice}>
                        {objednavka.celkova_cena.toFixed(0)} Kč
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStavBarva(objednavka.stav) + '30' }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStavBarva(objednavka.stav) }
                      ]}
                    >
                      {getStavText(objednavka.stav)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: {
    marginBottom: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  activeTabText: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1,
    padding: 12
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center'
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  orderCardUrgent: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
    gap: 4
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  urgentBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)'
  },
  orderPickup: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  orderPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  }
});
