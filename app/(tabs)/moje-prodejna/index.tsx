import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { ProtectedRoute } from '../../utils/ProtectedRoute';
import { DrawerMenu } from '../../utils/DrawerMenu';
import { useDrawerMenu } from '../../utils/useDrawerMenu';
import { Feather } from '@expo/vector-icons';

interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
}

function MojeProdejnaScreenContent() {
  const { farmar, logout } = useFarmarAuth();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);
  const [pocetProduktu, setPocetProduktu] = useState(0);
  const [activeTab, setActiveTab] = useState<'cekajici' | 'ostatni'>('cekajici');

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

      // Načíst objednávky
      const { data: objednavkyData, error: objednavkyError } = await supabase
        .from('objednavky')
        .select('*')
        .eq('pestitel_id', pestitelId)
        .order('created_at', { ascending: false });

      if (objednavkyError) {
        console.error('Chyba při načítání objednávek:', objednavkyError);
      } else {
        setObjednavky(objednavkyData || []);
      }

      // Načíst počet produktů
      const { count, error: produktyError } = await supabase
        .from('produkty')
        .select('*', { count: 'exact', head: true })
        .eq('pestitel_id', pestitelId)
        .eq('archivovano', false);

      if (produktyError) {
        console.error('Chyba při načítání produktů:', produktyError);
      } else {
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

  const handleOdhlasit = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Opravdu se chcete odhlásit?');
      if (confirmed) {
        await logout();
        router.replace('/prihlaseni');
      }
    } else {
      Alert.alert(
        'Odhlásit se?',
        'Opravdu se chcete odhlásit?',
        [
          { text: 'Zrušit', style: 'cancel' },
          {
            text: 'Odhlásit',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/prihlaseni');
            }
          }
        ]
      );
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

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return '#FF9800';
      case 'potvrzena':
        return '#2196F3';
      case 'odmitnuta':
        return '#F44336';
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#9C27B0';
      case 'dokoncena':
        return '#4CAF50';
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

  // Rozdělit objednávky
  const cekajiciObjednavky = objednavky.filter(o => o.stav === 'cekajici_na_potvrzeni');
  const ostatniObjednavky = objednavky.filter(o => o.stav !== 'cekajici_na_potvrzeni');
  const displayedObjednavky = activeTab === 'cekajici' ? cekajiciObjednavky : ostatniObjednavky;

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
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moje prodejna</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/muj-profil')}
          >
            <Feather name="user" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tlačítko Moje produkty */}
      <TouchableOpacity
        style={styles.produktyButton}
        onPress={() => router.push('/moje-prodejna/seznam-produktu')}
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

      {/* Tabs pro objednávky */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cekajici' && styles.activeTab]}
          onPress={() => setActiveTab('cekajici')}
        >
          <Text style={[styles.tabText, activeTab === 'cekajici' && styles.activeTabText]}>
            🔔 Čekající ({cekajiciObjednavky.length})
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
                router.push(`/moje-prodejna/detail-objednavky?id=${objednavka.id}`)
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

        {/* Spodní sekce s nastavením */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/moje-prodejna/upravit-farmu')}
          >
            <Feather name="edit-2" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.settingsRowText}>Upravit údaje prodejny</Text>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsRow, styles.logoutRow]}
            onPress={handleOdhlasit}
          >
            <Feather name="log-out" size={20} color="#F44336" />
            <Text style={[styles.settingsRowText, styles.logoutText]}>Odhlásit se</Text>
          </TouchableOpacity>
        </View>
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
  menuIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '400'
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

  // Tabs
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

  // Content
  content: {
    flex: 1,
    padding: 12,
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
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    gap: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
    color: 'rgba(255,255,255,0.6)',
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
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Bottom section
  bottomSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  settingsRowText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  logoutRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  logoutText: {
    color: '#F44336',
  },
});
